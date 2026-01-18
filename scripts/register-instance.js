#!/usr/bin/env node
/**
 * 实例注册脚本
 * 实例启动时注册到中央注册表，支持实例发现和健康检查
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const REGISTRY_FILE = path.join(__dirname, '..', '.instance-registry.json');

// 初始化注册表
function initRegistry() {
  if (!fs.existsSync(REGISTRY_FILE)) {
    const registry = {
      instances: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
  }
}

// 读取注册表
function loadRegistry() {
  initRegistry();
  try {
    const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { instances: [], lastUpdated: new Date().toISOString() };
  }
}

// 保存注册表
function saveRegistry(registry) {
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
}

// 注册实例
function registerInstance(prefix, port, metadata = {}) {
  const registry = loadRegistry();
  
  // 检查实例是否已存在
  const existingIndex = registry.instances.findIndex(
    inst => inst.prefix === prefix && inst.port === port
  );
  
  const instance = {
    prefix,
    port,
    host: metadata.host || 'localhost',
    status: 'running',
    registeredAt: new Date().toISOString(),
    lastHealthCheck: new Date().toISOString(),
    ...metadata
  };
  
  if (existingIndex >= 0) {
    // 更新现有实例
    registry.instances[existingIndex] = instance;
  } else {
    // 添加新实例
    registry.instances.push(instance);
  }
  
  saveRegistry(registry);
  console.log(`✓ 实例已注册: ${prefix}:${port}`);
}

// 注销实例
function unregisterInstance(prefix, port) {
  const registry = loadRegistry();
  registry.instances = registry.instances.filter(
    inst => !(inst.prefix === prefix && inst.port === port)
  );
  saveRegistry(registry);
  console.log(`✓ 实例已注销: ${prefix}:${port}`);
}

// 健康检查
function healthCheck(port, timeout = 5000) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, { timeout }, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 更新实例健康状态
async function updateHealthStatus(prefix, port) {
  const registry = loadRegistry();
  const instance = registry.instances.find(
    inst => inst.prefix === prefix && inst.port === port
  );
  
  if (!instance) {
    return false;
  }
  
  const isHealthy = await healthCheck(port);
  instance.status = isHealthy ? 'running' : 'stopped';
  instance.lastHealthCheck = new Date().toISOString();
  
  saveRegistry(registry);
  return isHealthy;
}

// 列出所有实例
function listInstances() {
  const registry = loadRegistry();
  console.log('\n注册的实例:');
  console.log('─'.repeat(60));
  
  if (registry.instances.length === 0) {
    console.log('  没有注册的实例');
    return;
  }
  
  registry.instances.forEach(inst => {
    const status = inst.status === 'running' ? '✓' : '✗';
    console.log(`  ${status} ${inst.prefix}:${inst.port} (${inst.status})`);
    console.log(`    注册时间: ${inst.registeredAt}`);
    console.log(`    最后检查: ${inst.lastHealthCheck}`);
  });
  
  console.log('─'.repeat(60));
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'register':
      registerInstance(args[1], parseInt(args[2], 10), {
        host: args[3] || 'localhost'
      });
      break;
      
    case 'unregister':
      unregisterInstance(args[1], parseInt(args[2], 10));
      break;
      
    case 'health':
      updateHealthStatus(args[1], parseInt(args[2], 10))
        .then(isHealthy => {
          console.log(`健康检查: ${isHealthy ? '通过' : '失败'}`);
        });
      break;
      
    case 'list':
      listInstances();
      break;
      
    default:
      console.log('用法:');
      console.log('  register <prefix> <port> [host]  - 注册实例');
      console.log('  unregister <prefix> <port>       - 注销实例');
      console.log('  health <prefix> <port>           - 健康检查');
      console.log('  list                             - 列出所有实例');
      break;
  }
}

main();
