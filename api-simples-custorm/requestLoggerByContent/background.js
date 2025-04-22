// 在Manifest V3中接收来自content script的请求并进行重放

console.log('%c[Request Logger] Background Script 已启动', 'color: blue; font-weight: bold');

// 获取当前扩展的ID
const extensionId = chrome.runtime.id;
const extensionOrigin = `chrome-extension://${extensionId}`;
console.log('%c[Request Logger] 扩展ID:', 'color: green', extensionId);

// 存储请求信息的Map
const requestsInfo = new Map();

// 初始化计数器
let totalRequests = 0;
let totalReplays = 0;
let successfulReplays = 0;
let failedReplays = 0;

// 检查请求是否由扩展自身发起
function isExtensionRequest(url, initiator) {
  // 检查initiator是否为扩展源
  if (initiator && initiator.startsWith('chrome-extension://')) {
    console.log('%c[Request Logger] 检测到扩展发起的请求 (initiator):', 'color: orange', initiator);
    return true;
  }
  
  // 检查URL是否为扩展源
  if (url && url.startsWith('chrome-extension://')) {
    console.log('%c[Request Logger] 检测到扩展发起的请求 (URL):', 'color: orange', url);
    return true;
  }
  
  // 检查特殊标记
  if (url && url.includes('X-Requested-By-Extension')) {
    console.log('%c[Request Logger] 检测到扩展标记的请求:', 'color: orange', url);
    return true;
  }
  
  return false;
}

// 处理请求头字符串
function parseResponseHeaders(headerStr) {
  const headers = {};
  if (!headerStr) return headers;
  
  const headerPairs = headerStr.split('\r\n');
  for (let i = 0; i < headerPairs.length; i++) {
    const headerPair = headerPairs[i];
    const index = headerPair.indexOf(': ');
    if (index > 0) {
      const key = headerPair.substring(0, index).toLowerCase();
      const val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}

// 重放请求并获取完整响应
async function replayRequest(requestData) {
  totalReplays++;
  
  try {
    console.group(`%c[Request Logger] 重放请求 #${totalReplays}`, 'color: blue; font-weight: bold');
    console.log(`URL: ${requestData.url}`);
    console.log(`方法: ${requestData.method}`);
    console.log(`源: ${requestData.source || 'unknown'}`);
    
    // 准备请求头
    const headers = new Headers();
    if (requestData.headers) {
      for (const [name, value] of Object.entries(requestData.headers)) {
        // 跳过某些特殊的头，这些头可能会导致CORS问题
        if (!['host', 'origin', 'referer', 'sec-fetch-mode', 'sec-fetch-site'].includes(name.toLowerCase())) {
          headers.append(name, value);
        }
      }
    }
    
    // 添加特殊头以标识这是扩展发起的请求
    headers.append('X-Requested-By-Extension', extensionId);
    
    // 准备请求体
    let body = null;
    if (requestData.body) {
      console.log('请求体类型:', requestData.body.type);
      
      if (requestData.body.type === 'json' || requestData.body.type === 'object') {
        body = JSON.stringify(requestData.body.content);
        // 如果没有设置Content-Type，则设置为application/json
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
          console.log('自动设置Content-Type为application/json');
        }
      } else if (requestData.body.type === 'text') {
        body = requestData.body.content;
      } else if (requestData.body.type === 'formData') {
        try {
          const formData = new FormData();
          for (const [key, value] of Object.entries(requestData.body.content)) {
            formData.append(key, value);
          }
          body = formData;
          // 移除Content-Type让浏览器自动设置正确的边界
          headers.delete('Content-Type');
          console.log('已删除Content-Type以便浏览器自动设置FormData边界');
        } catch (formDataError) {
          console.error('%c[Request Logger] 创建FormData时出错:', 'color: red', formDataError);
        }
      }
    }
    
    console.log('请求头:', Object.fromEntries(headers.entries()));
    console.log('请求体:', body);
    
    // 发送请求
    console.log('%c[Request Logger] 开始发送重放请求...', 'color: blue');
    const response = await fetch(requestData.url, {
      method: requestData.method,
      headers: headers,
      body: body,
      credentials: 'include', // 包含cookies
      mode: 'cors' // 尝试CORS请求
    });
    
    console.log('%c[Request Logger] 重放请求成功返回，状态码:', 'color: green', response.status);
    
    // 获取响应体
    let responseBody;
    const contentType = response.headers.get('content-type');
    console.log('响应Content-Type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
      console.log('解析为JSON响应');
    } else if (contentType && (
      contentType.includes('text/') || 
      contentType.includes('application/javascript') || 
      contentType.includes('application/xml')
    )) {
      responseBody = await response.text();
      console.log('解析为文本响应');
    } else {
      // 对于二进制数据，只记录大小
      const blob = await response.blob();
      responseBody = `二进制数据 (${blob.size} bytes, ${blob.type})`;
      console.log('解析为二进制响应');
    }
    
    // 记录响应信息
    console.log(`%c[Request Logger] 响应状态: ${response.status} ${response.statusText}`, 'color: green; font-weight: bold');
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    console.log('响应体:', responseBody);
    
    console.groupEnd();
    
    successfulReplays++;
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };
  } catch (error) {
    console.group(`%c[Request Logger] 重放请求失败`, 'color: red; font-weight: bold');
    console.log(`URL: ${requestData.url}`);
    console.log(`错误: ${error.message}`);
    console.log(`堆栈: ${error.stack}`);
    console.groupEnd();
    
    failedReplays++;
    return {
      error: error.message
    };
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    console.log('%c[Request Logger] 收到消息:', 'color: purple', message.action);
    
    // 记录请求
    if (message.action === 'logRequest') {
      totalRequests++;
      const requestData = message.requestData;
      
      // 跳过扩展自身发起的请求，防止无限循环
      if (isExtensionRequest(requestData.url, sender.url)) {
        console.log(`%c[Request Logger] 跳过扩展自身发起的请求: ${requestData.url}`, 'color: orange');
        sendResponse({ success: false, reason: 'extension_request' });
        return true;
      }
      
      const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      console.group(`%c[Request Logger] 收到请求 #${totalRequests} (ID: ${requestId})`, 'color: blue; font-weight: bold');
      console.log(`来源页面: ${sender.tab ? sender.tab.url : '未知'}`);
      console.log(`来源框架: ${sender.frameId || '主框架'}`);
      console.log(`URL: ${requestData.url}`);
      console.log(`方法: ${requestData.method}`);
      console.log(`源类型: ${requestData.source || 'unknown'}`);
      console.log(`时间戳: ${new Date(requestData.timestamp).toLocaleString()}`);
      console.log('请求头:', requestData.headers);
      console.log('请求体:', requestData.body);
      console.groupEnd();
      
      // 存储请求信息
      requestsInfo.set(requestId, {
        ...requestData,
        tabId: sender.tab ? sender.tab.id : -1,
        frameId: sender.frameId,
        timestamp: Date.now(),
        originalTimestamp: requestData.timestamp
      });
      
      // 立即重放请求
      try {
        console.log(`%c[Request Logger] 开始重放请求 ${requestId}`, 'color: blue');
        
        replayRequest(requestData).then(responseData => {
          console.log(`%c[Request Logger] 请求 ${requestId} 重放完成`, 'color: green');
          // 存储响应信息
          const requestInfo = requestsInfo.get(requestId);
          if (requestInfo) {
            requestInfo.response = responseData;
            requestInfo.replayCompleted = true;
            requestInfo.replayTimestamp = Date.now();
            requestsInfo.set(requestId, requestInfo);
            
            console.log(`%c[Request Logger] 请求统计: 总请求=${totalRequests}, 重放=${totalReplays}, 成功=${successfulReplays}, 失败=${failedReplays}`, 'color: blue');
          }
        }).catch(error => {
          console.error(`%c[Request Logger] 重放请求 ${requestId} 失败:`, 'color: red', error);
          
          // 存储错误信息
          const requestInfo = requestsInfo.get(requestId);
          if (requestInfo) {
            requestInfo.replayError = error.message;
            requestInfo.replayCompleted = false;
            requestsInfo.set(requestId, requestInfo);
          }
        });
      } catch (replayError) {
        console.error(`%c[Request Logger] 启动重放时出错:`, 'color: red', replayError);
      }
      
      // 发送响应
      sendResponse({ 
        success: true, 
        requestId: requestId,
        message: `请求已记录并开始重放` 
      });
      return true; // 保持消息通道开放
    }
    
    // 记录响应
    if (message.action === 'logResponse') {
      const responseData = message.responseData;
      
      console.group(`%c[Request Logger] 收到原始响应`, 'color: purple; font-weight: bold');
      console.log(`URL: ${responseData.url}`);
      console.log(`源类型: ${responseData.source || 'unknown'}`);
      console.log(`状态: ${responseData.status} ${responseData.statusText}`);
      
      let headers;
      if (typeof responseData.responseHeaders === 'string') {
        headers = parseResponseHeaders(responseData.responseHeaders);
        console.log('响应头 (字符串解析):', headers);
      } else if (responseData.headers) {
        headers = responseData.headers;
        console.log('响应头 (对象):', headers);
      } else {
        console.log('无响应头信息');
      }
      
      console.log('响应体:', responseData.response);
      console.groupEnd();
      
      // 发送响应
      sendResponse({ 
        success: true,
        message: '原始响应已记录'
      });
      return true; // 保持消息通道开放
    }
    
    // 未知消息类型
    console.warn(`%c[Request Logger] 收到未知消息类型:`, 'color: orange', message);
    sendResponse({ success: false, reason: 'unknown_action' });
    return true;
    
  } catch (error) {
    console.error(`%c[Request Logger] 处理消息时出错:`, 'color: red', error);
    sendResponse({ success: false, error: error.message });
    return true;
  }
});

// 定期清理旧请求数据
setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000); // 1小时前
  
  let cleanupCount = 0;
  for (const [requestId, requestInfo] of requestsInfo.entries()) {
    if (requestInfo.timestamp < oneHourAgo) {
      requestsInfo.delete(requestId);
      cleanupCount++;
    }
  }
  
  if (cleanupCount > 0) {
    console.log(`%c[Request Logger] 清理了 ${cleanupCount} 条旧请求数据`, 'color: gray');
  }
}, 30 * 60 * 1000); // 每30分钟清理一次

// 打印当前状态
console.log(`%c[Request Logger] Background Script 初始化完成`, 'color: green; font-weight: bold');
console.log(`%c[Request Logger] 扩展ID: ${extensionId}`, 'color: blue');
console.log(`%c[Request Logger] 扩展源: ${extensionOrigin}`, 'color: blue');
console.log(`%c[Request Logger] 当前时间: ${new Date().toLocaleString()}`, 'color: blue');
