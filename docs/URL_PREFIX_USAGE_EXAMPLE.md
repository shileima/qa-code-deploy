# URL 前缀配置使用示例

## 概述

本示例展示了如何根据不同的 URL 前缀（子域名）来渲染不同的页面内容。当访问不同的子域名时，应用会自动加载对应的配置，包括主题、功能开关、API 端点等。

## 实现机制

### 1. URL 前缀提取

系统会自动从 `window.location.hostname` 中提取子域名前缀：

```javascript
// 例如：https://mttf3dq7wrg9on.sandbox.nocode.sankuai.com/
// 提取的前缀：mttf3dq7wrg9on
```

### 2. 配置映射

在 `packages/demo-app/src/utils/urlConfig.js` 中定义了不同前缀对应的配置：

```javascript
const APP_CONFIGS = {
  'mttf3dq7wrg9on': {
    appName: '应用实例 A',
    theme: { primaryColor: '#3b82f6' },
    features: { showFeatureA: true }
  },
  'mteyg1wky8uqgs': {
    appName: '应用实例 B',
    theme: { primaryColor: '#10b981' },
    features: { showFeatureB: true }
  }
};
```

### 3. 自动应用

在应用启动时（`App.jsx`），会自动调用 `initAppConfig()` 来：
- 检测当前 URL 前缀
- 加载对应的配置
- 应用主题（设置 CSS 变量）
- 设置页面标题

## 使用方法

### 在组件中使用配置

```jsx
import { useAppConfig } from '../utils/urlConfig';

const MyComponent = () => {
  const { prefix, config, isPrefix } = useAppConfig();
  
  return (
    <div>
      <h1 style={{ color: config.theme.primaryColor }}>
        {config.appName}
      </h1>
      
      {config.features.showFeatureA && (
        <div>功能 A 的内容</div>
      )}
      
      {isPrefix('mttf3dq7wrg9on') && (
        <div>仅实例 A 显示的内容</div>
      )}
    </div>
  );
};
```

### 直接获取配置

```javascript
import { getAppConfig, getCurrentSubdomainPrefix } from './utils/urlConfig';

// 获取当前前缀
const prefix = getCurrentSubdomainPrefix(); // 'mttf3dq7wrg9on' 或 null

// 获取配置
const config = getAppConfig(); // 自动使用当前前缀
const configA = getAppConfig('mttf3dq7wrg9on'); // 指定前缀
```

### 手动应用主题

```javascript
import { applyThemeConfig, getAppConfig } from './utils/urlConfig';

// 应用当前配置的主题
applyThemeConfig();

// 应用指定配置的主题
const config = getAppConfig('mttf3dq7wrg9on');
applyThemeConfig(config);
```

## 配置项说明

### 主题配置

```javascript
theme: {
  primaryColor: '#3b82f6',      // 主色调
  secondaryColor: '#60a5fa',    // 次要色调
  backgroundColor: '#ffffff'     // 背景色
}
```

这些颜色会自动设置为 CSS 变量：
- `--primary-color`
- `--secondary-color`
- `--background-color`

### 功能开关

```javascript
features: {
  showFeatureA: true,   // 是否显示功能 A
  showFeatureB: false,  // 是否显示功能 B
  showFeatureC: true    // 是否显示功能 C
}
```

### API 配置

```javascript
apiEndpoint: 'https://api-a.example.com'
```

### 分析配置

```javascript
analytics: {
  enabled: true,
  trackingId: 'UA-APP-A-001'
}
```

## 实际效果

### 访问不同的 URL

1. **访问 `https://mttf3dq7wrg9on.sandbox.nocode.sankuai.com/`**
   - 应用名称：应用实例 A
   - 主色调：蓝色 (#3b82f6)
   - 显示功能 A 和功能 C
   - API 端点：https://api-a.example.com

2. **访问 `https://mteyg1wky8uqgs.sandbox.nocode.sankuai.com/`**
   - 应用名称：应用实例 B
   - 主色调：绿色 (#10b981)
   - 显示功能 B
   - API 端点：https://api-b.example.com

3. **访问其他 URL（如 localhost）**
   - 使用默认配置
   - 主色调：紫色 (#6366f1)
   - 显示所有功能

## 调试

### 在浏览器控制台查看配置

```javascript
// 查看当前配置
console.log(window.__APP_CONFIG__);

// 输出示例：
// {
//   prefix: 'mttf3dq7wrg9on',
//   config: { appName: '应用实例 A', ... },
//   timestamp: 1234567890
// }
```

### 检测当前前缀

```javascript
import { getCurrentSubdomainPrefix } from './utils/urlConfig';

const prefix = getCurrentSubdomainPrefix();
console.log('当前前缀:', prefix);
```

## 扩展配置

### 添加新的前缀配置

在 `urlConfig.js` 的 `APP_CONFIGS` 对象中添加：

```javascript
const APP_CONFIGS = {
  // ... 现有配置 ...
  
  'new-prefix': {
    appName: '新应用实例',
    appId: 'app-new',
    theme: {
      primaryColor: '#f59e0b',
      secondaryColor: '#fbbf24',
      backgroundColor: '#fffbeb'
    },
    features: {
      showFeatureA: true,
      showFeatureB: true,
      showFeatureC: false
    },
    apiEndpoint: 'https://api-new.example.com',
    analytics: {
      enabled: true,
      trackingId: 'UA-APP-NEW-001'
    }
  }
};
```

### 添加新的配置项

```javascript
const APP_CONFIGS = {
  'mttf3dq7wrg9on': {
    // ... 现有配置 ...
    
    // 新增配置项
    customSettings: {
      maxItems: 100,
      enableCache: true,
      cacheTimeout: 30000
    },
    branding: {
      logo: 'https://example.com/logo-a.png',
      favicon: 'https://example.com/favicon-a.ico'
    }
  }
};
```

## 与服务器端路由结合

这个客户端配置机制可以与服务器端路由结合使用：

1. **服务器端**：根据子域名路由到不同的 Vite 服务器实例
2. **客户端**：根据 hostname 进行细粒度的配置调整

这样既保证了不同实例的代码隔离，又提供了灵活的配置管理。

## 注意事项

1. **安全性**：客户端配置不应包含敏感信息（如 API 密钥）
2. **性能**：配置对象应该尽量小，避免影响加载性能
3. **兼容性**：确保在无法提取前缀时（如本地开发）有默认配置
4. **维护性**：定期检查配置，确保所有前缀都有对应的配置

## 总结

通过 URL 前缀配置机制，可以实现：
- ✅ 根据不同的子域名显示不同的内容
- ✅ 动态应用不同的主题
- ✅ 控制功能开关
- ✅ 配置不同的 API 端点
- ✅ 灵活扩展新的配置项

这个机制特别适合多租户应用、A/B 测试、环境隔离等场景。
