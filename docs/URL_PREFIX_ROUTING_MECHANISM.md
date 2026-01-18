# URL 前缀路由机制分析

## 问题描述

不同的 URL 前缀（如 `https://mttf3dq7wrg9on.sandbox.nocode.sankuai.com/` 和 `https://mteyg1wky8uqgs.sandbox.nocode.sankuai.com/`）如何通过某种机制来渲染不同的页面内容？

## 机制分析

### 1. 服务器端路由机制（最可能）

不同的子域名前缀通常通过**服务器端反向代理/负载均衡器**来实现路由到不同的应用实例：

```
┌─────────────────────────────────────────────────────────┐
│  浏览器请求                                              │
│  https://mttf3dq7wrg9on.sandbox.nocode.sankuai.com/    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  DNS 解析 / 负载均衡器                                    │
│  根据子域名前缀路由到不同的后端服务                        │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│ Vite Server 1│   │ Vite Server 2│
│ (应用实例 A)  │   │ (应用实例 B)  │
│              │   │              │
│ 不同的代码库  │   │ 不同的代码库  │
│ 或配置       │   │ 或配置       │
└──────────────┘   └──────────────┘
```

#### 实现方式

**方式 1：Nginx 反向代理配置**

```nginx
# Nginx 配置示例
server {
    server_name *.sandbox.nocode.sankuai.com;
    
    location / {
        # 提取子域名前缀
        set $subdomain $1;
        
        # 根据子域名路由到不同的后端
        if ($host ~* ^([^.]+)\.sandbox\.nocode\.sankuai\.com$) {
            set $subdomain $1;
        }
        
        # 路由到对应的 Vite 服务器
        proxy_pass http://vite-server-${subdomain}:5174;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**方式 2：Kubernetes Ingress 配置**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sandbox-ingress
spec:
  rules:
  - host: mttf3dq7wrg9on.sandbox.nocode.sankuai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: vite-app-instance-1
            port:
              number: 5174
  - host: mteyg1wky8uqgs.sandbox.nocode.sankuai.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: vite-app-instance-2
            port:
              number: 5174
```

**方式 3：应用级路由（基于环境变量）**

每个 Vite 服务器实例可以通过环境变量来区分：

```bash
# 实例 1
SUBDOMAIN_PREFIX=mttf3dq7wrg9on
APP_CONFIG=config-app-a.json
vite dev --port 5174

# 实例 2
SUBDOMAIN_PREFIX=mteyg1wky8uqgs
APP_CONFIG=config-app-b.json
vite dev --port 5175
```

### 2. 客户端路由机制（可选实现）

如果需要在客户端代码中根据 URL 前缀来渲染不同内容，可以通过以下方式实现：

#### 方式 1：基于 `window.location.hostname` 判断

```javascript
// 在应用入口文件中
const getAppConfig = () => {
  const hostname = window.location.hostname;
  
  // 提取子域名前缀
  const match = hostname.match(/^([^.]+)\.sandbox\.nocode\.sankuai\.com$/);
  const prefix = match ? match[1] : null;
  
  // 根据前缀返回不同的配置
  const configs = {
    'mttf3dq7wrg9on': {
      appName: '应用 A',
      theme: 'light',
      apiEndpoint: 'https://api-a.example.com',
      features: ['feature1', 'feature2']
    },
    'mteyg1wky8uqgs': {
      appName: '应用 B',
      theme: 'dark',
      apiEndpoint: 'https://api-b.example.com',
      features: ['feature3', 'feature4']
    }
  };
  
  return configs[prefix] || configs.default;
};

// 使用配置
const appConfig = getAppConfig();
```

#### 方式 2：基于 Vite 环境变量

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 根据模式（子域名）加载不同的配置
  const configs = {
    'mttf3dq7wrg9on': {
      define: {
        __APP_CONFIG__: JSON.stringify({
          appName: '应用 A',
          theme: 'light'
        })
      }
    },
    'mteyg1wky8uqgs': {
      define: {
        __APP_CONFIG__: JSON.stringify({
          appName: '应用 B',
          theme: 'dark'
        })
      }
    }
  };
  
  return {
    plugins: [react()],
    ...configs[mode]
  };
});
```

#### 方式 3：动态路由组件

```jsx
// App.jsx
import { useMemo } from 'react';

const App = () => {
  const appConfig = useMemo(() => {
    const hostname = window.location.hostname;
    const prefix = hostname.split('.')[0];
    
    // 根据前缀返回不同的组件配置
    const routes = {
      'mttf3dq7wrg9on': [
        { path: '/', component: HomeA },
        { path: '/about', component: AboutA }
      ],
      'mteyg1wky8uqgs': [
        { path: '/', component: HomeB },
        { path: '/about', component: AboutB }
      ]
    };
    
    return routes[prefix] || routes.default;
  }, []);
  
  return (
    <Router>
      {appConfig.map(route => (
        <Route key={route.path} {...route} />
      ))}
    </Router>
  );
};
```

### 3. 混合机制（推荐）

结合服务器端和客户端的机制：

```
┌─────────────────────────────────────────────────────────┐
│  1. 服务器端：根据子域名路由到不同的 Vite 服务器实例        │
│     - 不同的代码库                                        │
│     - 不同的环境变量                                      │
│     - 不同的构建配置                                      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  2. 客户端：根据 hostname 动态加载配置                    │
│     - 主题配置                                            │
│     - API 端点                                            │
│     - 功能开关                                            │
└─────────────────────────────────────────────────────────┘
```

## 在当前项目中的实现建议

### 方案 1：扩展 RouteMonitor 来识别子域名

```typescript
// packages/runtime-sdk/src/RouteMonitor.ts
export class RouteMonitor {
  // ... 现有代码 ...
  
  /**
   * 获取子域名前缀
   */
  private getSubdomainPrefix(): string | null {
    const hostname = window.location.hostname;
    const match = hostname.match(/^([^.]+)\.sandbox\.nocode\.sankuai\.com$/);
    return match ? match[1] : null;
  }
  
  /**
   * 处理路由变化（增强版）
   */
  private handleRouteChange(triggerType: string): void {
    const newUrl = window.location.href;
    if (newUrl === this.currentUrl) {
      return;
    }

    this.currentUrl = newUrl;
    const subdomainPrefix = this.getSubdomainPrefix();

    const routeData: RouteChangeData = {
      routerMode: this.getRouterMode(),
      routerPath: this.getRouterPath(),
      triggerType,
      subdomainPrefix, // 新增：子域名前缀
      hostname: window.location.hostname // 新增：完整主机名
    };

    this.routeHistory.push({ ...routeData });
    this.messageBridge.send('route.change', routeData);
  }
}
```

### 方案 2：在 Demo App 中实现基于前缀的配置

```jsx
// packages/demo-app/src/App.jsx
import { useMemo } from 'react';

const App = () => {
  // 根据 URL 前缀获取配置
  const appConfig = useMemo(() => {
    const hostname = window.location.hostname;
    const prefix = hostname.split('.')[0];
    
    const configs = {
      'mttf3dq7wrg9on': {
        title: '应用实例 A',
        primaryColor: '#3b82f6',
        showFeatureA: true,
        showFeatureB: false
      },
      'mteyg1wky8uqgs': {
        title: '应用实例 B',
        primaryColor: '#10b981',
        showFeatureA: false,
        showFeatureB: true
      }
    };
    
    return configs[prefix] || configs.default;
  }, []);
  
  // ... 使用 appConfig 渲染不同的内容
};
```

## 检测当前页面的前缀

可以在浏览器控制台中运行以下代码来检测：

```javascript
// 检测当前页面的子域名前缀
function detectSubdomainPrefix() {
  const hostname = window.location.hostname;
  const match = hostname.match(/^([^.]+)\.sandbox\.nocode\.sankuai\.com$/);
  
  if (match) {
    const prefix = match[1];
    console.log('检测到子域名前缀:', prefix);
    console.log('完整 URL:', window.location.href);
    console.log('主机名:', hostname);
    return prefix;
  } else {
    console.log('未匹配到预期的子域名格式');
    return null;
  }
}

detectSubdomainPrefix();
```

## 总结

不同 URL 前缀渲染不同内容的机制主要有以下几种：

1. **服务器端路由**（最常见）
   - 通过 Nginx/负载均衡器根据子域名路由到不同的后端服务
   - 每个子域名对应一个独立的 Vite 服务器实例
   - 不同的实例运行不同的代码或配置

2. **客户端判断**（可选）
   - 通过 `window.location.hostname` 提取子域名前缀
   - 根据前缀动态加载不同的配置、主题、路由等

3. **混合机制**（推荐）
   - 服务器端负责路由到不同的应用实例
   - 客户端根据 hostname 进行细粒度的配置调整

在实际的 `sandbox.nocode.sankuai.com` 环境中，最可能使用的是**服务器端路由机制**，即通过反向代理将不同的子域名路由到不同的 Vite 开发服务器实例，每个实例运行不同的应用代码。
