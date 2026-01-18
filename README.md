# 渲染监控系统

一个完整的渲染监控系统，用于监控和展示 React 应用的渲染状态、路由变化和错误信息。

## 项目结构

```
render-monitor-system/
├── packages/
│   ├── runtime-sdk/          # 运行时 SDK（在 iframe 中运行）
│   ├── dev-tool/             # 开发工具（父窗口）
│   └── demo-app/             # Demo React 应用
```

## 功能特性

- ✅ DOM 渲染监控（MutationObserver）
- ✅ 路由变化监听（Hash/History 模式）
- ✅ 错误捕获和上报
- ✅ 实时控制台输出
- ✅ 渲染状态可视化
- ✅ 路由历史记录

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

同时启动开发工具和 Demo 应用：

```bash
pnpm dev
```

或者分别启动：

```bash
# 启动开发工具（默认端口 5173）
pnpm dev:tool

# 启动 Demo 应用（默认端口 5174）
pnpm dev:app
```

### 构建

```bash
# 构建所有包
pnpm build

# 仅构建 SDK
pnpm build:sdk
```

## 使用说明

### 安装依赖

```bash
pnpm install
```

### 开发模式

1. **构建运行时 SDK**（首次运行或 SDK 代码变更后）：
   ```bash
   pnpm build:sdk
   ```

2. **启动开发工具和 Demo 应用**：
   ```bash
   pnpm dev
   ```
   
   或者分别启动：
   ```bash
   # 终端 1：启动开发工具（端口 5173）
   pnpm dev:tool
   
   # 终端 2：启动 Demo 应用（端口 5174）
   pnpm dev:app
   ```

3. **访问开发工具**：
   - 打开浏览器访问 `http://localhost:5173`
   - 开发工具会自动在 iframe 中加载 Demo 应用（`http://localhost:5174`）

4. **查看监控信息**：
   右侧面板会实时显示：
   - **状态面板**：渲染状态、加载时间、路由信息
   - **路由面板**：当前路由、路由历史记录
   - **控制台面板**：console 输出（log、error 等）
   - **错误面板**：错误列表和堆栈信息

### 测试功能

在 Demo 应用中可以测试以下功能：

1. **路由导航**：点击页面上的链接，观察路由面板的变化
2. **控制台输出**：点击"测试 Console.log"和"测试 Console.error"按钮
3. **错误捕获**：点击"触发错误"按钮，观察错误面板的显示

### 构建生产版本

```bash
# 构建所有包
pnpm build

# 仅构建 SDK
pnpm build:sdk
```

## 技术栈

- **构建工具**: Vite
- **运行时 SDK**: TypeScript
- **开发工具**: React + TypeScript + Vite
- **Demo 应用**: React + Vite
- **包管理**: pnpm (workspace)
- **样式**: TailwindCSS

## 开发

### 运行时 SDK

SDK 在 iframe 中运行，负责监控应用状态并通过 `postMessage` 与父窗口通信。

### 开发工具

开发工具是父窗口，接收 SDK 发送的消息并展示在监控面板中。

### Demo 应用

示例 React 应用，用于演示监控功能。

## 线上使用

详细的使用指南请参考：

- [生产环境使用指南](./docs/PRODUCTION_USAGE.md) - 完整的线上部署方案
- [集成示例](./docs/INTEGRATION_EXAMPLE.md) - 各种框架的集成示例

### 快速开始（线上）

1. **构建 SDK**：
   ```bash
   pnpm build:sdk
   ```

2. **部署 SDK** 到 CDN 或静态服务器

3. **在应用中集成**：
   ```html
   <script src="https://your-cdn.com/render-monitor-sdk/index.js"></script>
   <script>
     const sdk = new RenderMonitorSDK({
       apiEndpoint: 'https://api.your-domain.com/monitor/report'
     });
     sdk.init();
   </script>
   ```

4. **配置后端 API** 接收监控数据

## License

MIT
