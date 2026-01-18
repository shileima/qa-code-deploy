# Docker Desktop 代理配置指南

## 📋 配置步骤（GUI 方式）

### 步骤 1: 打开 Docker Desktop

1. 确保 Docker Desktop 正在运行
2. 点击菜单栏的 Docker 图标（鲸鱼图标）
3. 选择 **Settings**（设置）或按 `Command + ,`

### 步骤 2: 进入代理设置

1. 在左侧菜单中，点击 **Resources**
2. 展开 **Resources** 菜单
3. 选择 **Proxies**（代理）

### 步骤 3: 配置代理

#### 方式 A: 使用系统代理（推荐）

1. 勾选 **Use system proxy**（使用系统代理）
2. Docker Desktop 会自动使用 macOS 系统代理设置

#### 方式 B: 手动配置代理

1. 取消勾选 **Use system proxy**
2. 在 **Manual proxy configuration** 部分：
   - **HTTP Proxy**: 填写代理地址，例如 `http://proxy.example.com:8080`
   - **HTTPS Proxy**: 填写 HTTPS 代理地址，例如 `http://proxy.example.com:8080`
   - **No proxy for**: 填写不需要代理的地址（可选），例如 `localhost,127.0.0.1`

3. **认证信息**（如果需要）：
   - **Username**: 代理用户名
   - **Password**: 代理密码

### 步骤 4: 应用并重启

1. 点击 **Apply & Restart**（应用并重启）
2. 等待 Docker Desktop 重启完成

### 步骤 5: 验证配置

重启后，验证代理是否生效：

```bash
# 测试拉取镜像
docker pull hello-world

# 或者拉取 node 镜像
docker pull node:18-alpine

# 查看 Docker 信息
docker info | grep -i proxy
```

## 🔧 配置文件方式（高级）

Docker Desktop 的代理配置通常存储在：

**macOS**:
```
~/Library/Group Containers/group.com.docker/settings.json
```

**配置示例**:
```json
{
  "proxies": {
    "httpProxy": "http://proxy.example.com:8080",
    "httpsProxy": "http://proxy.example.com:8080",
    "noProxy": "localhost,127.0.0.1"
  }
}
```

**注意**: 直接编辑配置文件可能导致配置丢失，建议使用 GUI 方式配置。

## 🔍 查找系统代理设置

### macOS 系统代理

1. **系统设置** → **网络** → 选择当前网络连接
2. 点击 **高级** → **代理** 选项卡
3. 查看 HTTP/HTTPS 代理设置

### 命令行查看代理

```bash
# 查看系统代理设置
networksetup -getwebproxy Wi-Fi
networksetup -getsecurewebproxy Wi-Fi

# 或者查看环境变量（如果有设置）
echo $http_proxy
echo $https_proxy
```

## 📝 常见代理配置示例

### 示例 1: HTTP 代理

```
HTTP Proxy: http://proxy.example.com:8080
HTTPS Proxy: http://proxy.example.com:8080
No proxy for: localhost,127.0.0.1,*.local
```

### 示例 2: SOCKS 代理

```
HTTP Proxy: socks5://proxy.example.com:1080
HTTPS Proxy: socks5://proxy.example.com:1080
```

### 示例 3: 带认证的代理

```
HTTP Proxy: http://username:password@proxy.example.com:8080
HTTPS Proxy: http://username:password@proxy.example.com:8080
```

## ⚠️ 注意事项

1. **重启生效**: 修改代理配置后，Docker Desktop 会自动重启
2. **镜像加速器**: 代理配置不影响镜像加速器设置（`~/.docker/daemon.json`）
3. **防火墙**: 确保防火墙允许 Docker 通过代理连接
4. **SSL 证书**: 如果使用 HTTPS 代理，可能需要配置 SSL 证书

## 🔄 配置后重新尝试

配置代理后，再次尝试：

```bash
# 1. 重启 Docker Desktop（如果未自动重启）
killall Docker && sleep 2 && open -a Docker

# 2. 等待 Docker 启动
docker ps

# 3. 拉取镜像
docker pull node:18-alpine

# 4. 启动容器
./start-docker.sh
```

## 🐛 故障排查

### 问题 1: 代理配置无效

**检查项**:
1. 代理地址是否正确
2. 代理服务器是否运行
3. 防火墙是否允许连接

**验证**:
```bash
# 测试代理连接
curl -x http://proxy.example.com:8080 https://registry-1.docker.io/v2/
```

### 问题 2: 认证失败

**解决方案**:
1. 检查用户名和密码是否正确
2. 尝试在代理 URL 中包含认证信息：
   `http://username:password@proxy.example.com:8080`

### 问题 3: 无法连接内网

**解决方案**:
在 "No proxy for" 中添加内网地址：
```
localhost,127.0.0.1,192.168.*,10.*,172.16-31.*
```

## 📚 参考资源

- Docker Desktop 官方文档: https://docs.docker.com/desktop/proxy/
- macOS 网络代理设置: https://support.apple.com/guide/mac-help/set-up-a-proxy-server-mchlp2591/mac
