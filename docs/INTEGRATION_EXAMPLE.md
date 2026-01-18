# 集成示例

## React 应用集成示例

### 1. 基础集成

```jsx
// src/App.jsx
import { useEffect, useRef } from 'react';

function App() {
  const sdkRef = useRef(null);

  useEffect(() => {
    // 加载 SDK
    const script = document.createElement('script');
    script.src = process.env.REACT_APP_SDK_URL || 
                 'https://cdn.example.com/render-monitor-sdk/v1.0.0/index.js';
    script.async = true;
    
    script.onload = () => {
      if (window.RenderMonitorSDK) {
        sdkRef.current = new window.RenderMonitorSDK({
          targetOrigin: process.env.REACT_APP_ADMIN_URL || '*',
          apiEndpoint: process.env.REACT_APP_MONITOR_API,
          enablePostMessage: process.env.NODE_ENV === 'development'
        });
        sdkRef.current.init();
      }
    };

    script.onerror = () => {
      console.error('SDK 加载失败');
    };

    document.head.appendChild(script);

    return () => {
      if (sdkRef.current) {
        sdkRef.current.destroy();
      }
    };
  }, []);

  return <YourAppContent />;
}
```

### 2. 使用环境变量配置

```bash
# .env.development
REACT_APP_SDK_URL=http://localhost:5173/packages/runtime-sdk/dist/index.js
REACT_APP_MONITOR_API=
REACT_APP_ADMIN_URL=http://localhost:5173

# .env.production
REACT_APP_SDK_URL=https://cdn.example.com/render-monitor-sdk/v1.0.0/index.js
REACT_APP_MONITOR_API=https://api.example.com/monitor/report
REACT_APP_ADMIN_URL=https://admin.example.com
```

### 3. Next.js 集成

```jsx
// pages/_app.js
import { useEffect } from 'react';
import Script from 'next/script';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if (window.RenderMonitorSDK) {
      const sdk = new window.RenderMonitorSDK({
        apiEndpoint: process.env.NEXT_PUBLIC_MONITOR_API,
        enablePostMessage: false
      });
      sdk.init();
    }
  }, []);

  return (
    <>
      <Script
        src={process.env.NEXT_PUBLIC_SDK_URL}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('SDK loaded');
        }}
      />
      <Component {...pageProps} />
    </>
  );
}
```

### 4. Vue 应用集成

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    // 加载 SDK
    const script = document.createElement('script');
    script.src = process.env.VUE_APP_SDK_URL;
    script.onload = () => {
      if (window.RenderMonitorSDK) {
        this.$sdk = new window.RenderMonitorSDK({
          apiEndpoint: process.env.VUE_APP_MONITOR_API
        });
        this.$sdk.init();
      }
    };
    document.head.appendChild(script);
  },
  beforeUnmount() {
    if (this.$sdk) {
      this.$sdk.destroy();
    }
  }
};
</script>
```

## 后端 API 示例

### Node.js + Express

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json({ limit: '10mb' }));

// 监控数据接收端点
app.post('/api/monitor/report', async (req, res) => {
  const { type, data, timestamp, url, userAgent } = req.body;

  try {
    // 存储到数据库
    await db.monitorEvents.create({
      type,
      data: JSON.stringify(data),
      timestamp: new Date(timestamp),
      url,
      userAgent,
      createdAt: new Date()
    });

    // 实时处理
    switch (type) {
      case 'render.complete':
        await handleRenderComplete(data);
        break;
      case 'error':
        await handleError(data);
        break;
      case 'route.change':
        await handleRouteChange(data);
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('处理监控数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function handleRenderComplete(data) {
  // 渲染性能分析
  if (data.renderTime > 3000) {
    // 发送告警
    await sendAlert({
      type: 'slow_render',
      message: `页面渲染时间过长: ${data.renderTime}ms`,
      data
    });
  }

  // 记录性能指标
  await metrics.record('render_time', data.renderTime);
}

async function handleError(data) {
  // 错误上报到错误监控系统
  await errorTracking.report({
    message: data.message,
    stack: data.stack,
    source: data.source,
    lineno: data.lineno,
    colno: data.colno
  });
}

async function handleRouteChange(data) {
  // 路由分析
  await analytics.track('route_change', {
    path: data.routerPath,
    mode: data.routerMode
  });
}

app.listen(3000, () => {
  console.log('监控服务运行在 http://localhost:3000');
});
```

### Python + Flask

```python
# app.py
from flask import Flask, request, jsonify
from datetime import datetime
import json

app = Flask(__name__)

@app.route('/api/monitor/report', methods=['POST'])
def report():
    data = request.json
    
    event_type = data.get('type')
    event_data = data.get('data')
    timestamp = data.get('timestamp')
    
    # 存储到数据库
    save_to_db({
        'type': event_type,
        'data': json.dumps(event_data),
        'timestamp': datetime.fromtimestamp(timestamp / 1000),
        'url': data.get('url'),
        'user_agent': data.get('userAgent')
    })
    
    # 处理不同类型的事件
    if event_type == 'render.complete':
        handle_render_complete(event_data)
    elif event_type == 'error':
        handle_error(event_data)
    elif event_type == 'route.change':
        handle_route_change(event_data)
    
    return jsonify({'success': True})

def handle_render_complete(data):
    render_time = data.get('renderTime', 0)
    if render_time > 3000:
        send_alert(f'渲染时间过长: {render_time}ms')

def handle_error(data):
    # 上报到错误监控系统
    error_tracking.report({
        'message': data.get('message'),
        'stack': data.get('stack')
    })

if __name__ == '__main__':
    app.run(port=3000)
```

## 数据分析和可视化

### 1. 使用 Grafana 展示

```sql
-- 查询渲染时间统计
SELECT 
  DATE_TRUNC('hour', timestamp) as time,
  AVG(data->>'renderTime')::float as avg_render_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (data->>'renderTime')::float) as p95_render_time
FROM monitor_events
WHERE type = 'render.complete'
GROUP BY time
ORDER BY time;
```

### 2. 使用 Elasticsearch

```javascript
// 查询错误趋势
const query = {
  index: 'monitor-events',
  body: {
    query: {
      bool: {
        must: [
          { term: { type: 'error' } },
          { range: { timestamp: { gte: 'now-24h' } } }
        ]
      }
    },
    aggs: {
      errors_over_time: {
        date_histogram: {
          field: 'timestamp',
          interval: '1h'
        }
      }
    }
  }
};
```

## 部署检查清单

- [ ] SDK 已构建并部署到 CDN
- [ ] 环境变量已配置
- [ ] 后端 API 已部署并测试
- [ ] 数据库表结构已创建
- [ ] 错误监控系统已集成
- [ ] 告警规则已配置
- [ ] 数据分析仪表板已设置
- [ ] 性能监控已启用
- [ ] 日志收集已配置
- [ ] 生产环境测试已完成
