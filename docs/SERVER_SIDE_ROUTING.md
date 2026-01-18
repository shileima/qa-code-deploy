# 服务器端路由实现文档

## 概述

本文档介绍基于子域名的服务器端路由实现机制。通过 Nginx 反向代理，根据不同的子域名前缀将请求路由到不同的 Vite 应用实例。

## 架构设计

### 系统架构

```
┌─────────────────────────────────────────────────────────┐
│  浏览器请求                                              │
│  https://mttf3dq7wrg9on.sandbox.nocode.sankuai.com/    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  DNS 解析 / Nginx 反向代理                                │
│  根据子域名前缀路由到不同的后端服务                        │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│ Vite 实例 1  │   │ Vite 实例 2  │
│ 端口: 5174   │   │ 端口: 5175   │
│ mttf3dq7...  │   │ mteyg1w...   │
└──────────────┘   └──────────────┘
```

### 核心组件

1. **Nginx 反向代理**: 根据子域名前缀路由请求
2. **多个 Vite 实例**: 每个实例运行在不同的端口
3. **实例管理脚本**: 管理实例的启动、停止和状态查询
4. **配置生成工具**: 根据实例列表动态生成 Nginx 配置

## 快速开始

### 1. 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker（可选，用于 Nginx）
- Nginx（可选，如果不使用 Docker）

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发环境

```bash
# 方式 1: 使用启动脚本（推荐）
./scripts/dev-with-routing.sh

# 方式 2: 使用 Docker Compose
docker-compose up -d
```

### 4. 访问应用

配置 hosts 文件（如果需要）：

```bash
# /etc/hosts
127.0.0.1 mttf3dq7wrg9on.localhost
127.0.0.1 mteyg1wky8uqgs.localhost
```

然后访问：
- `http://mttf3dq7wrg9on.localhost` → Vite 实例 1（端口 5174）
- `http://mteyg1wky8uqgs.localhost` → Vite 实例 2（端口 5175）

## 配置说明

### 环境变量

复制 `.env.example` 为 `.env.dev` 并根据需要修改：

```bash
cp .env.example .env.dev
```

主要配置项：

- `SUBDOMAIN_PREFIXES`: 子域名前缀列表，逗号分隔
- `DEFAULT_PORT`: 默认端口（第一个实例）
- `PORT_START` / `PORT_END`: 端口范围（用于动态分配）
- `USE_DOCKER`: 是否使用 Docker 运行 Nginx
- `NGINX_CONFIG_PATH`: Nginx 配置文件路径

### Nginx 配置

开发环境配置：`nginx/dev/nginx.conf`
生产环境配置：`nginx/production/nginx.conf`

#### 动态路由映射

Nginx 使用 `map` 指令实现动态路由：

```nginx
map $host $backend_port {
    default 5174;
    ~^mttf3dq7wrg9on\. 5174;
    ~^mteyg1wky8uqgs\. 5175;
}
```

#### WebSocket 支持

配置支持 WebSocket（用于 Vite HMR）：

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
```

## 实例管理

### 添加实例

```bash
# 使用管理脚本
./scripts/manage-instances.sh add <prefix> [port]

# 示例
./scripts/manage-instances.sh add new-prefix 5176
```

### 启动/停止实例

```bash
# 启动实例
./scripts/manage-instances.sh start <prefix>

# 停止实例
./scripts/manage-instances.sh stop <prefix>

# 列出所有实例
./scripts/manage-instances.sh list

# 查询实例状态
./scripts/manage-instances.sh status <prefix>
```

### 删除实例

```bash
./scripts/manage-instances.sh remove <prefix>
```

## 配置生成

### 自动生成 Nginx 配置

根据实例列表生成 Nginx 配置：

```bash
# 生成开发环境配置
node scripts/generate-nginx-config.js dev

# 生成生产环境配置
node scripts/generate-nginx-config.js prod

# 指定输出文件
node scripts/generate-nginx-config.js dev nginx/custom.conf
```

### 实例注册

实例启动时自动注册到注册表：

```bash
# 注册实例
node scripts/register-instance.js register <prefix> <port> [host]

# 健康检查
node scripts/register-instance.js health <prefix> <port>

# 列出所有注册的实例
node scripts/register-instance.js list
```

## 生产环境部署

### 1. 准备工作

- 确保所有实例已配置
- 生成生产环境 Nginx 配置
- 配置 SSL 证书

### 2. 生成配置

```bash
node scripts/generate-nginx-config.js prod nginx/production/nginx.conf
```

### 3. 配置 SSL

将 SSL 证书放置到指定位置：

```bash
mkdir -p /etc/nginx/ssl
cp your-cert.pem /etc/nginx/ssl/cert.pem
cp your-key.pem /etc/nginx/ssl/key.pem
```

### 4. 验证配置

```bash
nginx -t -c nginx/production/nginx.conf
```

### 5. 启动服务

```bash
# 启动所有 Vite 实例
./scripts/manage-instances.sh start <prefix1>
./scripts/manage-instances.sh start <prefix2>

# 启动 Nginx
nginx -c /path/to/nginx/production/nginx.conf
```

## Docker 部署

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

### 自定义配置

编辑 `docker-compose.yml` 添加更多实例：

```yaml
services:
  vite-app-3:
    build:
      context: ./packages/demo-app
    environment:
      - SUBDOMAIN_PREFIX=new-prefix
      - PORT=5176
    ports:
      - "5176:5176"
```

然后更新 Nginx 配置并重启：

```bash
node scripts/generate-nginx-config.js dev
docker-compose restart nginx
```

## 故障排查

### 问题 1: 端口被占用

**症状**: 实例启动失败，提示端口被占用

**解决方案**:

```bash
# 检查端口占用
lsof -i :5174

# 停止占用端口的进程
kill -9 <PID>
```

### 问题 2: Nginx 配置错误

**症状**: Nginx 启动失败

**解决方案**:

```bash
# 检查配置语法
nginx -t -c nginx/dev/nginx.conf

# 查看错误日志
tail -f nginx/logs/error.log
```

### 问题 3: 路由不生效

**症状**: 访问子域名时返回 502 或 503

**解决方案**:

1. 检查实例是否运行：`./scripts/manage-instances.sh list`
2. 检查 Nginx 日志：`tail -f nginx/logs/access.log`
3. 验证 hosts 文件配置
4. 检查防火墙设置

### 问题 4: WebSocket 连接失败（HMR 不工作）

**症状**: Vite HMR 不生效

**解决方案**:

确保 Nginx 配置包含 WebSocket 支持：

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
```

## 性能优化

### 1. 静态资源缓存

在生产环境配置静态资源缓存：

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    proxy_cache static_cache;
    proxy_cache_valid 200 1h;
    expires 1h;
}
```

### 2. 压缩配置

启用 Gzip 压缩：

```nginx
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. 连接池

使用 upstream 配置连接池：

```nginx
upstream vite_app {
    server localhost:5174;
    keepalive 32;
}
```

## 安全考虑

1. **SSL/TLS**: 生产环境必须使用 HTTPS
2. **访问控制**: 使用防火墙限制访问
3. **日志审计**: 定期检查访问日志
4. **实例隔离**: 确保不同实例之间隔离

## 扩展功能

### 负载均衡

可以在多个后端实例之间进行负载均衡：

```nginx
upstream vite_app_5174 {
    server localhost:5174;
    server localhost:5184;
    keepalive 32;
}
```

### 健康检查

实现自动健康检查：

```bash
# 定期执行健康检查
while true; do
    ./scripts/manage-instances.sh status <prefix>
    sleep 30
done
```

### 自动重启

使用进程管理工具（如 PM2）实现自动重启：

```bash
pm2 start scripts/start-instance.sh --name "vite-app-1" -- mttf3dq7wrg9on 5174
```

## 参考资源

- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Vite 开发服务器配置](https://vitejs.dev/config/server-options.html)
- [Docker Compose 文档](https://docs.docker.com/compose/)

## 常见问题

**Q: 如何添加新的子域名前缀？**

A: 使用 `./scripts/manage-instances.sh add <prefix> [port]` 添加实例，然后重新生成 Nginx 配置。

**Q: 可以动态添加实例吗？**

A: 可以，使用管理脚本添加实例后，需要重新生成 Nginx 配置并重启 Nginx。

**Q: 生产环境如何更新配置？**

A: 生成新的配置文件，验证后重启 Nginx：`nginx -s reload`
