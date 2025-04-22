# Request Logger By Content

这是一个Chrome扩展，通过重写XMLHttpRequest的send方法来捕获网页中的HTTP请求，并将请求信息发送到background脚本进行记录和重放。

## 功能特点

1. **重写XMLHttpRequest**：在页面加载前注入脚本，重写XMLHttpRequest的send方法
2. **捕获请求数据**：捕获POST请求的URL、方法、请求头和请求体
3. **记录响应数据**：记录原始请求的响应信息
4. **请求重放**：在background脚本中重放请求，获取完整的响应体内容
5. **防止无限循环**：通过识别扩展自身发起的请求，避免重放导致的无限循环

## 工作原理

### Content Script (content.js)

1. 在页面加载前注入，重写XMLHttpRequest对象
2. 捕获请求的URL、方法、请求头和请求体
3. 将请求信息发送到background脚本
4. 监听原始请求的响应，并将响应信息发送到background脚本

### Background Script (background.js)

1. 接收来自content script的请求信息
2. 使用fetch API重放请求，获取完整的响应体内容
3. 记录请求和响应的详细信息
4. 通过检查请求的来源，避免处理扩展自身发起的请求

## 使用方法

1. 在Chrome浏览器中加载此扩展
2. 打开开发者工具，查看Console面板
3. 浏览网页，所有的POST请求都会被记录并在Console中显示详细信息
4. 查看请求的详细信息，包括请求头、请求体、响应头和响应体

## 注意事项

1. 此扩展仅捕获XMLHttpRequest发起的请求，不包括Fetch API发起的请求
2. 仅处理POST请求，GET请求不会被记录
3. 某些网站可能使用了防止重写XMLHttpRequest的技术，对于这些网站可能无效
4. 重放请求可能会导致某些副作用，如重复提交表单等，请谨慎使用

## 权限说明

- `webRequest`: 用于监听网络请求
- `storage`: 用于存储设置
- `<all_urls>`: 允许扩展在所有网站上运行

## 开发背景

这个扩展是为了解决在Manifest V3下无法直接获取请求体和响应体的限制而开发的。通过重写XMLHttpRequest的send方法，我们可以在请求发送前捕获请求数据，并通过重放请求来获取完整的响应体内容。
