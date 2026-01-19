# 外部域名配置指南

本文档说明如何配置外部域名 `*.sandbox.aie.sankuai.com` 来访问 Docker 实例。

## 概述

通过配置 DNS 和 Nginx，可以实现通过外部域名访问本地运行的 Docker 实例：

- 本地访问：`http://{prefix}.localhost`
- 外部访问：`http://{prefix}.sandbox.aie.sankuai.com`

## 配置步骤

### 1. DNS 配置

需要在 DNS 服务器上配置通配符 DNS 记录，将 `*.sandbox.aie.sankuai.com` 解析到服务器 IP。

#### 方式一：A 记录（推荐）

```
类型: A
主机: *
域名: sandbox.aie.sankuai.com
值: 服务器IP（例如：10.123.45.67）
TTL: 300
```

或者使用完整域名：

```
类型: A
主机: *.sandbox.aie.sankuai.com
值: 服务器IP
TTL: 300
```

#### 方式二：CNAME 记录

如果服务器有固定域名，可以使用 CNAME：

```
类型: CNAME
主机: *
域名: sandbox.aie.sankuai.com
值: server.example.com
TTL: 300
```

**注意事项：**
- 通配符 DNS 配置可能需要与运维团队协调
- 某些 DNS 提供商可能不支持通配符记录，需要逐个配置子域名
- DNS 配置生效可能需要几分钟到几小时

### 2. Nginx 配置

#### 2.1 生成 Nginx 配置文件

系统会自动生成 Nginx 配置文件。每次创建/删除实例后，会自动更新配置文件：

```bash
# 手动生成配置文件（可选）
node scripts/generate-nginx-sandbox-config.js
```

生成的配置文件位于：`nginx/production/nginx-sandbox.conf`

#### 2.2 安装 Nginx（如果未安装）

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx

# macOS
brew install nginx
```

#### 2.3 部署 Nginx 配置

```bash
# 1. 将配置文件复制到 Nginx 配置目录
sudo cp nginx/production/nginx-sandbox.conf /etc/nginx/conf.d/nginx-sandbox.conf

# 2. 检查配置语法
sudo nginx -t

# 3. 如果配置正确，重新加载 Nginx
sudo nginx -s reload
```

#### 2.4 配置 SSL 证书（HTTPS）

如果需要 HTTPS，需要配置 SSL 证书：

```bash
# 1. 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 2. 将证书文件复制到目录
sudo cp cert.pem /etc/nginx/ssl/
sudo cp key.pem /etc/nginx/ssl/

# 3. 设置权限
sudo chmod 600 /etc/nginx/ssl/key.pem
sudo chmod 644 /etc/nginx/ssl/cert.pem
```

**证书获取方式：**
- 使用 Let's Encrypt（免费）
- 使用公司内部 CA
- 使用商业证书

#### 2.5 验证配置

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 3. 防火墙配置

确保防火墙允许 HTTP/HTTPS 流量：

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### 4. 测试配置

#### 4.1 测试 DNS 解析

```bash
# 测试通配符 DNS 解析
nslookup test123.sandbox.aie.sankuai.com

# 或使用 dig
dig test123.sandbox.aie.sankuai.com
```

#### 4.2 测试 HTTP 访问

```bash
# 测试本地端口（确保实例正在运行）
curl http://localhost:5174

# 测试外部域名访问
curl http://test123.sandbox.aie.sankuai.com
# 或
curl https://test123.sandbox.aie.sankuai.com
```

#### 4.3 在浏览器中测试

1. 创建一个实例（通过 API 或脚本）
2. 获取返回的前缀（例如：`f5fee6019d1a9a9a`）
3. 在浏览器中访问：`http://f5fee6019d1a9a9a.sandbox.aie.sankuai.com`

## 自动配置流程

当通过 API 创建实例时，系统会自动：

1. 创建实例配置
2. 生成 Docker Compose 配置
3. 生成应用配置
4. **生成 Nginx 配置文件**（包含新的路由映射）
5. 启动 Docker 容器
6. 重载代理服务器

**注意：** 生成 Nginx 配置后，需要手动重新加载 Nginx：

```bash
sudo nginx -t && sudo nginx -s reload
```

或者设置一个 cron 任务或监听文件变化自动重载。

## 故障排查

### DNS 无法解析

**问题：** `nslookup` 无法解析域名

**解决方案：**
1. 检查 DNS 配置是否正确
2. 等待 DNS 传播（可能需要几分钟）
3. 检查本地 DNS 缓存：`sudo systemd-resolve --flush-caches` 或 `sudo dscacheutil -flushcache`

### Nginx 502 Bad Gateway

**问题：** 访问外部域名返回 502 错误

**可能原因：**
1. Docker 容器未启动
2. 端口映射不正确
3. Nginx 配置错误

**解决方案：**
```bash
# 1. 检查容器状态
docker ps | grep render-monitor-app

# 2. 检查端口是否监听
netstat -tlnp | grep 5174

# 3. 检查 Nginx 配置
sudo nginx -t

# 4. 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### SSL 证书错误

**问题：** HTTPS 访问时出现证书错误

**解决方案：**
1. 确保证书文件存在且路径正确
2. 检查证书文件权限
3. 确保证书有效且未过期
4. 如果是自签名证书，需要在浏览器中添加信任

### WebSocket 连接失败（HMR 不工作）

**问题：** 页面可以访问，但热更新（HMR）不工作

**解决方案：**
检查 Nginx 配置中的 WebSocket 支持：

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
```

确保这些配置在 Vite 特殊路径和主代理配置中都存在。

## 最佳实践

1. **使用 HTTPS**：生产环境建议使用 HTTPS
2. **监控日志**：定期检查 Nginx 访问日志和错误日志
3. **自动重载**：可以设置文件监控自动重载 Nginx 配置
4. **备份配置**：定期备份 Nginx 配置文件
5. **限制访问**：根据需要配置 IP 白名单或其他访问控制

## 相关文件

- `nginx/production/nginx-sandbox.conf` - Nginx 配置文件（自动生成）
- `scripts/generate-nginx-sandbox-config.js` - Nginx 配置生成脚本
- `config/subdomain-proxy.json` - 路由映射配置（自动更新）
- `docs/INSTANCE_MANAGEMENT_API.md` - API 文档