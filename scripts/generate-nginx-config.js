#!/usr/bin/env node
/**
 * Nginx 配置生成脚本
 * 根据实例列表动态生成 Nginx 配置文件
 */

const fs = require('fs');
const path = require('path');

// 颜色输出（Node.js）
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 读取实例配置
function loadInstances() {
  const instancesFile = path.join(__dirname, '..', '.instances.json');
  
  if (!fs.existsSync(instancesFile)) {
    log('实例配置文件不存在，创建默认配置...', 'yellow');
    const defaultInstances = {
      instances: [
        { prefix: 'mttf3dq7wrg9on', port: 5174 },
        { prefix: 'mteyg1wky8uqgs', port: 5175 }
      ]
    };
    fs.writeFileSync(instancesFile, JSON.stringify(defaultInstances, null, 2));
    return defaultInstances;
  }
  
  try {
    const content = fs.readFileSync(instancesFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log(`读取实例配置文件失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 生成 map 指令（用于动态路由）
function generateMapDirective(instances, type = 'port') {
  if (type === 'port') {
    let map = '    map $host $backend_port {\n';
    map += '        default 5174;\n';
    instances.forEach(instance => {
      map += `        ~^${instance.prefix}\\. ${instance.port};\n`;
    });
    map += '    }\n';
    return map;
  } else if (type === 'host') {
    let map = '    map $host $backend_host {\n';
    map += '        default localhost;\n';
    instances.forEach(instance => {
      map += `        ~^${instance.prefix}\\. localhost;\n`;
    });
    map += '    }\n';
    return map;
  }
  return '';
}

// 生成服务器块配置
function generateServerBlock(instance, isHttps = false) {
  const listen = isHttps ? '443 ssl http2' : '80';
  const sslConfig = isHttps ? `
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;` : '';
  
  return `
    server {
        listen ${listen};
        server_name ${instance.prefix}.localhost ${instance.prefix}.*;

        ${sslConfig}

        location / {
            proxy_pass http://localhost:${instance.port};
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_buffering off;
        }
    }`;
}

// 生成开发环境 Nginx 配置
function generateDevConfig(instances) {
  const mapPort = generateMapDirective(instances, 'port');
  const mapHost = generateMapDirective(instances, 'host');
  
  return `# Nginx 开发环境配置（自动生成）
# 生成时间: ${new Date().toISOString()}
# 实例数量: ${instances.length}

worker_processes 1;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'host="$host" backend="$backend_port"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # 动态路由映射
${mapPort}${mapHost}
    # WebSocket 升级配置
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # 默认服务器配置
    server {
        listen 80;
        server_name _;
        
        client_max_body_size 10M;

        location / {
            proxy_pass http://$backend_host:$backend_port;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_buffering off;
        }

        location /health {
            access_log off;
            return 200 "healthy\\n";
            add_header Content-Type text/plain;
        }
    }

    # 特定子域名配置
${instances.map(instance => generateServerBlock(instance, false)).join('')}
}
`;
}

// 生成生产环境 Nginx 配置
function generateProdConfig(instances) {
  const mapPort = generateMapDirective(instances, 'port');
  const mapHost = generateMapDirective(instances, 'host');
  
  return `# Nginx 生产环境配置（自动生成）
# 生成时间: ${new Date().toISOString()}
# 实例数量: ${instances.length}

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

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'host="$host" backend="$backend_port"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    client_max_body_size 10M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # 动态路由映射
${mapPort}${mapHost}
    # WebSocket 升级配置
    map $http_upgrade $connection_upgrade {
        default upgrade;
        '' close;
    }

    # HTTP 服务器配置（重定向到 HTTPS）
    server {
        listen 80;
        server_name *.sandbox.nocode.sankuai.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS 服务器配置
    server {
        listen 443 ssl http2;
        server_name *.sandbox.nocode.sankuai.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        client_max_body_size 10M;

        location / {
            proxy_pass http://$backend_host:$backend_port;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
        }
    }

    # 特定子域名配置
${instances.map(instance => generateServerBlock(instance, true)).join('')}
}
`;
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const env = args[0] || 'dev';
  const outputFile = args[1];
  
  if (!['dev', 'prod'].includes(env)) {
    log('用法: node generate-nginx-config.js [dev|prod] [output-file]', 'red');
    process.exit(1);
  }
  
  log('读取实例配置...', 'blue');
  const config = loadInstances();
  const instances = config.instances || [];
  
  if (instances.length === 0) {
    log('没有找到实例配置', 'yellow');
    process.exit(1);
  }
  
  log(`找到 ${instances.length} 个实例:`, 'green');
  instances.forEach(instance => {
    log(`  - ${instance.prefix}:${instance.port}`, 'blue');
  });
  
  log(`\n生成 ${env === 'dev' ? '开发' : '生产'}环境配置...`, 'blue');
  
  const nginxConfig = env === 'dev' 
    ? generateDevConfig(instances)
    : generateProdConfig(instances);
  
  // 确定输出文件
  const outputPath = outputFile 
    ? path.resolve(outputFile)
    : path.join(__dirname, '..', 'nginx', env, 'nginx.conf');
  
  // 确保目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 写入文件
  fs.writeFileSync(outputPath, nginxConfig, 'utf-8');
  
  log(`\n✓ 配置文件已生成: ${outputPath}`, 'green');
  
  // 验证配置（如果 nginx 命令可用）
  if (require('child_process').spawnSync('nginx', ['-t', '-c', outputPath]).status === 0) {
    log('✓ Nginx 配置验证通过', 'green');
  } else {
    log('⚠ Nginx 配置验证失败（如果未安装 nginx，可忽略此警告）', 'yellow');
  }
}

main();
