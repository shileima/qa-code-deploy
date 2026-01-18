# 使用本地 Docker 启动 demo-app 实例

## 📋 配置说明

### 实例映射

- **vite-app-1** (mteyg1wky8uqgs)
  - 容器内端口：`5174`
  - 宿主机端口：`5174`
  - 访问地址：`http://mteyg1wky8uqgs.localhost/`
  - 主题：绿色（应用实例 B）

- **vite-app-2** (mttf3dq7wrg9on)
  - 容器内端口：`5174`
  - 宿主机端口：`5175`
  - 访问地址：`http://mttf3dq7wrg9on.localhost/`
  - 主题：蓝色（应用实例 A）

### 路由机制

```
浏览器访问: http://mteyg1wky8uqgs.localhost/
    ↓
代理服务器 (subdomain-proxy.js:80)
    ↓
路由到: localhost:5174
    ↓
Docker 容器 (vite-app-1)
```

## 🚀 启动步骤

### 步骤 1: 检查 Docker 状态

```bash
# 检查 Docker 是否运行
docker ps

# 如果未运行，启动 Docker Desktop
open -a Docker
```

### 步骤 2: 配置 hosts 文件

```bash
# 运行配置脚本（自动配置）
./setup-subdomain.sh

# 或者手动配置
sudo bash -c 'echo "127.0.0.1   mteyg1wky8uqgs.localhost" >> /etc/hosts'
sudo bash -c 'echo "127.0.0.1   mttf3dq7wrg9on.localhost" >> /etc/hosts'
```

### 步骤 3: 启动 Docker 容器

```bash
# 方式 1: 使用启动脚本（推荐）
./start-docker.sh

# 方式 2: 手动启动
docker compose up -d --build

# 方式 3: 只启动特定实例（如果只想启动一个）
docker compose up -d --build vite-app-1
```

### 步骤 4: 等待容器启动

```bash
# 查看容器状态
docker compose ps

# 查看日志（确认服务已启动）
docker compose logs -f vite-app-1

# 等待看到类似输出：
# "Local:   http://localhost:5174/"
```

### 步骤 5: 启动代理服务器

代理服务器用于将子域名路由到对应的端口：

```bash
# 方式 1: 使用启动脚本（端口 80，需要 sudo）
./start-proxy-80.sh

# 方式 2: 使用 8080 端口（无需 sudo）
PROXY_PORT=8080 node scripts/subdomain-proxy.js

# 方式 3: 后台运行
PROXY_PORT=8080 nohup node scripts/subdomain-proxy.js > /tmp/subdomain-proxy.log 2>&1 &
```

### 步骤 6: 验证访问

```bash
# 测试访问实例 1
curl http://mteyg1wky8uqgs.localhost/

# 测试访问实例 2
curl http://mttf3dq7wrg9on.localhost/

# 或者在浏览器中访问
open http://mteyg1wky8uqgs.localhost/
```

## 🔍 故障排查

### 问题 1: 无法拉取 Docker 镜像

**症状**：`failed to fetch oauth token` 或 `network timeout`

**解决方案**：

1. **检查网络连接**
   ```bash
   ping 8.8.8.8
   curl https://auth.docker.io/token
   ```

2. **配置 Docker 镜像加速器**
   
   编辑 `~/.docker/daemon.json`:
   ```json
   {
     "registry-mirrors": [
       "https://docker.mirrors.ustc.edu.cn",
       "https://hub-mirror.c.163.com",
       "https://mirror.baidubce.com"
     ]
   }
   ```
   
   然后重启 Docker Desktop:
   ```bash
   killall Docker && sleep 2 && open -a Docker
   ```

3. **使用本地镜像（如果已有）**
   ```bash
   # 检查是否有本地 node 镜像
   docker images | grep node
   
   # 如果有，可以直接使用
   ```

### 问题 2: 容器启动但无法访问

**检查项**：

```bash
# 1. 检查容器是否运行
docker compose ps

# 2. 检查端口是否被占用
lsof -i :5174
lsof -i :5175

# 3. 检查容器日志
docker compose logs vite-app-1

# 4. 检查 hosts 配置
cat /etc/hosts | grep localhost

# 5. 检查代理服务器是否运行
lsof -i :80
lsof -i :8080
```

### 问题 3: 访问 404 或连接错误

**可能原因**：

1. **代理服务器未启动**
   ```bash
   # 启动代理服务器
   ./start-proxy-80.sh
   ```

2. **路由配置错误**
   ```bash
   # 检查 subdomain-proxy.js 配置
   cat scripts/subdomain-proxy.js | grep SUBDOMAIN_PORT_MAP
   ```

3. **端口映射错误**
   ```bash
   # 检查容器端口映射
   docker compose ps
   docker port render-monitor-app-1
   ```

## 📊 常用命令

### 容器管理

```bash
# 启动所有容器
docker compose up -d

# 停止所有容器
docker compose down

# 重启特定容器
docker compose restart vite-app-1

# 查看容器日志
docker compose logs -f vite-app-1

# 进入容器
docker exec -it render-monitor-app-1 sh

# 查看容器资源使用
docker stats
```

### 调试命令

```bash
# 测试容器内服务
docker exec render-monitor-app-1 wget -qO- http://localhost:5174/

# 查看容器网络
docker network inspect qa-code-deploy_render-monitor-network

# 查看容器环境变量
docker exec render-monitor-app-1 env | grep SUBDOMAIN
```

## 🔄 完整启动流程（一键脚本）

如果需要快速启动，可以使用：

```bash
# 1. 配置 hosts
./setup-subdomain.sh

# 2. 启动 Docker 容器
./start-docker.sh

# 3. 启动代理服务器
./start-proxy-80.sh

# 4. 验证访问
curl http://mteyg1wky8uqgs.localhost/
```

## 📝 注意事项

1. **容器内端口统一为 5174**，但宿主机端口不同（5174 和 5175）
2. **必须启动代理服务器**才能通过子域名访问
3. **首次构建需要网络连接**以下载基础镜像
4. **使用 volumes 挂载代码**，修改代码后容器会自动重新编译（HMR）
