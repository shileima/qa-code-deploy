# Vite 开发服务器详解

## 是的，localhost:5174 就是一个 Vite 开发服务器

### 证据

#### 1. 启动命令

从 `packages/demo-app/package.json` 可以看到：

```json
{
  "scripts": {
    "dev": "vite --port 5174"
  }
}
```

执行 `pnpm dev` 时，实际运行的是：
```bash
vite --port 5174
```

#### 2. 运行进程

```bash
$ ps aux | grep vite
node /Users/.../vite/bin/vite.js --port 5174
```

可以看到正在运行的是 `vite/bin/vite.js`，这就是 Vite 开发服务器。

#### 3. 配置文件

`vite.config.ts` 配置了 Vite：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    cors: true
  }
});
```

#### 4. HTML 特征

`index.html` 中有典型的 Vite 开发模式特征：

```html
<script type="module" src="/src/main.jsx"></script>
```

这只有在 Vite 开发服务器中才能直接加载 `.jsx` 文件。

## Vite 开发服务器 vs 生产服务器

### 开发服务器（我们当前的 localhost:5174）

```bash
# 启动命令
vite dev
# 或
vite --port 5174
```

**特征：**
- ✅ 实时编译 JSX/TSX
- ✅ 热模块替换（HMR）
- ✅ 按需编译（不预构建所有文件）
- ✅ 源码映射（Source Maps）
- ✅ 直接加载 `/src/main.jsx`
- ✅ 提供 `/@vite/client` 端点
- ✅ 提供 `/@react-refresh` 端点

**访问端点：**
```
GET /@vite/client          # Vite HMR 客户端
GET /@react-refresh        # React 快速刷新
GET /src/main.jsx          # 实时编译 JSX
GET /node_modules/.vite/deps/react.js  # 预构建的依赖
```

### 生产服务器（构建后）

```bash
# 构建命令
vite build

# 预览构建结果
vite preview
```

**特征：**
- ❌ 不编译 JSX（已预先构建）
- ❌ 无 HMR
- ✅ 所有文件已预构建
- ✅ 代码压缩和优化
- ✅ Tree-shaking
- ✅ 代码分割

**访问端点：**
```
GET /assets/main-abc123.js  # 构建后的文件
GET /assets/vendor-def456.js
GET /index.html
```

## 如何验证是 Vite 服务器？

### 方法 1：检查响应头

```bash
curl -I http://localhost:5174/@vite/client
```

如果返回 200，说明是 Vite 开发服务器。

### 方法 2：检查 HTML

访问 `http://localhost:5174`，查看源码：

```html
<!-- 如果有这些，就是 Vite 开发服务器 -->
<script type="module" src="/@vite/client"></script>
<script type="module" src="/src/main.jsx"></script>
```

### 方法 3：检查进程

```bash
ps aux | grep vite
```

如果看到 `vite/bin/vite.js` 进程，就是 Vite 服务器。

### 方法 4：访问 Vite 端点

在浏览器中访问：
- `http://localhost:5174/@vite/client` - 应该返回 JavaScript 代码
- `http://localhost:5174/src/main.jsx` - 应该返回编译后的代码

## Vite 开发服务器的工作流程

```
1. 启动 Vite 开发服务器
   vite --port 5174
   ↓
2. 监听文件变化
   - 监听 src/ 目录
   - 监听配置文件
   ↓
3. 接收浏览器请求
   GET /src/main.jsx
   ↓
4. 实时编译
   - JSX → JavaScript
   - TypeScript → JavaScript
   - 处理 import/export
   ↓
5. 返回编译结果
   - 添加 HMR 代码
   - 添加源码映射
   ↓
6. 浏览器执行
   - 解析 ES 模块
   - 执行代码
   - 建立 WebSocket 连接（HMR）
```

## 与 sandbox.nocode.sankuai.com 的对比

### 相同点

两者都是 Vite 开发服务器：

| 特征 | localhost:5174 | sandbox.nocode.sankuai.com |
|------|----------------|---------------------------|
| Vite 客户端 | ✅ `/@vite/client` | ✅ `/@vite/client` |
| React Refresh | ✅ `/@react-refresh` | ✅ `/@react-refresh` |
| JSX 文件 | ✅ `/src/main.jsx` | ✅ `/src/main.jsx` |
| HMR | ✅ 支持 | ✅ 支持 |
| 实时编译 | ✅ 是 | ✅ 是 |

### 不同点

| 特性 | localhost:5174 | sandbox.nocode.sankuai.com |
|------|----------------|---------------------------|
| **部署位置** | 本地机器 | 远程服务器 |
| **访问方式** | 直接访问 | 通过域名/反向代理 |
| **网络** | 本地回环 | 公网/内网 |
| **用途** | 本地开发 | 沙箱预览 |

## 总结

### ✅ 是的，localhost:5174 就是 Vite 开发服务器

**证据：**
1. 启动命令：`vite --port 5174`
2. 运行进程：`vite/bin/vite.js`
3. 配置文件：`vite.config.ts`
4. HTML 特征：直接加载 `.jsx` 文件
5. 端点访问：`/@vite/client` 可用

**功能：**
- 实时编译 JSX/TSX
- 热模块替换（HMR）
- 按需编译
- 源码映射

**与远程 Vite 服务器的关系：**
- 本质相同：都是 Vite 开发服务器
- 部署位置不同：本地 vs 远程
- 访问方式不同：localhost vs 域名

所以，`localhost:5174` 和 `sandbox.nocode.sankuai.com` 都是 Vite 开发服务器，只是部署位置和访问方式不同！
