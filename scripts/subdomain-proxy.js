#!/usr/bin/env node
/**
 * 子域名反向代理服务器（纯 Node.js 实现）
 * 根据 Host 头自动路由到不同的 Vite 实例
 * 支持从配置文件读取路由映射，支持信号重载（SIGHUP）
 */

const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../config/subdomain-proxy.json');

// 默认路由映射（向后兼容）
const DEFAULT_SUBDOMAIN_PORT_MAP = {
  'mteyg1wky8uqgs': 5174,  // 实例 1
  'mttf3dq7wrg9on': 5175,  // 实例 2
};

// 默认端口
const DEFAULT_PORT = 5174;

// 当前路由映射（可动态更新）
let SUBDOMAIN_PORT_MAP = { ...DEFAULT_SUBDOMAIN_PORT_MAP };

// 从配置文件加载路由映射
function loadRouteConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(configContent);
      if (config.routes && typeof config.routes === 'object') {
        SUBDOMAIN_PORT_MAP = { ...config.routes };
        console.log(`[配置] 已从配置文件加载 ${Object.keys(SUBDOMAIN_PORT_MAP).length} 个路由`);
        return true;
      }
    }
  } catch (err) {
    console.error(`[警告] 无法加载配置文件 ${CONFIG_FILE}:`, err.message);
    console.log('[配置] 使用默认路由映射');
  }
  return false;
}

// 打印路由配置
function printRouteConfig() {
  console.log('========================================');
  console.log('  子域名反向代理服务器');
  console.log('========================================\n');

  console.log('子域名路由配置:');
  Object.entries(SUBDOMAIN_PORT_MAP).forEach(([prefix, port]) => {
    console.log(`  ${prefix}.localhost -> localhost:${port}`);
  });
  console.log(`  默认 -> localhost:${DEFAULT_PORT}\n`);
}

// 加载初始配置
loadRouteConfig();
printRouteConfig();

// 监听 SIGHUP 信号以重载配置
process.on('SIGHUP', () => {
  console.log('\n[信号] 收到 SIGHUP，重载配置...');
  loadRouteConfig();
  printRouteConfig();
});

// 从 Host 头中提取子域名前缀
function extractSubdomain(host) {
  if (!host) return null;
  
  // 匹配 mttf3dq7wrg9on.localhost 或 mttf3dq7wrg9on.localhost:8080 格式
  const match = host.match(/^([^.]+)\.localhost(:\d+)?$/);
  if (match) {
    return match[1];
  }
  
  return null;
}

// 获取目标端口
function getTargetPort(host) {
  const subdomain = extractSubdomain(host);
  if (subdomain && SUBDOMAIN_PORT_MAP[subdomain]) {
    return SUBDOMAIN_PORT_MAP[subdomain];
  }
  return DEFAULT_PORT;
}

// 创建代理服务器
// 默认端口改为 80，如果环境变量未设置则使用 80
const PROXY_PORT = parseInt(process.env.PROXY_PORT || '80', 10);

const server = http.createServer((req, res) => {
  const host = req.headers.host || '';
  const targetPort = getTargetPort(host);
  const target = `http://localhost:${targetPort}`;
  const subdomain = extractSubdomain(host) || 'default';
  
  // 日志
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  console.log(`  Host: ${host}`);
  console.log(`  子域名: ${subdomain} -> 端口: ${targetPort}\n`);
  
  // 解析目标 URL
  const targetUrl = new URL(req.url, target);
  targetUrl.hostname = 'localhost';
  targetUrl.port = targetPort;
  
  // 创建代理请求
  const proxyReq = http.request({
    hostname: 'localhost',
    port: targetPort,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
      'x-forwarded-host': host,
      'x-forwarded-prefix': subdomain,
    },
  }, (proxyRes) => {
    // 复制响应头
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    // 管道传输响应体
    proxyRes.pipe(res);
  });
  
  // 错误处理
  proxyReq.on('error', (err) => {
    console.error(`[错误] ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`代理错误: ${err.message}\n\n请确保 Vite 实例运行在端口 ${targetPort}`);
    }
  });
  
  // 请求错误处理
  req.on('error', (err) => {
    console.error(`[请求错误] ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`请求错误: ${err.message}`);
    }
  });
  
  // 响应错误处理
  res.on('error', (err) => {
    console.error(`[响应错误] ${err.message}`);
  });
  
  // 管道传输请求体
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

// WebSocket 升级处理（用于 HMR）
server.on('upgrade', (req, socket, head) => {
  const host = req.headers.host || '';
  const targetPort = getTargetPort(host);
  const target = `http://localhost:${targetPort}`;
  const subdomain = extractSubdomain(host) || 'default';
  
  console.log(`[WebSocket] ${host} -> localhost:${targetPort}`);
  
  // 创建 WebSocket 代理连接
  const proxyReq = http.request({
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${targetPort}`,
      'x-forwarded-host': host,
    },
  });
  
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n');
    socket.write(`Upgrade: ${proxyRes.headers.upgrade}\r\n`);
    socket.write(`Connection: ${proxyRes.headers.connection}\r\n`);
    socket.write('\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  
  proxyReq.on('error', (err) => {
    console.error(`[WebSocket 错误] ${err.message}`);
    socket.destroy();
  });
  
  socket.on('error', (err) => {
    console.error(`[Socket 错误] ${err.message}`);
    proxyReq.destroy();
  });
  
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.pipe(proxyReq);
  }
  proxyReq.end();
});

// 启动服务器
server.listen(PROXY_PORT, () => {
  console.log('========================================');
  console.log(`✓ 代理服务器已启动`);
  console.log(`  监听端口: ${PROXY_PORT}`);
  console.log('========================================\n');
  
  console.log('访问地址:');
  Object.keys(SUBDOMAIN_PORT_MAP).forEach(prefix => {
    if (PROXY_PORT === 80) {
      console.log(`  http://${prefix}.localhost`);
    } else {
      console.log(`  http://${prefix}.localhost:${PROXY_PORT}`);
    }
  });
  console.log('');
  
  console.log('确保 Vite 实例正在运行：');
  Object.entries(SUBDOMAIN_PORT_MAP).forEach(([prefix, port]) => {
    console.log(`  - ${prefix}: localhost:${port}`);
  });
  console.log('');
  
  console.log('提示: 发送 SIGHUP 信号可重载配置（kill -HUP <PID>）');
  console.log('');
}).on('error', (err) => {
  if (err.code === 'EACCES') {
    console.error(`\n错误: 端口 ${PROXY_PORT} 需要管理员权限`);
    console.error('请使用以下方式之一：');
    console.error(`  1. sudo node ${__filename}`);
    console.error(`  2. 或使用其他端口: PROXY_PORT=8080 node ${__filename}\n`);
  } else {
    console.error('服务器启动错误:', err.message);
  }
  process.exit(1);
});
