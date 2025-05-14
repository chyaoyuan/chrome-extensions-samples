// 导入所需的 RxJS 操作符
import { fromEvent } from 'https://cdn.skypack.dev/rxjs';
import { filter, debounceTime, distinctUntilChanged } from 'https://cdn.skypack.dev/rxjs/operators';

// WebSocket 连接配置
const WS_CONFIG = {
  targetDomain: 'tip.mesoor.com', // 需要监听的域名
  wsUrl: 'ws://localhost:8000/ws' // WebSocket 服务器地址
};

let wsConnection = null;

// 创建 WebSocket 连接
function createWebSocketConnection() {
  if (wsConnection) {
    wsConnection.close();
  }

  wsConnection = new WebSocket(WS_CONFIG.wsUrl);
  
  wsConnection.onopen = () => {
    console.log('WebSocket connected');
  };

  wsConnection.onclose = () => {
    console.log('WebSocket disconnected');
  };

  wsConnection.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return wsConnection;
}

// 创建 cookie 变化的观察者
const cookieChanges$ = fromEvent(chrome.cookies.onChanged, 'changed')
  .pipe(
    // 只关注特定域名的 cookie 变化
    filter(changeInfo => {
      const { cookie, removed } = changeInfo;
      return cookie.domain.includes(WS_CONFIG.targetDomain);
    }),
    // 防抖，避免频繁重连
    debounceTime(1000),
    // 确保只有在值真正改变时才重连
    distinctUntilChanged((prev, curr) => {
      return prev.cookie.value === curr.cookie.value;
    })
  );

// 订阅 cookie 变化
const subscription = cookieChanges$.subscribe({
  next: (changeInfo) => {
    console.log('Cookie changed, reconnecting WebSocket...');
    createWebSocketConnection();
  },
  error: (error) => {
    console.error('Error in cookie monitoring:', error);
  }
});

// 初始连接
createWebSocketConnection();

// 导出用户流
export const user = wsConnection;
