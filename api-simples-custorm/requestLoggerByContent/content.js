// 重写XMLHttpRequest和Fetch API来捕获请求数据
(function() {
  console.log('%c[Request Logger] Content Script 已加载', 'color: blue; font-weight: bold');
  console.log('%c[Request Logger] 当前页面URL:', 'color: blue', window.location.href);

  try {
    // 保存原始的XMLHttpRequest对象
    const originalXHR = window.XMLHttpRequest;
    console.log('%c[Request Logger] 成功获取原始XMLHttpRequest对象', 'color: green');

    // 创建新的XMLHttpRequest构造函数
    function CustomXMLHttpRequest() {
      // 创建原始的XMLHttpRequest实例
      const xhr = new originalXHR();
      
      // 保存原始的send方法
      const originalSend = xhr.send;
      
      // 保存请求URL和方法
      let requestUrl = '';
      let requestMethod = '';
      let requestHeaders = {};
      
      // 重写open方法以捕获URL和方法
      const originalOpen = xhr.open;
      xhr.open = function() {
        requestMethod = arguments[0];
        requestUrl = arguments[1];
        console.log(`%c[Request Logger] XHR.open: ${requestMethod} ${requestUrl}`, 'color: purple');
        return originalOpen.apply(this, arguments);
      };
      
      // 重写setRequestHeader方法以捕获请求头
      const originalSetRequestHeader = xhr.setRequestHeader;
      xhr.setRequestHeader = function(name, value) {
        requestHeaders[name] = value;
        return originalSetRequestHeader.apply(this, arguments);
      };
      
      // 重写send方法
      xhr.send = function(body) {
        console.log(`%c[Request Logger] XHR.send 被调用: ${requestMethod} ${requestUrl}`, 'color: blue');
        
        // 处理所有请求，不仅仅是POST
        const requestData = {
          url: requestUrl,
          method: requestMethod,
          headers: requestHeaders,
          body: body ? processRequestBody(body) : null,
          timestamp: Date.now(),
          source: 'xhr'
        };
        
        console.log('%c[Request Logger] 准备发送请求数据到background:', 'color: orange', requestData);
        
        // 发送消息到background.js
        try {
          chrome.runtime.sendMessage({
            action: 'logRequest',
          requestData: requestData
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('%c[Request Logger] 发送消息到background失败:', 'color: red', chrome.runtime.lastError);
            } else {
              console.log('%c[Request Logger] 成功发送请求数据到background', 'color: green', response);
            }
          });
        } catch (sendError) {
          console.error('%c[Request Logger] 发送消息时出错:', 'color: red', sendError);
        }
        
        // 监听响应
        xhr.addEventListener('load', function() {
          try {
            console.log(`%c[Request Logger] XHR 请求完成: ${requestMethod} ${requestUrl}, 状态: ${xhr.status}`, 'color: green');
            const responseData = {
              url: requestUrl,
              status: xhr.status,
              statusText: xhr.statusText,
              responseType: xhr.responseType,
              response: xhr.responseType === '' || xhr.responseType === 'text' ? xhr.responseText : null,
              responseHeaders: xhr.getAllResponseHeaders(),
              source: 'xhr'
            };
            
            // 发送响应数据到background.js
            chrome.runtime.sendMessage({
              action: 'logResponse',
              responseData: responseData
            }, function(response) {
              if (chrome.runtime.lastError) {
                console.error('%c[Request Logger] 发送响应数据到background失败:', 'color: red', chrome.runtime.lastError);
              }
            });
          } catch (error) {
            console.error('%c[Request Logger] 记录响应时出错:', 'color: red', error);
          }
        });
      }
      
      // 调用原始的send方法
      return originalSend.apply(this, arguments);
    };
    
    return xhr;
  }
  
  // 保存原始的fetch函数
  const originalFetch = window.fetch;
  
  // 重写fetch函数
  window.fetch = function(input, init) {
    let url = (typeof input === 'string') ? input : input.url;
    let method = (init && init.method) ? init.method : 'GET';
    
    console.log(`%c[Request Logger] Fetch 被调用: ${method} ${url}`, 'color: blue');
    
    // 准备请求头
    let headers = {};
    if (init && init.headers) {
      if (init.headers instanceof Headers) {
        for (const [key, value] of init.headers.entries()) {
          headers[key] = value;
        }
      } else if (typeof init.headers === 'object') {
        headers = {...init.headers};
      }
    }
    
    // 准备请求体
    let body = null;
    if (init && init.body) {
      body = processRequestBody(init.body);
    }
    
    // 准备发送到background的数据
    const requestData = {
      url: url,
      method: method,
      headers: headers,
      body: body,
      timestamp: Date.now(),
      source: 'fetch'
    };
    
    console.log('%c[Request Logger] 准备发送Fetch请求数据到background:', 'color: orange', requestData);
    
    // 发送消息到background.js
    try {
      chrome.runtime.sendMessage({
        action: 'logRequest',
        requestData: requestData
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('%c[Request Logger] 发送Fetch请求数据到background失败:', 'color: red', chrome.runtime.lastError);
        } else {
          console.log('%c[Request Logger] 成功发送Fetch请求数据到background', 'color: green', response);
        }
      });
    } catch (sendError) {
      console.error('%c[Request Logger] 发送Fetch消息时出错:', 'color: red', sendError);
    }
    
    // 调用原始的fetch函数
    return originalFetch.apply(window, arguments).then(response => {
      console.log(`%c[Request Logger] Fetch 请求完成: ${method} ${url}, 状态: ${response.status}`, 'color: green');
      
      // 克隆响应以便我们可以读取它的内容
      const clonedResponse = response.clone();
      
      // 处理响应
      clonedResponse.text().then(responseText => {
        let parsedResponse = responseText;
        try {
          // 尝试解析JSON
          parsedResponse = JSON.parse(responseText);
        } catch (e) {
          // 不是JSON，保持为文本
        }
        
        // 准备响应数据
        const responseData = {
          url: url,
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: Object.fromEntries(clonedResponse.headers.entries()),
          response: parsedResponse,
          source: 'fetch'
        };
        
        // 发送响应数据到background.js
        try {
          chrome.runtime.sendMessage({
            action: 'logResponse',
            responseData: responseData
          }, function(response) {
            if (chrome.runtime.lastError) {
              console.error('%c[Request Logger] 发送Fetch响应数据到background失败:', 'color: red', chrome.runtime.lastError);
            }
          });
        } catch (error) {
          console.error('%c[Request Logger] 记录Fetch响应时出错:', 'color: red', error);
        }
      }).catch(error => {
        console.error('%c[Request Logger] 读取Fetch响应内容时出错:', 'color: red', error);
      });
      
      return response;
    });
  };
  
  // 处理请求体数据
  function processRequestBody(body) {
    if (!body) return null;
    
    // 如果是FormData对象
    if (body instanceof FormData) {
      const formDataObj = {};
      try {
        for (const pair of body.entries()) {
          formDataObj[pair[0]] = pair[1];
        }
      } catch (e) {
        console.error('%c[Request Logger] 处理FormData时出错:', 'color: red', e);
        return {
          type: 'formData',
          error: e.message
        };
      }
      return {
        type: 'formData',
        content: formDataObj
      };
    }
    
    // 如果是Blob对象
    if (body instanceof Blob) {
      return {
        type: 'blob',
        size: body.size,
        type: body.type
      };
    }
    
    // 如果是ArrayBuffer
    if (body instanceof ArrayBuffer) {
      return {
        type: 'arrayBuffer',
        size: body.byteLength
      };
    }
    
    // 如果是字符串，尝试解析为JSON
    if (typeof body === 'string') {
      try {
        const jsonData = JSON.parse(body);
        return {
          type: 'json',
          content: jsonData
        };
      } catch (e) {
        // 不是JSON，作为普通文本处理
        return {
          type: 'text',
          content: body
        };
      }
    }
    
    // 如果是对象，直接返回
    if (typeof body === 'object') {
      return {
        type: 'object',
        content: body
      };
    }
    
    // 其他类型
    return {
      type: 'unknown',
      content: String(body)
    };
  }
  
  try {
    // 替换原始的XMLHttpRequest
    window.XMLHttpRequest = CustomXMLHttpRequest;
    console.log('%c[Request Logger] XMLHttpRequest已被成功重写', 'color: green');
    
    console.log('%c[Request Logger] Fetch已被成功重写', 'color: green');
  } catch (error) {
    console.error('%c[Request Logger] 重写网络API时出错:', 'color: red', error);
  }
  
  // 向页面注入一个标记，表示扩展已加载
  const marker = document.createElement('div');
  marker.id = 'request-logger-marker';
  marker.style.display = 'none';
  document.documentElement.appendChild(marker);
  
  console.log('%c[Request Logger] 内容脚本初始化完成', 'color: green; font-weight: bold');
} catch (globalError) {
  console.error('%c[Request Logger] 内容脚本初始化失败:', 'color: red; font-weight: bold', globalError);
}
});
