# Docker 安装指南 (macOS)

## 📦 安装 Docker Desktop

### 方式 1: 使用 Homebrew 安装（推荐）

```bash
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 使用 Homebrew 安装 Docker Desktop
brew install --cask docker

# 或者直接下载并安装
brew install --cask docker
```

### 方式 2: 手动下载安装

1. 访问 Docker Desktop for Mac 下载页面：
   - https://www.docker.com/products/docker-desktop/

2. 下载适合您系统的版本：
   - **Intel 芯片**: Docker Desktop for Intel Mac
   - **Apple Silicon (M1/M2/M3)**: Docker Desktop for Apple Silicon

3. 双击下载的 `.dmg` 文件

4. 将 Docker 图标拖拽到 Applications 文件夹

5. 打开 Applications 文件夹，双击 Docker 图标启动

6. 按照提示完成初始设置（需要输入密码）

## 🚀 启动 Docker Desktop

### 方法 1: 使用命令行

```bash
# 启动 Docker Desktop
open -a Docker

# 等待 Docker 启动完成（通常需要 10-30 秒）
```

### 方法 2: 手动启动

1. 打开 Applications 文件夹
2. 双击 Docker 图标
3. 等待 Docker 启动完成（菜单栏会显示 Docker 图标）

## ✅ 验证安装

安装完成后，运行以下命令验证：

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker compose version
# 或者（旧版本）
docker-compose --version

# 运行测试容器
docker run hello-world
```

如果看到类似以下输出，说明安装成功：

```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

## 🔧 常见问题

### 问题 1: Docker 启动失败

**解决方案**：
1. 检查系统要求（macOS 10.15 或更高版本）
2. 确保有足够的内存（至少 4GB RAM）
3. 重启 Docker Desktop
4. 检查 Docker Desktop 日志：
   ```bash
   # 查看 Docker Desktop 日志
   tail -f ~/Library/Containers/com.docker.docker/Data/log/vm/dockerd.log
   ```

### 问题 2: 权限问题

**解决方案**：
```bash
# 确保当前用户在 docker 组中（macOS 通常不需要）
# 如果遇到权限问题，使用 sudo（不推荐用于日常使用）

# 更好的方式是检查 Docker Desktop 设置中的权限配置
```

### 问题 3: 端口冲突

如果遇到端口冲突：

```bash
# 检查端口占用
lsof -i :5174
lsof -i :5175

# 停止占用端口的进程
sudo lsof -ti :5174 | xargs sudo kill -9
sudo lsof -ti :5175 | xargs sudo kill -9
```

## 📝 安装后配置

### 1. 配置 Docker Desktop 资源

打开 Docker Desktop -> Settings -> Resources：

- **CPU**: 建议至少 2 核
- **Memory**: 建议至少 4GB
- **Disk image size**: 建议至少 60GB

### 2. 配置环境变量（可选）

```bash
# 添加到 ~/.zshrc 或 ~/.bash_profile
export DOCKER_HOST=unix:///var/run/docker.sock
```

### 3. 配置 Docker 镜像加速（国内用户）

编辑或创建 `~/.docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
```

然后重启 Docker Desktop。

## 🎯 安装完成后的下一步

安装完成并验证后，可以启动 Docker 实例：

```bash
# 启动 Docker 容器
./start-docker.sh

# 或者手动启动
docker compose up -d --build
```

## 📚 参考资源

- Docker Desktop 官方文档: https://docs.docker.com/desktop/mac/
- Docker 安装指南: https://docs.docker.com/get-docker/
- Docker Compose 文档: https://docs.docker.com/compose/

## ⚠️ 注意事项

1. **系统要求**：
   - macOS 10.15 (Catalina) 或更高版本
   - 至少 4GB RAM
   - 至少 10GB 可用磁盘空间

2. **网络要求**：
   - 首次安装需要网络连接以下载镜像
   - 部分功能需要互联网连接

3. **性能优化**：
   - 在 Docker Desktop 设置中调整资源分配
   - 使用 SSD 可以获得更好的性能
