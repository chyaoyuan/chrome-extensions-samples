# chrome.declarativeNetRequest - URL Blocker

This sample demonstrates using the [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/) API to block requests.

## Overview

Once this extension is installed, any requests made in the main frame to example.com will be blocked.

## Implementation Notes

This sample uses the `chrome.declarativeNetRequest.onRuleMatchedDebug` event which is only available in unpacked extensions.

# chrome.declarativeNetRequest - URL拦截器

此示例演示了如何使用 [`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/declarativeNetRequest/) API 来拦截请求。

## 概述

安装此扩展后，在主框架中对 example.com 的任何请求都将被拦截。

## 实现说明

此示例使用了 `chrome.declarativeNetRequest.onRuleMatchedDebug` 事件，该事件仅在未打包的扩展中可用。
