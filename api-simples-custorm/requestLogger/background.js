// 在Manifest V3中监听请求并记录日志

// 存储请求信息的对象以便重放
const requestsToReplay = new Map();

// 获取当前扩展的ID
const extensionId = chrome.runtime.id;
const extensionOrigin = `chrome-extension://${extensionId}`;

// 检查请求是否由扩展自身发起
function isExtensionRequest(details) {
  // 检查initiator是否为扩展源
  if (details.initiator && details.initiator.startsWith('chrome-extension://')) {
    return true;
  }
  
  // 如果initiator不可用，检查tabId
  // tabId为-1通常表示请求不是来自标签页，可能是扩展自身发起的
  if (details.tabId === -1) {
    return true;
  }
  
  return false;
}

// 处理和显示请求体内容的函数
function processRequestBody(requestBody) {
  if (!requestBody) return '无请求体数据';
  
  let result = {};
  
  // 处理表单数据
  if (requestBody.formData) {
    result.formData = {};
    // 复制表单数据以便显示
    for (const key in requestBody.formData) {
      result.formData[key] = requestBody.formData[key];
    }
  }
  
  // 处理原始数据
  if (requestBody.raw && requestBody.raw.length > 0) {
    result.rawData = [];
    
    // 遍历所有原始数据块
    for (const rawData of requestBody.raw) {
      if (rawData.bytes) {
        // 将ArrayBuffer转换为字符串以便查看
        const decoder = new TextDecoder('utf-8');
        try {
          const text = decoder.decode(rawData.bytes);
          // 尝试解析JSON
          try {
            const jsonData = JSON.parse(text);
            result.rawData.push({ type: 'json', content: jsonData });
          } catch (e) {
            // 不是JSON，作为普通文本处理
            result.rawData.push({ type: 'text', content: text });
          }
        } catch (e) {
          result.rawData.push({ type: 'binary', size: rawData.bytes.byteLength + ' bytes' });
        }
      }
    }
  }
  
  return result;
}

// 处理请求头或响应头的函数
function processHeaders(headers) {
  if (!headers || !headers.length) return null;
  
  const headersObj = {};
  for (const header of headers) {
    headersObj[header.name] = header.value;
  }
  return headersObj;
}

// 从原始请求体中提取可用于重放的数据
function extractRequestBodyForReplay(requestBody) {
  if (!requestBody) return null;
  
  // 如果有表单数据，直接使用
  if (requestBody.formData) {
    const formData = new FormData();
    for (const key in requestBody.formData) {
      const values = requestBody.formData[key];
      for (const value of values) {
        formData.append(key, value);
      }
    }
    return formData;
  }
  
  // 如果有原始数据，尝试提取
  if (requestBody.raw && requestBody.raw.length > 0) {
    for (const rawData of requestBody.raw) {
      if (rawData.bytes) {
        return rawData.bytes;
      }
    }
  }
  
  return null;
}

// 重放请求并获取响应体
async function replayRequest(requestId) {
  const requestInfo = requestsToReplay.get(requestId);
  if (!requestInfo) return;
  
  try {
    // 准备请求配置
    const fetchOptions = {
      method: requestInfo.method,
      headers: requestInfo.headers || {},
      credentials: 'include', // 包含cookie
      mode: 'cors',          // 尝试跨域请求
      cache: 'no-cache',     // 不使用缓存
      redirect: 'follow'     // 自动跟随重定向
    };
    
    // 添加请求体
    if (requestInfo.body) {
      fetchOptions.body = requestInfo.body;
    }
    
    // 发送重放请求
    console.log(`%c正在重放请求 (ID: ${requestId})`, 'color: blue; font-style: italic');
    const response = await fetch(requestInfo.url, fetchOptions);
    
    // 获取响应状态和头部
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    // 尝试获取响应体
    let responseBody;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // JSON响应
      responseBody = await response.json();
    } else if (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('application/javascript')) {
      // 文本响应
      responseBody = await response.text();
    } else {
      // 二进制响应
      const buffer = await response.arrayBuffer();
      responseBody = { type: 'binary', size: buffer.byteLength + ' bytes' };
    }
    
    // 显示响应体
    console.group(`%c响应体内容 (ID: ${requestId})`, 'color: green; font-weight: bold');
    console.log(`URL: ${requestInfo.url}`);
    console.log(`状态码: ${response.status} ${response.statusText}`);
    console.log('%c响应头:', 'color: orange');
    console.log(responseHeaders);
    console.log('%c响应体:', 'color: green');
    console.log(responseBody);
    console.groupEnd();
    
  } catch (error) {
    console.error(`重放请求失败 (ID: ${requestId}):`, error);
  } finally {
    // 清理请求信息
    requestsToReplay.delete(requestId);
  }
}

// 监听请求前事件，获取请求体
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    // 跳过扩展自身发起的请求，防止无限循环
    if (isExtensionRequest(details)) {
      console.log(`跳过扩展自身发起的请求: ${details.url}`);
      return;
    }
    
    if (details.method === "POST") {
      console.group(`%c请求详情 (ID: ${details.requestId})`, 'color: blue; font-weight: bold');
      console.log(`URL: ${details.url}`);
      console.log(`方法: ${details.method}`);
      console.log(`时间戳: ${new Date(details.timeStamp).toLocaleString()}`);
      
      // 处理并显示请求体
      if (details.requestBody) {
        const processedBody = processRequestBody(details.requestBody);
        console.log('%c请求体内容:', 'color: green; font-weight: bold');
        console.log(processedBody);
        
        // 存储请求信息以便重放
        requestsToReplay.set(details.requestId, {
          url: details.url,
          method: details.method,
          timeStamp: details.timeStamp,
          body: extractRequestBodyForReplay(details.requestBody)
        });
      }
      
      console.groupEnd();
    }
  },
  {urls: ["<all_urls>"]},
  ["requestBody"]
);

// 监听请求头事件
chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    // 跳过扩展自身发起的请求
    if (isExtensionRequest(details)) {
      return;
    }
    
    if (details.method === "POST") {
      console.group(`%c请求头信息 (ID: ${details.requestId})`, 'color: purple; font-weight: bold');
      console.log(`URL: ${details.url}`);
      
      // 处理并显示请求头
      if (details.requestHeaders) {
        const headers = processHeaders(details.requestHeaders);
        console.log(headers);
        
        // 存储请求头信息以便重放
        if (requestsToReplay.has(details.requestId)) {
          const requestInfo = requestsToReplay.get(details.requestId);
          requestInfo.headers = headers;
          requestsToReplay.set(details.requestId, requestInfo);
        }
      }
      
      console.groupEnd();
    }
  },
  {urls: ["<all_urls>"]},
  ["requestHeaders"]
);

// 监听响应头事件
chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    // 跳过扩展自身发起的请求
    if (isExtensionRequest(details)) {
      return;
    }
    
    if (details.method === "POST") {
      console.group(`%c响应头信息 (ID: ${details.requestId})`, 'color: orange; font-weight: bold');
      console.log(`URL: ${details.url}`);
      console.log(`状态码: ${details.statusCode}`);
      console.log(`状态行: ${details.statusLine}`);
      
      // 处理并显示响应头
      if (details.responseHeaders) {
        const headers = processHeaders(details.responseHeaders);
        console.log(headers);
      }
      
      console.groupEnd();
    }
  },
  {urls: ["<all_urls>"]},
  ["responseHeaders"]
);

// 监听请求完成事件
chrome.webRequest.onCompleted.addListener(
  function(details) {
    // 跳过扩展自身发起的请求
    if (isExtensionRequest(details)) {
      return;
    }
    
    if (details.method === "POST") {
      console.log(`%c请求完成 (ID: ${details.requestId})`, 'color: green; font-weight: bold');
      console.log(`URL: ${details.url}`);
      console.log(`响应状态码: ${details.statusCode}`);
      
      // 重放请求以获取响应体
      if (requestsToReplay.has(details.requestId)) {
        replayRequest(details.requestId);
      }
    }
  },
  {urls: ["<all_urls>"]}
);

// 监听请求错误事件
chrome.webRequest.onErrorOccurred.addListener(
  function(details) {
    // 跳过扩展自身发起的请求
    if (isExtensionRequest(details)) {
      return;
    }
    
    if (details.method === "POST") {
      console.group(`%c请求错误 (ID: ${details.requestId})`, 'color: red; font-weight: bold');
      console.log(`URL: ${details.url}`);
      console.log(`错误信息: ${details.error}`);
      console.groupEnd();
      
      // 清理请求信息
      requestsToReplay.delete(details.requestId);
    }
  },
  {urls: ["<all_urls>"]}
);