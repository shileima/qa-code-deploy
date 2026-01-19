# Docker 实例管理 API 文档

## 概述

本文档描述了通过 Node.js 中间层（Egg.js）管理 Docker 实例的 RESTful API。

## 基础信息

- **基础路径**: `/api`
- **Content-Type**: `application/json`
- **响应格式**: 
  ```json
  {
    "code": 0,
    "message": "success",
    "data": {}
  }
  ```

## API 端点

### 1. 创建实例

创建一个新的 Docker 实例，自动分配端口和前缀（或使用自定义值）。

**请求**
```
POST /api/instances
```

**请求体**（可选）
```json
{
  "prefix": "custom-prefix",  // 可选，自定义前缀（至少8位，小写字母+数字）
  "port": 5180                // 可选，指定端口（如果被占用会返回错误）
}
```

**响应**（成功）
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "prefix": "f5fee6019d1a9a9a",
    "port": 5174,
    "containerName": "render-monitor-app-f5fee6019d1a9a9a",
    "status": "running",
    "url": "http://f5fee6019d1a9a9a.localhost",
    "externalUrl": "http://f5fee6019d1a9a9a.sandbox.aie.sankuai.com",
    "createdAt": "2026-01-18T14:30:00.000Z",
    "theme": {
      "primaryColor": "#3b82f6"
    }
  }
}
```

**响应**（错误）
```json
{
  "code": 2001,
  "message": "前缀已存在",
  "data": null
}
```

**错误码**
- `2001`: 创建实例失败
- `400`: 请求参数错误（前缀格式无效、端口被占用等）

---

### 2. 列出所有实例

获取所有已创建的实例列表。

**请求**
```
GET /api/instances
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "prefix": "f5fee6019d1a9a9a",
      "port": 5174,
      "containerName": "render-monitor-app-f5fee6019d1a9a9a",
      "status": "running",
      "url": "http://f5fee6019d1a9a9a.localhost",
      "externalUrl": "http://f5fee6019d1a9a9a.sandbox.aie.sankuai.com",
      "createdAt": "2026-01-18T14:30:00.000Z",
      "theme": {
        "primaryColor": "#3b82f6"
      }
    }
  ]
}
```

---

### 3. 获取实例详情

获取指定前缀的实例详细信息。

**请求**
```
GET /api/instances/:prefix
```

**路径参数**
- `prefix`: 实例前缀（例如: `f5fee6019d1a9a9a`）

**响应**（成功）
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "prefix": "f5fee6019d1a9a9a",
    "port": 5174,
    "containerName": "render-monitor-app-f5fee6019d1a9a9a",
    "status": "running",
    "url": "http://f5fee6019d1a9a9a.localhost",
    "externalUrl": "http://f5fee6019d1a9a9a.sandbox.aie.sankuai.com",
    "createdAt": "2026-01-18T14:30:00.000Z",
    "theme": {
      "primaryColor": "#3b82f6"
    }
  }
}
```

**响应**（错误）
```json
{
  "code": 2004,
  "message": "实例不存在",
  "data": null
}
```

**错误码**
- `2004`: 获取实例详情失败
- `404`: 实例不存在

---

### 4. 删除实例

删除指定的实例，包括停止和删除 Docker 容器。

**请求**
```
DELETE /api/instances/:prefix
```

**路径参数**
- `prefix`: 实例前缀（例如: `f5fee6019d1a9a9a`）

**响应**（成功）
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "实例已删除"
  }
}
```

**响应**（错误）
```json
{
  "code": 2002,
  "message": "实例不存在",
  "data": null
}
```

**错误码**
- `2002`: 删除实例失败
- `404`: 实例不存在

---

### 5. 启动实例

启动已停止的实例容器。

**请求**
```
POST /api/instances/:prefix/start
```

**路径参数**
- `prefix`: 实例前缀（例如: `f5fee6019d1a9a9a`）

**响应**（成功）
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "prefix": "f5fee6019d1a9a9a",
    "port": 5174,
    "containerName": "render-monitor-app-f5fee6019d1a9a9a",
    "status": "running",
    "url": "http://f5fee6019d1a9a9a.localhost",
    "externalUrl": "http://f5fee6019d1a9a9a.sandbox.aie.sankuai.com"
  }
}
```

**响应**（错误）
```json
{
  "code": 2005,
  "message": "实例已在运行中",
  "data": null
}
```

**错误码**
- `2005`: 启动实例失败
- `404`: 实例不存在
- `400`: 实例已在运行

---

### 6. 停止实例

停止正在运行的实例容器。

**请求**
```
POST /api/instances/:prefix/stop
```

**路径参数**
- `prefix`: 实例前缀（例如: `f5fee6019d1a9a9a`）

**响应**（成功）
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "prefix": "f5fee6019d1a9a9a",
    "port": 5174,
    "containerName": "render-monitor-app-f5fee6019d1a9a9a",
    "status": "stopped",
    "url": "http://f5fee6019d1a9a9a.localhost",
    "externalUrl": "http://f5fee6019d1a9a9a.sandbox.aie.sankuai.com"
  }
}
```

**响应**（错误）
```json
{
  "code": 2006,
  "message": "实例未在运行",
  "data": null
}
```

**错误码**
- `2006`: 停止实例失败
- `404`: 实例不存在
- `400`: 实例未在运行

---

## 使用示例

### 使用 curl

**创建实例（自动生成前缀和端口）**
```bash
curl -X POST http://localhost:8080/api/instances \
  -H "Content-Type: application/json"
```

**创建实例（自定义前缀和端口）**
```bash
curl -X POST http://localhost:8080/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "my-custom-prefix",
    "port": 5180
  }'
```

**列出所有实例**
```bash
curl http://localhost:8080/api/instances
```

**获取实例详情**
```bash
curl http://localhost:8080/api/instances/f5fee6019d1a9a9a
```

**启动实例**
```bash
curl -X POST http://localhost:8080/api/instances/f5fee6019d1a9a9a/start
```

**停止实例**
```bash
curl -X POST http://localhost:8080/api/instances/f5fee6019d1a9a9a/stop
```

**删除实例**
```bash
curl -X DELETE http://localhost:8080/api/instances/f5fee6019d1a9a9a
```

### 使用 JavaScript/TypeScript

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:8080/api';

// 创建实例
async function createInstance(prefix, port) {
  const response = await axios.post(`${API_BASE}/instances`, {
    prefix,
    port
  });
  return response.data.data;
}

// 列出所有实例
async function listInstances() {
  const response = await axios.get(`${API_BASE}/instances`);
  return response.data.data;
}

// 启动实例
async function startInstance(prefix) {
  const response = await axios.post(`${API_BASE}/instances/${prefix}/start`);
  return response.data.data;
}
```

---

## 外部域名配置

### DNS 配置

需要在 DNS 服务器上配置通配符 A 记录或 CNAME 记录：

```
*.sandbox.aie.sankuai.com -> 服务器IP
```

或

```
*.sandbox.aie.sankuai.com -> 服务器域名
```

### Nginx 配置

系统会自动生成 Nginx 配置文件：`nginx/production/nginx-sandbox.conf`

配置完成后，需要：

1. **重新加载 Nginx 配置**
   ```bash
   sudo nginx -t  # 检查配置
   sudo nginx -s reload  # 重载配置
   ```

2. **或使用生成的配置文件**
   ```bash
   # 将生成的配置文件复制到 Nginx 配置目录
   sudo cp nginx/production/nginx-sandbox.conf /etc/nginx/conf.d/
   sudo nginx -t
   sudo nginx -s reload
   ```

### SSL 证书配置

如果使用 HTTPS，需要配置 SSL 证书：

1. 将证书文件放置到 `/etc/nginx/ssl/`
2. 确保证书文件名为 `cert.pem` 和 `key.pem`
3. 或修改 Nginx 配置文件中的证书路径

---

## 注意事项

1. **前缀格式**: 前缀必须至少 8 位，仅包含小写字母和数字
2. **端口范围**: 默认从 5174 开始分配，会自动查找可用端口
3. **容器状态**: 实例状态会自动同步，查询时会检查实际容器运行状态
4. **并发安全**: 创建/删除实例时需要注意并发控制（文件锁）
5. **权限要求**: 确保 node-sdk 进程有权限执行 Docker 命令和读写配置文件
6. **代理重载**: 创建/删除实例后会自动重载代理服务器配置

---

## 错误处理

所有 API 错误都遵循统一格式：

```json
{
  "code": 错误码,
  "message": "错误消息",
  "data": null
}
```

常见错误码：
- `0`: 成功
- `2001-2006`: 实例管理相关错误
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误