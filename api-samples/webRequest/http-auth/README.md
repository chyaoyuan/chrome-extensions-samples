# webRequest.onAuthRequired

This sample demonstrates the `webRequest.onAuthRequired` listener to detect an authentication request and log the user into the designated site.

## Overview

When an authentication check is detected, a check is made to confirm that the request has come from the correct source. Account credentials are then provided for the response via an auth handler.

## Running this extension

1. Clone this repository.
2. Load this directory in Chrome as an [unpacked extension](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked).
3. Open a new tab and navigate to <https://httpbin.org/basic-auth/guest/guest>. You will be prompted to enter a username and password. With this extension installed, the username and password will be automatically provided.

# webRequest.onAuthRequired（HTTP认证请求）

此示例演示了如何使用 `webRequest.onAuthRequired` 监听器来检测认证请求并将用户登录到指定网站。

## 概述

当检测到认证检查时，会进行验证以确认请求来自正确的源。然后通过认证处理程序为响应提供账户凭据。

## 运行此扩展

1. 克隆此仓库。
2. 在Chrome中将此目录作为[未打包扩展](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked)加载。
3. 打开新标签页并导航到 <https://httpbin.org/basic-auth/guest/guest>。系统会提示您输入用户名和密码。安装此扩展后，用户名和密码将自动提供。
