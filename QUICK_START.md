# 快速启动指南

## 📋 概述

通过子域名访问本地 Vite 服务，支持两种启动方式：
- **方式 1**: Node 脚本直接启动（推荐，快速）
- **方式 2**: Docker 容器启动

## 🚀 方式 1: Node 脚本启动（推荐）

### 一键启动

```bash
./restart-services.sh
```

该脚本会自动：
1. 停止现有服务
2. 配置 hosts 文件
3. 启动两个 Vite 实例（端口 5174、5175）
4. 启动代理服务器（尝试 80 端口，失败则使用 8080）

### 访问地址

- **实例 1**: `http://mteyg1wky8uqgs.localhost/` (绿色主题)
- **实例 2**: `http://mttf3dq7wrg9on.localhost/` (蓝色主题)

> 如果代理使用 80 端口（默认），无需端口号。如果使用 8080 端口，则访问 `http://mteyg1wky8uqgs.localhost:8080/`

### 停止服务

```bash
./stop-services.sh
```

---

## 🐳 方式 2: Docker 容器启动

### 前置条件

1. 安装 Docker Desktop
2. 启动 Docker Desktop

### 一键启动

```bash
./start-docker.sh
```

该脚本会自动：
1. 配置 hosts 文件
2. 构建并启动两个 Docker 容器
3. 等待服务启动

### 启动代理服务器

启动 Docker 容器后，还需要启动代理服务器：

```bash
# 方式 1: 使用 80 端口（需要 sudo）
./start-proxy-80.sh

# 方式 2: 使用 8080 端口（无需 sudo）
PROXY_PORT=8080 node scripts/subdomain-proxy.js
```

### 访问地址

- **实例 1**: `http://mteyg1wky8uqgs.localhost/` (80 端口，推荐) 或 `http://mteyg1wky8uqgs.localhost:8080/`
- **实例 2**: `http://mttf3dq7wrg9on.localhost/` (80 端口，推荐) 或 `http://mttf3dq7wrg9on.localhost:8080/`

### 停止服务

```bash
# 停止 Docker 容器
docker compose down

# 停止代理服务器
lsof -ti :80,8080 | xargs kill -9
```

---

## 🔧 手动启动（了解细节）

### 步骤 1: 配置 hosts 文件

```bash
./setup-subdomain.sh
```

或手动添加：
```
127.0.0.1   mteyg1wky8uqgs.localhost
127.0.0.1   mttf3dq7wrg9on.localhost
```

### 步骤 2: 启动 Vite 实例

**Node 方式：**
```bash
cd packages/demo-app
SUBDOMAIN_PREFIX=mteyg1wky8uqgs PORT=5174 pnpm dev &
SUBDOMAIN_PREFIX=mttf3dq7wrg9on PORT=5175 pnpm dev &
```

**Docker 方式：**
```bash
docker compose up -d --build
```

### 步骤 3: 启动代理服务器

```bash
# 80 端口
./start-proxy-80.sh

# 或 8080 端口
PROXY_PORT=8080 node scripts/subdomain-proxy.js
```

---

## 📊 端口映射说明

| 子域名 | 代理端口 | Vite 端口 | 说明 |
|--------|---------|-----------|------|
| `mteyg1wky8uqgs.localhost` | 80/8080 | 5174 | 实例 1（绿色主题） |
| `mttf3dq7wrg9on.localhost` | 80/8080 | 5175 | 实例 2（蓝色主题） |

**路由流程：**
```
浏览器 → 子域名 (80/8080) → 代理服务器 → 对应端口 (5174/5175) → Vite 服务
```

---

## ⚡ 最快启动（3 步）

1. **启动服务**: `./restart-services.sh` (Node) 或 `./start-docker.sh` (Docker)
2. **启动代理**: `./start-proxy-80.sh` (Docker 方式需要)
3. **访问**: `http://mteyg1wky8uqgs.localhost/`

---

## 🔍 故障排查

### 问题 1: 无法访问

```bash
# 检查服务是否运行
lsof -i :5174,5175,80,8080

# 检查 hosts 配置
cat /etc/hosts | grep localhost

# 检查代理服务器
ps aux | grep subdomain-proxy
```

### 问题 2: 端口被占用

```bash
# 停止所有服务
./stop-services.sh

# 或手动停止
lsof -ti :5174,5175,80,8080 | xargs kill -9
```

### 问题 3: Docker 容器无法启动

```bash
# 查看日志
docker compose logs -f

# 重新构建
docker compose build --no-cache
```

---

## 📝 常用命令

```bash
# 查看容器状态（Docker）
docker compose ps

# 查看容器日志（Docker）
docker compose logs -f vite-app-1

# 查看代理日志
tail -f /tmp/subdomain-proxy.log

# 查看 Vite 日志（Node）
tail -f /tmp/vite-mteyg1wky8uqgs.log
```

---

## 💡 提示

- **推荐使用方式 1（Node 脚本）**：启动快速，无需 Docker
- **80 端口需要 sudo 权限**：如果不想输入密码，使用 8080 端口
- **代码修改自动生效**：支持 HMR（热更新），无需重启服务
