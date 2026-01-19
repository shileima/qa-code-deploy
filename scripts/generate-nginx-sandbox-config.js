#!/usr/bin/env node
/**
 * 生成支持外部域名的 Nginx 配置文件
 * 从 config/subdomain-proxy.json 读取路由映射，生成 nginx-sandbox.conf
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PROXY_CONFIG_FILE = path.join(PROJECT_ROOT, 'config/subdomain-proxy.json');
const NGINX_CONFIG_FILE = path.join(PROJECT_ROOT, 'nginx/production/nginx-sandbox.conf');

// 读取代理配置
function loadProxyConfig() {
  try {
    if (fs.existsSync(PROXY_CONFIG_FILE)) {
      const content = fs.readFileSync(PROXY_CONFIG_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`错误: 无法读取 ${PROXY_CONFIG_FILE}:`, err.message);
  }
  return { routes: {} };
}

// 生成端口映射 map 指令
function generatePortMap(routes) {
  let map = '    map $subdomain_prefix $backend_port {\n';
  map += '        default 5174;\n';
  
  Object.entries(routes).forEach(([prefix, port]) => {
    map += `        ${prefix} ${port};\n`;
  });
  
  map += '    }\n';
  return map;
}

// 生成 Nginx 配置
function generateNginxConfig(routes) {
  const portMap = generatePortMap(routes);
  const timestamp = new Date().toISOString();
  const routeCount = Object.keys(routes).length;
  
  return `# Nginx 生产环境配置 - 支持外部域名 *.sandbox.aie.sankuai.com
# 自动生成时间: ${timestamp}
# 路由数量: ${routeCount}
# 注意：此文件由脚本自动生成，请勿手动编辑

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'host="$host" prefix="$subdomain_prefix" backend="$backend_port" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # 客户端配置
    client_max_body_size 10M;
    client_body_buffer_size 128k;

    # 压缩配置
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss 
               application/json application/xml application/x-javascript
               image/svg+xml;

    # 从 Host 头中提取子域名前缀
    # 例如：xxx.sandbox.aie.sankuai.com -> xxx
    map $host $subdomain_prefix {
        default "";
        ~^([^.]+)\\.sandbox\\.aie\\.sankuai\\.com$ $1;
    }

    # 根据子域名前缀映射到不同的后端端口
${portMap}
    # 后端地址（固定为 localhost）
    map $subdomain_prefix $backend_host {
        default localhost;
    }

    # WebSocket 升级配置
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # HTTP 服务器配置（重定向到 HTTPS）
    server {
        listen 80;
        server_name *.sandbox.aie.sankuai.com;

        # 允许 Let's Encrypt 验证
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # 重定向到 HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS 服务器配置
    server {
        listen 443 ssl http2;
        server_name *.sandbox.aie.sankuai.com;

        # SSL 证书配置
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL 配置优化
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # 安全头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # 客户端配置
        client_max_body_size 10M;

        # Vite 特殊路径（禁用缓存，支持 HMR）
        location ~ ^/(@vite|@react-refresh|@id|src|node_modules|@fs) {
            proxy_pass http://$backend_host:$backend_port;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Prefix $subdomain_prefix;
            
            # WebSocket 支持（HMR）
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            
            proxy_cache off;
            proxy_buffering off;
            proxy_read_timeout 300s;
            proxy_connect_timeout 300s;
            
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }

        # 主代理配置
        location / {
            proxy_pass http://$backend_host:$backend_port;
            
            # 代理头
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Forwarded-Port $server_port;
            proxy_set_header X-Forwarded-Prefix $subdomain_prefix;

            # WebSocket 支持（HMR）
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;

            # 超时配置
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;

            # 缓冲配置
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_busy_buffers_size 8k;
        }

        # 健康检查端点
        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }

        # 错误页面
        error_page 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
            internal;
        }
    }
}
`;
}

// 主函数
function main() {
  const config = loadProxyConfig();
  const routes = config.routes || {};
  
  // 生成配置
  const nginxConfig = generateNginxConfig(routes);
  
  // 确保目录存在
  const dir = path.dirname(NGINX_CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 备份现有文件（如果存在）
  if (fs.existsSync(NGINX_CONFIG_FILE)) {
    const backupFile = `${NGINX_CONFIG_FILE}.backup.${Date.now()}`;
    fs.copyFileSync(NGINX_CONFIG_FILE, backupFile);
    console.log(`备份现有配置: ${backupFile}`);
  }
  
  // 写入新配置
  fs.writeFileSync(NGINX_CONFIG_FILE, nginxConfig, 'utf8');
  console.log(`✓ 已生成 Nginx 配置文件: ${NGINX_CONFIG_FILE}`);
  console.log(`  路由数量: ${Object.keys(routes).length}`);
  
  // 列出所有路由
  if (Object.keys(routes).length > 0) {
    console.log('\n路由映射:');
    Object.entries(routes).forEach(([prefix, port]) => {
      console.log(`  ${prefix}.sandbox.aie.sankuai.com -> localhost:${port}`);
    });
  }
}

main();