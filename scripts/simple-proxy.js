#!/usr/bin/env node
/**
 * 简单的反向代理服务器（用于开发环境）
 * 实现基于端口的子域名路由
 */

const http = require('http');
const httpProxy = require('http-proxy-middleware');
const { createProxyMiddleware } = httpProxy;

// 端口到前缀的映射
const PORT_MAP = {
  'mttf3dq7wrg9on': 5174,
  'mteyg1wky8uqgs': 5175,
};

// 默认端口
const DEFAULT_PORT = 5174;
const PROXY_PORT = 8080;

console.log('启动反向代理服务器...');
console.log(`监听端口: ${PROXY_PORT}`);
console.log('\n路由配置:');
Object.entries(PORT_MAP).forEach(([prefix, port]) => {
  console.log(`  ${prefix}.localhost:${PROXY_PORT} -> localhost:${port}`);
});
console.log(`  默认 -> localhost:${DEFAULT_PORT}`);
console.log('\n请在浏览器中访问:');
Object.keys(PORT_MAP).forEach(prefix => {
  console.log(`  http://localhost:${PROXY_PORT}?prefix=${prefix}`);
});
console.log('');

// 创建代理服务器
const server = http.createServer((req, res) => {
  // 从查询参数或 Host 头获取前缀
  const url = new URL(req.url, `http://${req.headers.host}`);
  const prefix = url.searchParams.get('prefix');
  
  // 确定目标端口
  let targetPort = DEFAULT_PORT;
  if (prefix && PORT_MAP[prefix]) {
    targetPort = PORT_MAP[prefix];
  }
  
  const target = `http://localhost:${targetPort}`;
  
  // 创建代理中间件
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true, // 支持 WebSocket
    logLevel: 'info',
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} -> ${target}${req.url}`);
    },
    onError: (err, req, res) => {
      console.error('代理错误:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('代理错误: ' + err.message);
    }
  });
  
  proxy(req, res);
});

// WebSocket 升级处理
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const prefix = url.searchParams.get('prefix');
  
  let targetPort = DEFAULT_PORT;
  if (prefix && PORT_MAP[prefix]) {
    targetPort = PORT_MAP[prefix];
  }
  
  const target = `http://localhost:${targetPort}`;
  const proxy = createProxyMiddleware({
    target,
    ws: true,
    changeOrigin: true
  });
  
  proxy.upgrade(req, socket, head);
});

server.listen(PROXY_PORT, () => {
  console.log(`✓ 反向代理服务器已启动: http://localhost:${PROXY_PORT}`);
  console.log('提示: 使用查询参数 ?prefix=xxx 来指定实例\n');
});
