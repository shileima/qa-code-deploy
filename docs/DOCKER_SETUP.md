# Docker 使用指南

## 概述

本指南介绍如何使用 Docker 和 Docker Compose 部署服务器端路由系统。

## 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0
- 足够的系统资源（建议至少 2GB RAM）

## 快速开始

### 1. 构建镜像

首次运行或代码更新后，需要构建镜像：

```bash
# 构建所有服务的镜像
docker-compose build

# 仅构建某个服务
docker-compose build vite-app-1
```

### 2. 启动服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 启动并查看日志
docker-compose up

# 启动特定服务
docker-compose up -d vite-app-1 nginx
```

### 3. 查看状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务的日志
docker-compose logs -f vite-app-1
```

### 4. 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除卷
docker-compose down -v

# 停止特定服务
docker-compose stop vite-app-1
```

## Docker Compose 配置说明

### 服务配置

`docker-compose.yml` 包含以下服务：

1. **nginx**: Nginx 反向代理服务
2. **vite-app-1**: Vite 应用实例 1 (mttf3dq7wrg9on)
3. **vite-app-2**: Vite 应用实例 2 (mteyg1wky8uqgs)

### 网络配置

所有服务连接到 `render-monitor-network` 网络，实现服务间通信。

### 卷挂载

- `nginx/dev/nginx.conf`: Nginx 配置文件
- `nginx/logs`: Nginx 日志目录
- `nginx/cache`: Nginx 缓存目录
- `packages/demo-app`: 应用源代码（开发模式）

### 环境变量

每个 Vite 实例通过环境变量配置：

- `SUBDOMAIN_PREFIX`: 子域名前缀
- `PORT`: 服务端口
- `HOST`: 绑定主机（容器内使用 0.0.0.0）
- `VITE_APP_PREFIX`: Vite 应用前缀

## 开发模式

### 热重载

在开发模式下，源代码目录被挂载为卷，修改代码后自动重新编译：

```yaml
volumes:
  - ./packages/demo-app:/app
  - /app/node_modules  # 排除 node_modules
```

### 查看实时日志

```bash
# 查看所有服务的日志
docker-compose logs -f

# 查看特定服务的日志
docker-compose logs -f vite-app-1

# 查看最近 100 行日志
docker-compose logs --tail=100 vite-app-1
```

### 进入容器调试

```bash
# 进入 Vite 应用容器
docker-compose exec vite-app-1 sh

# 进入 Nginx 容器
docker-compose exec nginx sh

# 执行命令
docker-compose exec vite-app-1 pnpm install
```

## 生产模式

### 构建生产镜像

创建生产环境的 Dockerfile：

```dockerfile
# packages/demo-app/Dockerfile.prod
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 使用生产配置

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/production/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    restart: always

  vite-app-1:
    build:
      context: ./packages/demo-app
      dockerfile: Dockerfile.prod
    restart: always
    environment:
      - SUBDOMAIN_PREFIX=mttf3dq7wrg9on
```

启动生产环境：

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 数据持久化

### 日志持久化

日志目录挂载到宿主机：

```yaml
volumes:
  - ./nginx/logs:/var/log/nginx
```

### 缓存持久化

Nginx 缓存目录挂载：

```yaml
volumes:
  - ./nginx/cache:/var/cache/nginx
```

## 健康检查

每个服务都配置了健康检查：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5174/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 3
```

查看健康状态：

```bash
docker-compose ps
```

## 扩展服务

### 添加新的实例

1. 编辑 `docker-compose.yml`:

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
    networks:
      - render-monitor-network
```

2. 更新 Nginx 配置:

```bash
node scripts/generate-nginx-config.js dev
```

3. 重启服务:

```bash
docker-compose up -d
docker-compose restart nginx
```

## 故障排查

### 容器无法启动

```bash
# 查看容器日志
docker-compose logs <service-name>

# 检查容器状态
docker-compose ps

# 查看详细错误
docker-compose up --no-deps <service-name>
```

### 网络连接问题

```bash
# 检查网络
docker network ls
docker network inspect render-monitor-network

# 测试容器间连接
docker-compose exec nginx ping vite-app-1
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :5174
netstat -tulpn | grep 5174

# 修改 docker-compose.yml 中的端口映射
ports:
  - "5177:5174"  # 宿主机端口:容器端口
```

### 权限问题

```bash
# 检查文件权限
ls -la nginx/logs

# 修复权限
sudo chown -R $USER:$USER nginx/logs
```

## 性能优化

### 资源限制

为服务设置资源限制：

```yaml
services:
  vite-app-1:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 构建缓存

使用构建缓存加速构建：

```bash
# 构建时使用缓存
docker-compose build --parallel

# 不使用缓存（强制重新构建）
docker-compose build --no-cache
```

### 多阶段构建

优化镜像大小：

```dockerfile
FROM node:18-alpine AS deps
# ... 安装依赖

FROM node:18-alpine AS builder
COPY --from=deps /app/node_modules ./node_modules
# ... 构建

FROM node:18-alpine AS runner
COPY --from=builder /app/dist ./dist
# ... 运行
```

## 安全最佳实践

1. **使用非 root 用户**: 在容器中使用非 root 用户运行应用
2. **最小权限原则**: 仅挂载必要的目录
3. **定期更新镜像**: 定期更新基础镜像以获取安全补丁
4. **网络安全**: 使用 Docker 网络隔离服务
5. **密钥管理**: 使用 Docker secrets 或环境变量文件管理敏感信息

## 清理资源

### 清理未使用的资源

```bash
# 删除停止的容器
docker-compose rm

# 清理未使用的镜像
docker image prune

# 清理所有未使用的资源
docker system prune -a
```

### 重置环境

```bash
# 停止并删除所有容器、网络和卷
docker-compose down -v

# 删除所有镜像
docker-compose down --rmi all
```

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
