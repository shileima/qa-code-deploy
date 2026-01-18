# 线上使用指南

## 概述

渲染监控系统在线上环境的使用方式与开发环境有所不同。线上环境通常需要：

1. **构建 SDK**：将运行时 SDK 构建为生产版本
2. **集成到应用**：在 React 应用中引入并初始化 SDK
3. **数据上报**：将监控数据发送到后端服务（而不是开发工具的父窗口）
4. **数据分析**：通过后端服务收集和分析监控数据

## 方案一：iframe 模式（类似开发工具）

适用于需要在管理后台预览和监控应用场景的场景。

### 1. 构建 SDK

```bash
cd packages/runtime-sdk
pnpm build
```

构建产物：
- `dist/index.js` - UMD 格式，可直接在浏览器中使用
- `dist/index.esm.js` - ES 模块格式

### 2. 部署 SDK

将构建后的文件部署到 CDN 或静态服务器：

```
https://your-cdn.com/render-monitor-sdk/v1.0.0/index.js
```

### 3. 在应用中集成

#### 方式 A：通过 script 标签引入

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 其他 head 内容 -->
  <script src="https://your-cdn.com/render-monitor-sdk/v1.0.0/index.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    // SDK 会自动暴露到 window.RenderMonitorSDK
    if (window.RenderMonitorSDK) {
      const sdk = new window.RenderMonitorSDK({
        targetOrigin: '*' // 或指定父窗口域名
      });
      sdk.init();
    }
  </script>
</body>
</html>
```

#### 方式 B：在 React 应用中引入

```jsx
// src/App.jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // 动态加载 SDK
    const script = document.createElement('script');
    script.src = 'https://your-cdn.com/render-monitor-sdk/v1.0.0/index.js';
    script.onload = () => {
      if (window.RenderMonitorSDK) {
        const sdk = new window.RenderMonitorSDK({
          targetOrigin: window.location.origin // 限制消息接收方
        });
        sdk.init();
      }
    };
    document.head.appendChild(script);

    return () => {
      // 清理
      if (window.renderMonitorSDK) {
        window.renderMonitorSDK.destroy();
      }
    };
  }, []);

  return <YourApp />;
}
```

### 4. 父窗口接收消息

```javascript
// 管理后台页面
window.addEventListener('message', (event) => {
  // 验证消息来源
  if (event.origin !== 'https://your-app-domain.com') {
    return;
  }

  const { type, data } = event.data;

  switch (type) {
    case 'render.complete':
      console.log('渲染完成:', data);
      // 更新 UI 显示状态
      break;
    case 'route.change':
      console.log('路由变化:', data);
      break;
    case 'error':
      console.error('错误:', data);
      // 上报到错误监控系统
      break;
  }
});
```

## 方案二：数据上报模式（推荐用于生产环境）

适用于需要收集和分析监控数据的生产环境。

### 1. 修改 SDK 支持数据上报

需要扩展 `MessageBridge` 支持 HTTP 上报：

```typescript
// packages/runtime-sdk/src/MessageBridge.ts (扩展版本)

export class MessageBridge {
  private targetOrigin: string;
  private apiEndpoint?: string;
  private enablePostMessage: boolean;

  constructor(options: {
    targetOrigin?: string;
    apiEndpoint?: string;
    enablePostMessage?: boolean;
  } = {}) {
    this.targetOrigin = options.targetOrigin || '*';
    this.apiEndpoint = options.apiEndpoint;
    this.enablePostMessage = options.enablePostMessage !== false;
  }

  send(type: MessageType, data: any): void {
    const message = {
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // 发送到父窗口（如果在 iframe 中）
    if (this.enablePostMessage && window.parent) {
      try {
        window.parent.postMessage(message, this.targetOrigin);
      } catch (error) {
        console.error('[RenderMonitorSDK] postMessage 失败:', error);
      }
    }

    // 上报到后端 API
    if (this.apiEndpoint) {
      this.reportToAPI(message);
    }
  }

  private async reportToAPI(message: any): void {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        // 不阻塞页面渲染
        keepalive: true
      });
    } catch (error) {
      // 静默失败，不影响应用运行
      console.warn('[RenderMonitorSDK] API 上报失败:', error);
    }
  }
}
```

### 2. 在应用中初始化（带 API 上报）

```jsx
// src/App.jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://your-cdn.com/render-monitor-sdk/v1.0.0/index.js';
    script.onload = () => {
      if (window.RenderMonitorSDK) {
        // 创建自定义 MessageBridge 支持 API 上报
        const sdk = new window.RenderMonitorSDK({
          targetOrigin: '*',
          apiEndpoint: 'https://api.your-domain.com/monitor/report', // 后端 API
          enablePostMessage: false // 生产环境可以关闭 postMessage
        });
        sdk.init();
      }
    };
    document.head.appendChild(script);
  }, []);

  return <YourApp />;
}
```

### 3. 后端 API 示例

```javascript
// Node.js Express 示例
const express = require('express');
const app = express();

app.use(express.json());

app.post('/monitor/report', async (req, res) => {
  const { type, data, timestamp, url, userAgent } = req.body;

  // 存储到数据库
  await db.monitorEvents.insert({
    type,
    data,
    timestamp,
    url,
    userAgent,
    createdAt: new Date()
  });

  // 实时处理
  switch (type) {
    case 'render.complete':
      // 分析渲染性能
      if (data.renderTime > 3000) {
        // 发送告警
        await sendAlert('渲染时间过长', data);
      }
      break;
    case 'error':
      // 错误上报到错误监控系统
      await errorTracking.report(data);
      break;
  }

  res.json({ success: true });
});

app.listen(3000);
```

## 方案三：混合模式

同时支持 iframe 通信和数据上报。

```jsx
const sdk = new window.RenderMonitorSDK({
  targetOrigin: window.location.origin,
  apiEndpoint: 'https://api.your-domain.com/monitor/report',
  enablePostMessage: true // 同时启用两种方式
});
sdk.init();
```

## 最佳实践

### 1. 环境配置

```javascript
// config.js
const config = {
  development: {
    apiEndpoint: null,
    enablePostMessage: true,
    targetOrigin: '*'
  },
  production: {
    apiEndpoint: 'https://api.your-domain.com/monitor/report',
    enablePostMessage: false,
    targetOrigin: 'https://admin.your-domain.com'
  }
};

const env = process.env.NODE_ENV || 'development';
export default config[env];
```

### 2. 错误处理

```javascript
// 添加重试机制
class MessageBridge {
  private async reportToAPI(message: any, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
          keepalive: true
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        if (i === retries - 1) {
          // 最后一次重试失败，可以存储到 localStorage 稍后重试
          this.queueForRetry(message);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}
```

### 3. 数据采样

对于高流量应用，可以添加采样率：

```javascript
const sdk = new window.RenderMonitorSDK({
  apiEndpoint: 'https://api.your-domain.com/monitor/report',
  sampleRate: 0.1 // 只上报 10% 的数据
});
```

### 4. 隐私保护

```javascript
// 过滤敏感信息
const sanitizeData = (data) => {
  const sensitive = ['password', 'token', 'creditCard'];
  return Object.keys(data).reduce((acc, key) => {
    if (!sensitive.some(s => key.toLowerCase().includes(s))) {
      acc[key] = data[key];
    }
    return acc;
  }, {});
};
```

## 部署清单

- [ ] 构建 SDK 生产版本
- [ ] 部署 SDK 到 CDN
- [ ] 配置后端 API 接收监控数据
- [ ] 在应用中集成 SDK
- [ ] 配置环境变量（开发/生产）
- [ ] 测试监控数据上报
- [ ] 设置告警规则
- [ ] 配置数据存储和分析

## 监控指标

建议收集的监控指标：

1. **渲染性能**
   - 首次渲染时间
   - 路由切换时间
   - 组件渲染时间

2. **错误监控**
   - JavaScript 错误
   - 资源加载错误
   - API 请求错误

3. **路由分析**
   - 路由访问频率
   - 路由切换路径
   - 用户行为路径

4. **用户体验**
   - 页面加载时间
   - 交互响应时间
   - 错误率

## 总结

线上使用渲染监控系统主要有三种方式：

1. **iframe 模式**：适用于管理后台预览场景
2. **数据上报模式**：适用于生产环境数据收集和分析
3. **混合模式**：同时支持两种方式

根据实际需求选择合适的方案，并遵循最佳实践确保系统的稳定性和可靠性。
