# 如何判断页面运行在 Vite 开发模式下

## 为什么远程域名也可以运行开发模式？

**关键点**：Vite 开发模式 ≠ 本地开发

Vite 开发服务器可以部署在任何地方：
- ✅ 本地：`localhost:5174`
- ✅ 内网服务器：`192.168.1.100:5174`
- ✅ 远程服务器：`sandbox.nocode.sankuai.com`
- ✅ 容器环境：Docker/K8s 中的服务

只要服务器运行了 `vite dev` 命令，就可以通过任何域名/IP 访问。

## 判断方法

### 方法 1：检查 HTML 源码

#### ✅ 开发模式特征

```html
<!-- 1. Vite 客户端 -->
<script type="module" src="/@vite/client"></script>

<!-- 2. React Refresh -->
<script type="module">
import RefreshRuntime from "/@react-refresh"
RefreshRuntime.injectIntoGlobalHook(window)
window.$RefreshReg$ = () => {}
window.$RefreshSig$ = () => (type) => type
window.__vite_plugin_react_preamble_installed__ = true
</script>

<!-- 3. 直接加载 JSX 文件 -->
<script type="module" src="/src/main.jsx"></script>
```

#### ❌ 生产模式特征

```html
<!-- 构建后的文件 -->
<script type="module" src="/assets/main-abc123.js"></script>
<!-- 或者 -->
<script src="/assets/main-abc123.js"></script>
```

### 方法 2：检查网络请求

#### 开发模式典型请求

```
GET /@vite/client => 200
GET /@react-refresh => 200
GET /src/main.jsx => 200
GET /src/App.jsx => 200
GET /node_modules/.vite/deps/react.js => 200
GET /hmr-client.js => 200
```

#### 生产模式典型请求

```
GET /assets/main-abc123.js => 200
GET /assets/vendor-def456.js => 200
GET /assets/index-ghi789.css => 200
```

**关键区别**：
- 开发模式：`/src/` 路径，`.jsx` 扩展名
- 生产模式：`/assets/` 或 `/dist/` 路径，`.js` 扩展名，带 hash

### 方法 3：检查浏览器控制台

#### 开发模式

```javascript
// 在浏览器控制台执行
console.log(window.__vite_plugin_react_preamble_installed__); 
// => true

console.log(typeof window.$RefreshReg$); 
// => "function"

// 检查是否有 Vite HMR WebSocket
console.log(document.querySelector('script[src*="@vite/client"]'));
// => <script> 元素
```

#### 生产模式

```javascript
console.log(window.__vite_plugin_react_preamble_installed__); 
// => undefined

console.log(typeof window.$RefreshReg$); 
// => "undefined"
```

### 方法 4：检查响应头

#### 开发模式响应头

```
HTTP/1.1 200 OK
Content-Type: application/javascript
X-SourceMap: /src/main.jsx.map
Cache-Control: no-cache, no-store, must-revalidate
```

#### 生产模式响应头

```
HTTP/1.1 200 OK
Content-Type: application/javascript
Cache-Control: public, max-age=31536000, immutable
ETag: "abc123"
```

### 方法 5：检查文件路径模式

#### 开发模式路径特征

- ✅ `/src/` 开头的路径
- ✅ `.jsx` 或 `.tsx` 扩展名
- ✅ `/node_modules/.vite/deps/` 依赖路径
- ✅ `/@vite/` 特殊路径

#### 生产模式路径特征

- ✅ `/assets/` 或 `/dist/` 开头的路径
- ✅ `.js` 扩展名（无 `.jsx`）
- ✅ 文件名带 hash：`main-abc123.js`
- ✅ 无 `/@vite/` 路径

## 自动化检测脚本

### 浏览器控制台检测

```javascript
function isViteDevMode() {
  const checks = {
    // 1. 检查 Vite 客户端
    hasViteClient: !!document.querySelector('script[src*="@vite/client"]'),
    
    // 2. 检查 React Refresh
    hasReactRefresh: typeof window.$RefreshReg$ !== 'undefined',
    
    // 3. 检查 Vite 全局变量
    hasVitePreamble: window.__vite_plugin_react_preamble_installed__ === true,
    
    // 4. 检查是否有 JSX 文件请求
    hasJSXFiles: Array.from(document.querySelectorAll('script[type="module"]'))
      .some(s => s.src && (s.src.includes('.jsx') || s.src.includes('/src/'))),
    
    // 5. 检查是否有 HMR 客户端
    hasHMRClient: !!document.querySelector('script[src*="hmr"]'),
    
    // 6. 检查依赖路径
    hasViteDeps: Array.from(document.querySelectorAll('script[type="module"]'))
      .some(s => s.src && s.src.includes('/node_modules/.vite/deps/'))
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  const isDev = score >= 3; // 至少满足 3 个条件
  
  return {
    isDevMode: isDev,
    confidence: `${score}/6`,
    checks
  };
}

// 使用
const result = isViteDevMode();
console.log('是否开发模式:', result.isDevMode);
console.log('置信度:', result.confidence);
console.log('详细检查:', result.checks);
```

### Node.js 检测脚本

```javascript
async function detectViteMode(url) {
  const checks = {
    hasViteClient: false,
    hasJSXFiles: false,
    hasReactRefresh: false
  };
  
  try {
    // 1. 获取 HTML
    const htmlResponse = await fetch(url);
    const html = await htmlResponse.text();
    
    // 2. 检查 HTML 内容
    checks.hasViteClient = html.includes('@vite/client');
    checks.hasReactRefresh = html.includes('@react-refresh');
    checks.hasJSXFiles = html.includes('.jsx') || html.includes('/src/');
    
    // 3. 尝试访问 Vite 端点
    const viteClientResponse = await fetch(new URL('/@vite/client', url));
    checks.hasViteClient = viteClientResponse.ok;
    
  } catch (error) {
    console.error('检测失败:', error);
  }
  
  const isDev = Object.values(checks).some(Boolean);
  return { isDevMode: isDev, checks };
}
```

## 实际案例：sandbox.nocode.sankuai.com

### 检测结果

从该页面的实际请求可以看到：

```javascript
// ✅ 开发模式特征
GET /@vite/client => 200                    // Vite 客户端
GET /@react-refresh => 200                  // React Refresh
GET /src/main.jsx => 200                    // JSX 文件
GET /src/App.jsx => 200                     // JSX 文件
GET /node_modules/.vite/deps/react.js => 200 // Vite 依赖
GET /hmr-client.js => 200                   // HMR 客户端
```

**结论**：✅ 该页面运行在 Vite 开发模式下

### 为什么远程域名可以运行开发模式？

1. **服务器配置**
   ```bash
   # 服务器上运行
   vite dev --host 0.0.0.0 --port 5174
   ```

2. **反向代理**
   ```
   sandbox.nocode.sankuai.com 
   → Nginx/负载均衡器 
   → Vite 开发服务器 (内网)
   ```

3. **容器部署**
   ```yaml
   # Docker/K8s 中运行 Vite 开发服务器
   # 通过 Service/Ingress 暴露
   ```

## 快速判断清单

### ✅ 开发模式（满足任意 3 项）

- [ ] HTML 中有 `@vite/client` 脚本
- [ ] HTML 中有 `@react-refresh` 脚本
- [ ] 网络请求中有 `.jsx` 文件
- [ ] 网络请求中有 `/src/` 路径
- [ ] 网络请求中有 `/@vite/` 路径
- [ ] 网络请求中有 `/node_modules/.vite/deps/` 路径
- [ ] `window.__vite_plugin_react_preamble_installed__ === true`

### ❌ 生产模式（满足任意 2 项）

- [ ] 网络请求都是 `/assets/` 或 `/dist/` 路径
- [ ] 文件扩展名都是 `.js`（无 `.jsx`）
- [ ] 文件名带 hash：`main-abc123.js`
- [ ] 无 `/@vite/` 相关请求
- [ ] 响应头有 `Cache-Control: public, max-age=...`

## 实际检测结果

### 对 sandbox.nocode.sankuai.com 的检测

使用检测脚本对该页面进行检测，结果如下：

```javascript
{
  isDevMode: true,
  confidence: "6/6 (100%)",
  checks: {
    hasViteClient: true,        // ✅ 有 Vite 客户端
    hasReactRefresh: true,      // ✅ 有 React Refresh
    hasJSXFiles: true,          // ✅ 有 JSX 文件
    hasVitePreamble: true,       // ✅ 有 Vite 全局变量
    hasRefreshReg: true,         // ✅ 有 Refresh 函数
    hasHMRClient: true          // ✅ 有 HMR 客户端
  },
  sampleScripts: [
    "inline",
    "/@vite/client",
    "/hmr-client.js"
  ]
}
```

**结论**：✅ 该页面 100% 运行在 Vite 开发模式下

## 总结

### 判断页面是否运行在 Vite 开发模式下的关键指标：

1. **HTML 源码**：包含 `@vite/client` 和 `@react-refresh`
2. **网络请求**：直接请求 `.jsx` 文件和 `/src/` 路径
3. **全局变量**：`window.__vite_plugin_react_preamble_installed__` 存在
4. **文件路径**：`/node_modules/.vite/deps/` 依赖路径
5. **HMR 客户端**：有 `hmr-client.js` 文件

### 远程域名也可以运行开发模式的原因：

1. **Vite 开发服务器可以部署在任何地方**
   ```bash
   # 服务器上运行
   vite dev --host 0.0.0.0 --port 5174
   ```

2. **通过反向代理暴露**
   ```
   sandbox.nocode.sankuai.com 
   → Nginx/负载均衡器 
   → Vite 开发服务器 (内网)
   ```

3. **容器化部署**
   ```yaml
   # Docker/K8s 中运行 Vite 开发服务器
   # 通过 Service/Ingress 暴露
   ```

4. **沙箱环境特性**
   - 沙箱环境通常需要实时预览
   - 开发模式便于快速迭代
   - 支持热更新，提升开发体验

### 快速检测脚本（浏览器控制台）

```javascript
// 复制到浏览器控制台执行
function isViteDevMode() {
  const scripts = Array.from(document.querySelectorAll('script'));
  const moduleScripts = Array.from(document.querySelectorAll('script[type="module"]'));
  
  const checks = {
    hasViteClient: scripts.some(s => s.src?.includes('@vite/client')),
    hasReactRefresh: scripts[0]?.textContent?.includes('@react-refresh'),
    hasJSXFiles: moduleScripts.some(s => s.src?.includes('.jsx') || s.src?.includes('/src/')),
    hasVitePreamble: window.__vite_plugin_react_preamble_installed__ === true,
    hasRefreshReg: typeof window.$RefreshReg$ === 'function',
    hasHMRClient: scripts.some(s => s.src?.includes('hmr'))
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  return {
    isDevMode: score >= 3,
    confidence: `${score}/6`,
    checks
  };
}

console.log(isViteDevMode());
```
