# 请求记录器 (Request Logger)

这个Chrome扩展用于监听和记录网页中的POST请求数据，包括详细的请求体和请求头信息。

## 功能概述

- 监听所有网站的POST请求
- 在控制台中记录请求URL和时间戳
- 详细解析并显示请求体内容，包括：
  - 表单数据（formData）的完整内容
  - 原始JSON数据的解析结果
  - 文本数据的完整内容
  - 二进制数据的大小信息
- 完整显示所有请求头字段
- 使用彩色标记使日志更易读
- 使用Manifest V3标准开发

## 技术实现

此扩展使用Chrome的`webRequest` API来监听网络请求。在Manifest V3中，我们不能使用`webRequestBlocking`来阻止或修改请求，但仍然可以监听和记录请求信息。

### manifest.json

```json
{
    "name": "Request Logger",
    "version": "1.0",
    "permissions": ["webRequest"],
    "host_permissions": ["<all_urls>"],
    "background": {
      "service_worker": "background.js"
    },
    "manifest_version": 3
}
```

### background.js

Service Worker负责监听POST请求并记录详细信息：

```javascript
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

// 监听请求前事件，获取请求体
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.method === "POST") {
      console.log(`%c请求详情 (ID: ${details.requestId})`, 'color: blue; font-weight: bold');
      console.log(`URL: ${details.url}`);
      console.log(`方法: ${details.method}`);
      console.log(`时间戳: ${new Date(details.timeStamp).toLocaleString()}`);
      
      // 处理并显示请求体
      if (details.requestBody) {
        const processedBody = processRequestBody(details.requestBody);
        console.log('%c请求体内容:', 'color: green; font-weight: bold');
        console.log(processedBody);
      }
    }
  },
  {urls: ["<all_urls>"]},
  ["requestBody"]
);

// 监听请求头事件
chrome.webRequest.onSendHeaders.addListener(
  function(details) {
    if (details.method === "POST") {
      console.log(`%c请求头信息 (ID: ${details.requestId})`, 'color: purple; font-weight: bold');
      
      // 格式化并显示请求头
      if (details.requestHeaders) {
        const headers = {};
        for (const header of details.requestHeaders) {
          headers[header.name] = header.value;
        }
        console.log(headers);
      }
    }
  },
  {urls: ["<all_urls>"]},
  ["requestHeaders"]
);
```

## 使用方法

1. 在Chrome中加载此扩展（开发者模式下加载未打包的扩展）
2. 打开Chrome开发者工具的控制台面板
3. 访问任何网站并执行POST请求（如提交表单或AJAX请求）
4. 在控制台中查看彩色格式化的请求详情，包括：
   - 蓝色标记的请求基本信息
   - 绿色标记的请求体内容（已解析为可读格式）
   - 紫色标记的请求头信息（以键值对形式展示）

## 数据解析能力

- **表单数据**：完整显示所有字段和值
- **JSON数据**：自动解析为JavaScript对象
- **文本数据**：显示完整文本内容
- **二进制数据**：显示数据大小
- **请求头**：以键值对形式显示所有头字段

## 注意事项

- 此扩展仅记录请求信息，不会阻止或修改请求
- 在Manifest V3中，`webRequestBlocking`权限已不再支持
- 要查看记录的数据，需要打开开发者工具的控制台
- 使用`requestId`关联同一请求的请求体和请求头信息

## 隐私说明

此扩展可以查看您在浏览器中发送的POST请求数据，仅用于开发和学习目的。数据仅在本地记录，不会发送到任何远程服务器。
