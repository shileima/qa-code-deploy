# Docker 使用指南

## 📋 配置说明

### 实例配置

**实例 1**：
- 容器内监听端口：`5174`
- 宿主机端口：`5174`
- 子域名：`mteyg1wky8uqgs.localhost`
- 主题：绿色（应用实例 B）

**实例 2**：
- 容器内监听端口：`5174`
- 宿主机端口：`5175`（映射到容器内 5174）
- 子域名：`mttf3dq7wrg9on.localhost`
- 主题：蓝色（应用实例 A）

## 🚀 启动方式

### 方式 1: 使用启动脚本（推荐）

```bash
./start-docker.sh
```

该脚本会自动：
1. 配置 hosts 文件
2. 停止现有容器
3. 构建并启动 Docker 容器
4. 检查服务状态

### 方式 2: 手动启动

```bash
# 1. 配置 hosts 文件
./setup-subdomain.sh

# 2. 启动 Docker 容器
docker compose up -d --build

# 3. 启动代理服务器（用于子域名路由）
./start-proxy-80.sh
# 或者使用 8080 端口
node scripts/subdomain-proxy.js
```

## 🌐 访问地址

### 通过子域名访问（需要代理服务器）

```bash
# 实例 1 (绿色主题)
http://mteyg1wky8uqgs.localhost/

# 实例 2 (蓝色主题)
http://mttf3dq7wrg9on.localhost/
```

### 直接访问端口

```bash
# 实例 1
http://localhost:5174

# 实例 2
http://localhost:5175
```

## 📊 查看日志

```bash
# 查看所有容器日志
docker compose logs -f

# 查看特定容器日志
docker compose logs -f vite-app-1
docker compose logs -f vite-app-2
```

## 🛑 停止服务

```bash
# 停止所有容器
docker compose down

# 停止并删除卷
docker compose down -v

# 停止容器并删除网络
docker compose down --remove-orphans
```

## 🔍 检查服务状态

```bash
# 查看容器状态
docker compose ps

# 查看容器详细信息
docker ps

# 检查端口占用
netstat -an | grep -E "5174|5175"
```

## ⚙️ 环境变量

容器支持以下环境变量：

- `NODE_ENV`: 运行环境（development/production）
- `SUBDOMAIN_PREFIX`: 子域名前缀（用于识别实例）
- `PORT`: 容器内监听端口（默认 5174）
- `HOST`: 监听地址（默认 0.0.0.0）
- `VITE_APP_PREFIX`: Vite 应用前缀

## 🔧 故障排查

### 问题 1: 容器无法启动

```bash
# 检查 Docker 是否运行
docker ps

# 查看详细错误日志
docker compose logs

# 重新构建镜像
docker compose build --no-cache
```

### 问题 2: 无法访问服务

```bash
# 检查端口是否被占用
lsof -i :5174
lsof -i :5175

# 检查 hosts 配置
cat /etc/hosts | grep localhost

# 检查代理服务器是否运行
lsof -i :80
lsof -i :8080
```

### 问题 3: 容器内无法访问

```bash
# 进入容器检查
docker exec -it render-monitor-app-1 sh

# 检查端口监听
netstat -tlnp

# 检查进程
ps aux
```

## 📝 说明

1. **容器内端口统一**：两个实例在容器内部都监听 `5174` 端口
2. **宿主机端口不同**：实例 1 映射到 `5174`，实例 2 映射到 `5175`
3. **子域名路由**：通过 `subdomain-proxy.js` 代理服务器实现子域名到端口的映射
4. **内容区分**：通过 `SUBDOMAIN_PREFIX` 环境变量区分不同实例的配置和主题

## 🔄 完整启动流程

```bash
# 1. 停止现有服务
./stop-services.sh

# 2. 启动 Docker 实例
./start-docker.sh

# 3. 启动代理服务器（如果使用子域名访问）
./start-proxy-80.sh

# 4. 验证访问
curl http://mteyg1wky8uqgs.localhost/
curl http://mttf3dq7wrg9on.localhost/
```
