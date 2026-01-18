#!/usr/bin/env node
/**
 * 动态生成 Docker Compose 配置文件
 * 从 .instances.json 读取实例配置，生成完整的 docker-compose.yml
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const INSTANCES_FILE = path.join(PROJECT_ROOT, '.instances.json');
const DOCKER_COMPOSE_FILE = path.join(PROJECT_ROOT, 'docker-compose.yml');

// 读取实例配置
function loadInstances() {
  try {
    if (fs.existsSync(INSTANCES_FILE)) {
      const content = fs.readFileSync(INSTANCES_FILE, 'utf8');
      const data = JSON.parse(content);
      return data.instances || [];
    }
  } catch (err) {
    console.error(`错误: 无法读取 ${INSTANCES_FILE}:`, err.message);
  }
  return [];
}

// 生成 Docker Compose 服务配置
function generateServiceConfig(instance, index) {
  const serviceName = `vite-app-${index + 1}`;
  const containerName = `render-monitor-app-${instance.prefix}`;
  const hostPort = instance.port;
  const containerPort = 5174; // 容器内部始终使用 5174

  return `  # Vite 应用实例 ${index + 1} (通过 ${instance.prefix}.localhost 访问)
  # 容器内部监听 ${containerPort}，宿主机映射到 ${hostPort}
  ${serviceName}:
    build:
      context: ./packages/demo-app
      dockerfile: Dockerfile
    container_name: ${containerName}
    environment:
      - NODE_ENV=development
      - SUBDOMAIN_PREFIX=${instance.prefix}
      - PORT=${containerPort}
      - HOST=0.0.0.0
      - VITE_APP_PREFIX=${instance.prefix}
      - CI=true
    ports:
      - "${hostPort}:${containerPort}"
    volumes:
      - ./packages/demo-app:/app
      - /app/node_modules
    networks:
      - render-monitor-network
    command: sh -c "CI=true pnpm install && npm run dev -- --port ${containerPort} --host 0.0.0.0"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:${containerPort}/ || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3`;
}

// 生成完整的 Docker Compose 配置
function generateDockerCompose(instances) {
  const services = instances.map((instance, index) => 
    generateServiceConfig(instance, index)
  ).join('\n\n');

  return `version: '3.8'

services:
${services}

networks:
  render-monitor-network:
    driver: bridge

volumes:
  nginx_cache:
  nginx_logs:
`;
}

// 主函数
function main() {
  const instances = loadInstances();
  
  if (instances.length === 0) {
    console.error('错误: 没有找到实例配置');
    process.exit(1);
  }

  const dockerComposeContent = generateDockerCompose(instances);
  
  // 备份现有文件（如果存在）
  if (fs.existsSync(DOCKER_COMPOSE_FILE)) {
    const backupFile = `${DOCKER_COMPOSE_FILE}.backup.${Date.now()}`;
    fs.copyFileSync(DOCKER_COMPOSE_FILE, backupFile);
    console.log(`备份现有配置: ${backupFile}`);
  }

  // 写入新配置
  fs.writeFileSync(DOCKER_COMPOSE_FILE, dockerComposeContent, 'utf8');
  console.log(`✓ 已生成 docker-compose.yml (${instances.length} 个实例)`);
}

main();
