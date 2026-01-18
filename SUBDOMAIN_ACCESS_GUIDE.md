# 通过子域名前缀访问指南

## 🎯 如何通过子域名前缀 `mttf3dq7wrg9on` 访问

### ✅ 最简单的方式（推荐）

**1. 配置 hosts 文件：**

```bash
sudo ./setup-subdomain.sh
```

或手动添加以下内容到 `/etc/hosts`：

```
127.0.0.1   mttf3dq7wrg9on.localhost
127.0.0.1   mteyg1wky8uqgs.localhost
```

**2. 启动代理服务器：**

```bash
PROXY_PORT=8080 node scripts/subdomain-proxy.js
```

**3. 访问：**

```
http://mttf3dq7wrg9on.localhost:8080
http://mteyg1wky8uqgs.localhost:8080
```

---

## 📋 三种访问方式对比

### 方式 1: 使用代理服务器（推荐）✨

**优点：**
- ✅ 通过子域名直接访问
- ✅ 自动路由到正确的端口
- ✅ 支持 WebSocket（HMR）

**步骤：**
```bash
# 1. 配置 hosts
sudo ./setup-subdomain.sh

# 2. 启动代理服务器
PROXY_PORT=8080 node scripts/subdomain-proxy.js

# 3. 访问
# http://mttf3dq7wrg9on.localhost:8080
# http://mteyg1wky8uqgs.localhost:8080
```

### 方式 2: 直接访问（指定端口）

**优点：**
- ✅ 无需启动代理服务器
- ✅ 配置简单

**步骤：**
```bash
# 1. 配置 hosts（同上）
sudo ./setup-subdomain.sh

# 2. 直接访问（带上端口号）
# http://mttf3dq7wrg9on.localhost:5174
# http://mteyg1wky8uqgs.localhost:5175
```

### 方式 3: 使用查询参数

**优点：**
- ✅ 最简单，无需配置
- ✅ 适合临时测试

**访问：**
```
http://localhost:5174?prefix=mttf3dq7wrg9on
http://localhost:5175?prefix=mteyg1wky8uqgs
```

---

## 🔧 当前运行状态

- ✅ Vite 实例 1: `localhost:5174` (mttf3dq7wrg9on)
- ✅ Vite 实例 2: `localhost:5175` (mteyg1wky8uqgs)
- ✅ 代理服务器: `localhost:8080` (已启动)

---

## 🌐 访问地址总结

| 子域名前缀 | 方式 1 (代理) | 方式 2 (直接) | 方式 3 (参数) |
|-----------|--------------|--------------|--------------|
| mttf3dq7wrg9on | http://mttf3dq7wrg9on.localhost:8080 | http://mttf3dq7wrg9on.localhost:5174 | http://localhost:5174?prefix=mttf3dq7wrg9on |
| mteyg1wky8uqgs | http://mteyg1wky8uqgs.localhost:8080 | http://mteyg1wky8uqgs.localhost:5175 | http://localhost:5175?prefix=mteyg1wky8uqgs |

---

## 🚀 快速开始

```bash
# 一键配置并启动
sudo ./setup-subdomain.sh
PROXY_PORT=8080 node scripts/subdomain-proxy.js

# 然后在浏览器访问
# http://mttf3dq7wrg9on.localhost:8080
```

---

## 📝 注意事项

1. **hosts 文件配置**：需要管理员权限（sudo）
2. **代理服务器端口**：默认 8080，可使用 `PROXY_PORT=xxx` 自定义
3. **Vite 实例**：确保实例正在运行（端口 5174 和 5175）
4. **HMR 支持**：代理服务器支持 WebSocket，HMR 正常工作

---

## 🛠️ 故障排查

**问题：无法访问子域名**

- 检查 hosts 文件：`cat /etc/hosts | grep mttf3dq7wrg9on`
- 检查代理服务器是否运行：`lsof -i :8080`
- 检查 Vite 实例是否运行：`lsof -i :5174,5175`

**问题：代理服务器启动失败**

- 端口被占用：使用 `PROXY_PORT=8081` 指定其他端口
- 权限问题：使用 `sudo` 启动（如果使用 80 端口）

