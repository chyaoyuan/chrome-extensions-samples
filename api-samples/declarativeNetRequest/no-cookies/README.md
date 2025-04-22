# chrome.declarativeNetRequest - No Cookies

This sample demonstrates using the [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/) API to remove the "Cookie" header from requests.

## Overview

Once this extension is installed, any main frame requests ending in `?no-cookies=1` will be sent without the "Cookie" header.

For example, install this extension and try navigating to https://github.com/GoogleChrome/chrome-extensions-samples?no-cookies=1. You should appear signed out.

## Implementation Notes

This sample uses the `chrome.declarativeNetRequest.onRuleMatchedDebug` event which is only available in unpacked extensions.

# chrome.declarativeNetRequest - 无Cookie

此示例演示了如何使用 [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/) API 从请求中移除 "Cookie" 头部。

## 概述

安装此扩展后，任何以 `?no-cookies=1` 结尾的主框架请求将在发送时不包含 "Cookie" 头部。

例如，安装此扩展并尝试导航到 https://github.com/GoogleChrome/chrome-extensions-samples?no-cookies=1。你应该会显示为已登出状态。

## 实现说明

此示例使用了 `chrome.declarativeNetRequest.onRuleMatchedDebug` 事件，该事件仅在未打包的扩展中可用。
