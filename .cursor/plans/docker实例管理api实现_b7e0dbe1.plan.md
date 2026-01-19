---
name: Docker实例管理API实现
overview: 在 packages/node-sdk 中实现完整的 Docker 实例管理功能，包括通过 API 创建、删除、启动、停止实例，以及代理配置管理和外部域名支持。
todos:
  - id: create-services
    content: 创建服务层：instance.ts（实例管理）、docker.ts（Docker操作）、config.ts（配置管理）
    status: pending
  - id: create-controller
    content: 创建实例管理控制器 instance.ts，实现 CRUD 和启动/停止接口
    status: pending
    dependencies:
      - create-services
  - id: update-router
    content: 更新 router.ts，添加实例管理路由
    status: pending
    dependencies:
      - create-controller
  - id: add-config
    content: 在 config.default.ts 中添加实例管理相关配置项
    status: pending
  - id: implement-prefix-generator
    content: 实现前缀生成工具函数，支持自动生成和验证
    status: pending
  - id: implement-docker-operations
    content: 实现 Docker 操作封装（启动、停止、检查状态），支持 Docker Compose
    status: pending
  - id: implement-config-management
    content: 实现配置文件读写（.instances.json 和 subdomain-proxy.json）
    status: pending
  - id: add-error-handling
    content: 添加错误处理和日志记录，确保操作安全可靠
    status: pending
    dependencies:
      - create-services
      - create-controller
  - id: create-nginx-config
    content: 创建 Nginx 配置文件，支持外部域名 *.sandbox.aie.sankuai.com 的反向代理
    status: pending
  - id: update-proxy-server
    content: 更新 subdomain-proxy.js 支持外部域名或集成到 Nginx
    status: pending
---

# Docker 实例管理 API 实现方案

## 架构设计

### 1. 核心功能模块

#### 1.1 实例管理服务 (`app/service/instance.ts`)

- `createInstance(options)`: 创建新实例
  - 生成或验证前缀
  - 自动分配端口（从 5174 开始递增，检查端口占用）
  - 更新 `.instances.json`
  - 更新 `config/subdomain-proxy.json`
  - 生成 Docker Compose 配置
  - 启动 Docker 容器
  - 重载代理服务器
- `deleteInstance(prefix)`: 删除实例
  - 停止并删除 Docker 容器
  - 从配置文件中移除
  - 重新生成 Docker Compose
  - 重载代理服务器
- `listInstances()`: 列出所有实例
- `getInstance(prefix)`: 获取实例详情
- `startInstance(prefix)`: 启动实例
- `stopInstance(prefix)`: 停止实例

#### 1.2 Docker 操作服务 (`app/service/docker.ts`)

- `execDockerCommand(command)`: 执行 Docker 命令
- `checkPortAvailable(port)`: 检查端口是否可用
- `generateDockerCompose()`: 生成 Docker Compose 配置（复用现有脚本逻辑）
- `reloadProxy()`: 重载代理服务器（发送 SIGHUP）

#### 1.3 配置管理服务 (`app/service/config.ts`)

- `loadInstancesConfig()`: 读取 `.instances.json`
- `saveInstancesConfig(data)`: 保存 `.instances.json`
- `loadProxyConfig()`: 读取 `config/subdomain-proxy.json`
- `updateProxyConfig(routes)`: 更新代理配置
- `generatePrefix(length)`: 生成随机前缀（复用现有逻辑）

#### 1.4 API 控制器 (`app/controller/instance.ts`)

- `POST /api/instances`: 创建实例
- `DELETE /api/instances/:prefix`: 删除实例
- `GET /api/instances`: 列出所有实例
- `GET /api/instances/:prefix`: 获取实例详情
- `POST /api/instances/:prefix/start`: 启动实例
- `POST /api/instances/:prefix/stop`: 停止实例

### 2. 路由配置

在 `app/router.ts` 中添加实例管理路由：

```typescript
router.resources('instances', '/api/instances', controller.instance);
router.post('/api/instances/:prefix/start', controller.instance.start);
router.post('/api/instances/:prefix/stop', controller.instance.stop);
```

### 3. 配置文件

#### 3.1 添加配置项 (`config/config.default.ts`)

```typescript
config.instance = {
  instancesFile: path.join(appInfo.baseDir, '../../.instances.json'),
  proxyConfigFile: path.join(appInfo.baseDir, '../../config/subdomain-proxy.json'),
  dockerComposeFile: path.join(appInfo.baseDir, '../../docker-compose.yml'),
  projectRoot: path.join(appInfo.baseDir, '../..'),
  demoAppPath: path.join(appInfo.baseDir, '../../packages/demo-app'),
  defaultPort: 5174,
  prefixLength: 16,
  subdomainDomain: 'sandbox.aie.sankuai.com', // 外部域名
};
```

### 4. 外部域名配置

#### 4.1 DNS 配置

- 配置 DNS 将 `*.sandbox.aie.sankuai.com` 解析到服务器 IP
- 使用通配符 DNS: `*.sandbox.aie.sankuai.com` -> `服务器IP`

#### 4.2 Nginx 反向代理配置

创建 `nginx/production/nginx-sandbox.conf`:

- 监听 80/443 端口
- Server name: `*.sandbox.aie.sankuai.com`
- 根据子域名前缀路由到对应的本地端口
- 支持 WebSocket（HMR）
- 支持 HTTPS（SSL 证书配置）

#### 4.3 代理服务集成

- 修改 `subdomain-proxy.js` 支持外部域名
- 或使用 Nginx 作为主反向代理，`subdomain-proxy.js` 作为备用

### 5. 实现细节

#### 5.1 端口分配逻辑

- 读取 `.instances.json` 获取已使用的端口
- 从 `nextPort` 或默认端口开始查找可用端口
- 使用 `lsof` 或 `netstat` 检查端口占用
- 分配后更新 `nextPort`

#### 5.2 前缀生成

- 默认自动生成 16 位随机字符串（小写字母+数字）
- 支持自定义前缀（需验证格式和唯一性）
- 格式验证：`^[a-z0-9]{8,}$`

#### 5.3 Docker 操作

- 使用 `child_process.exec` 执行 Docker 命令
- 或使用 Docker API（需要安装 `dockerode` 包）
- 执行 `docker compose up -d` 启动容器
- 执行 `docker compose down` 停止容器

#### 5.4 代理重载

- 查找 `subdomain-proxy.js` 进程 PID
- 发送 `SIGHUP` 信号重载配置
- 或通过 HTTP 接口重载（如果实现）

### 6. 错误处理

- 端口冲突：返回错误，建议下一个可用端口
- 前缀冲突：返回错误信息
- Docker 操作失败：记录日志，返回详细错误
- 配置文件读写失败：返回错误，确保文件权限正确

### 7. API 响应格式

统一使用 `ctx.success()` 和 `ctx.throw()`:

```typescript
// 成功
ctx.success({
  prefix: 'xxx',
  port: 5174,
  status: 'running',
  url: 'http://xxx.sandbox.aie.sankuai.com'
});

// 错误
ctx.throw(400, '前缀已存在', { code: 1002 });
```

### 8. 依赖安装

需要在 `packages/node-sdk/package.json` 中添加：

- `dockerode` (可选，用于 Docker API)
- `jq` 命令或 `node-jq` (用于 JSON 操作，或使用原生 JSON)

### 9. 文件结构

```
packages/node-sdk/app/
├── controller/
│   └── instance.ts          # 实例管理控制器
├── service/
│   ├── instance.ts          # 实例管理服务
│   ├── docker.ts            # Docker 操作服务
│   └── config.ts            # 配置管理服务
└── utils/
    └── prefix-generator.ts  # 前缀生成工具
```

### 10. 外部域名配置步骤

1. **DNS 配置**（需要运维支持）:

   - 添加 A 记录：`*.sandbox.aie.sankuai.com` -> `服务器IP`
   - 或添加 CNAME：`*.sandbox.aie.sankuai.com` -> `服务器域名`

2. **Nginx 配置**:

   - 配置 SSL 证书（如果需要 HTTPS）
   - 配置反向代理规则
   - 根据 Host 头提取子域名前缀
   - 路由到对应的本地端口

3. **防火墙配置**:

   - 确保 80/443 端口开放
   - 确保内部端口（5174+）可访问

## 实施步骤

1. 创建服务层：`instance.ts`, `docker.ts`, `config.ts`
2. 创建控制器：`instance.ts`
3. 更新路由配置
4. 添加配置文件
5. 实现前缀生成工具
6. 实现 Docker 操作封装
7. 实现配置管理
8. 添加错误处理和日志
9. 编写 API 文档
10. 配置外部域名和 Nginx

## 注意事项

- 确保 node-sdk 有权限执行 Docker 命令
- 确保有权限读写配置文件
- 端口分配需要考虑并发安全（使用文件锁）
- Docker 操作需要错误处理和超时控制
- 外部域名配置需要与运维团队协调