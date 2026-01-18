#!/usr/bin/env node
/**
 * 动态生成应用配置（urlConfig.js）
 * 从 .instances.json 读取实例配置，更新 APP_CONFIGS
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const INSTANCES_FILE = path.join(PROJECT_ROOT, '.instances.json');
const URL_CONFIG_FILE = path.join(PROJECT_ROOT, 'packages/demo-app/src/utils/urlConfig.js');

// 预定义主题颜色池
const THEME_COLORS = [
  { primary: '#3b82f6', secondary: '#60a5fa', bg: '#ffffff' }, // blue
  { primary: '#10b981', secondary: '#34d399', bg: '#f9fafb' }, // green
  { primary: '#ef4444', secondary: '#f87171', bg: '#ffffff' }, // red
  { primary: '#f59e0b', secondary: '#fbbf24', bg: '#fffbeb' }, // yellow
  { primary: '#8b5cf6', secondary: '#a78bfa', bg: '#f5f3ff' }, // purple
  { primary: '#ec4899', secondary: '#f472b6', bg: '#fdf2f8' }, // pink
  { primary: '#06b6d4', secondary: '#22d3ee', bg: '#ecfeff' }, // cyan
  { primary: '#84cc16', secondary: '#a3e635', bg: '#f7fee7' }, // lime
];

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

// 获取主题颜色（循环使用）
function getThemeColor(index) {
  return THEME_COLORS[index % THEME_COLORS.length];
}

// 生成应用配置对象
function generateAppConfig(instance, index) {
  // 获取主题颜色（从实例配置或主题池）
  let themeObj;
  if (instance.theme && instance.theme.primaryColor) {
    // 如果实例只有 primaryColor，从主题池获取完整主题
    const themeColor = getThemeColor(index);
    themeObj = {
      primary: instance.theme.primaryColor || themeColor.primary,
      secondary: themeColor.secondary,
      bg: themeColor.bg
    };
  } else {
    themeObj = getThemeColor(index);
  }
  
  const appName = instance.appName || `应用实例 ${String.fromCharCode(65 + index)}`;
  const appId = `app-${instance.prefix}`;

  return `  // 实例 ${String.fromCharCode(65 + index)} 的配置 (${instance.prefix})
  '${instance.prefix}': {
    appName: '${appName}',
    appId: '${appId}',
    theme: {
      primaryColor: '${themeObj.primary}',
      secondaryColor: '${themeObj.secondary}',
      backgroundColor: '${themeObj.bg}'
    },
    features: {
      showFeatureA: ${index % 2 === 0 ? 'true' : 'false'},
      showFeatureB: ${index % 2 === 1 ? 'true' : 'false'},
      showFeatureC: true
    },
    apiEndpoint: 'https://api-${instance.prefix}.example.com',
    analytics: {
      enabled: true,
      trackingId: 'UA-${instance.prefix.toUpperCase()}-001'
    }
  }`;
}

// 读取现有 urlConfig.js 文件
function readUrlConfig() {
  try {
    return fs.readFileSync(URL_CONFIG_FILE, 'utf8');
  } catch (err) {
    console.error(`错误: 无法读取 ${URL_CONFIG_FILE}:`, err.message);
    process.exit(1);
  }
}

// 更新 APP_CONFIGS 部分
function updateAppConfigs(content, instances) {
  // 查找 APP_CONFIGS 的开始和结束位置
  const startMarker = 'const APP_CONFIGS = {';
  const endMarker = '};';
  
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    console.error('错误: 无法找到 APP_CONFIGS 定义');
    process.exit(1);
  }

  // 查找第一个 };（在 APP_CONFIGS 之后）
  let braceCount = 0;
  let inConfig = false;
  let endIndex = startIndex;

  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inConfig = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inConfig && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }

  // 生成新的配置内容
  const configEntries = instances.map((instance, index) => 
    generateAppConfig(instance, index)
  ).join(',\n\n');

  // 保留默认配置
  const defaultConfig = `  // 默认配置（用于本地开发或其他环境）
  default: {
    appName: '默认应用',
    appId: 'app-default',
    theme: {
      primaryColor: '#6366f1',
      secondaryColor: '#818cf8',
      backgroundColor: '#ffffff'
    },
    features: {
      showFeatureA: true,
      showFeatureB: true,
      showFeatureC: true
    },
    apiEndpoint: 'http://localhost:3000/api',
    analytics: {
      enabled: false,
      trackingId: null
    }
  }`;

  const newConfigSection = `${startMarker}\n${configEntries},\n\n${defaultConfig}\n${endMarker}`;

  // 替换配置部分
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);

  return before + newConfigSection + after;
}

// 主函数
function main() {
  const instances = loadInstances();
  
  if (instances.length === 0) {
    console.log('警告: 没有找到实例配置，跳过更新');
    return;
  }

  // 读取现有配置
  let content = readUrlConfig();

  // 备份文件
  const backupFile = `${URL_CONFIG_FILE}.backup.${Date.now()}`;
  fs.copyFileSync(URL_CONFIG_FILE, backupFile);
  console.log(`备份现有配置: ${backupFile}`);

  // 更新配置
  content = updateAppConfigs(content, instances);

  // 写入新配置
  fs.writeFileSync(URL_CONFIG_FILE, content, 'utf8');
  console.log(`✓ 已更新 urlConfig.js (${instances.length} 个实例配置)`);
}

main();
