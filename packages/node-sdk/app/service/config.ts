import { Service } from 'egg';
import * as fs from 'fs';
import * as path from 'path';
import * as VError from 'verror';

/**
 * 配置管理服务
 */
export default class ConfigService extends Service {
  /**
   * 读取实例配置文件
   */
  async loadInstancesConfig(): Promise<any> {
    const { instancesFile } = this.config.instance;
    
    try {
      if (!fs.existsSync(instancesFile)) {
        // 如果文件不存在，返回默认配置
        return {
          instances: [],
          nextPort: this.config.instance.defaultPort,
          themePool: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
        };
      }
      
      const content = fs.readFileSync(instancesFile, 'utf8');
      const data = JSON.parse(content);
      return data;
    } catch (err: any) {
      const verror = new VError({ cause: err }, '读取实例配置文件失败');
      throw verror;
    }
  }

  /**
   * 保存实例配置文件
   */
  async saveInstancesConfig(data: any): Promise<void> {
    const { instancesFile } = this.config.instance;
    
    try {
      // 确保目录存在
      const dir = path.dirname(instancesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // 写入文件
      fs.writeFileSync(instancesFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (err: any) {
      const verror = new VError({ cause: err }, '保存实例配置文件失败');
      throw verror;
    }
  }

  /**
   * 读取代理配置文件
   */
  async loadProxyConfig(): Promise<any> {
    const { proxyConfigFile } = this.config.instance;
    
    try {
      if (!fs.existsSync(proxyConfigFile)) {
        return {
          routes: {},
          updatedAt: new Date().toISOString(),
        };
      }
      
      const content = fs.readFileSync(proxyConfigFile, 'utf8');
      const data = JSON.parse(content);
      return data;
    } catch (err: any) {
      const verror = new VError({ cause: err }, '读取代理配置文件失败');
      throw verror;
    }
  }

  /**
   * 更新代理配置文件
   */
  async updateProxyConfig(routes: Record<string, number>): Promise<void> {
    const { proxyConfigFile } = this.config.instance;
    
    try {
      // 确保目录存在
      const dir = path.dirname(proxyConfigFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const config = {
        routes,
        updatedAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(proxyConfigFile, JSON.stringify(config, null, 2), 'utf8');
    } catch (err: any) {
      const verror = new VError({ cause: err }, '更新代理配置文件失败');
      throw verror;
    }
  }

  /**
   * 查找可用端口
   * @param startPort 起始端口
   * @param existingInstances 现有实例列表
   * @returns 可用端口号
   */
  async findAvailablePort(startPort: number, existingInstances: any[]): Promise<number> {
    const usedPorts = new Set(existingInstances.map((inst: any) => inst.port));
    
    let port = startPort;
    const maxPort = 60000; // 最大端口号
    
    // 首先尝试从配置中的 nextPort 开始
    const config = await this.loadInstancesConfig();
    if (config.nextPort && !usedPorts.has(config.nextPort)) {
      port = config.nextPort;
    } else {
      // 否则从已使用端口中找最大值，然后加1
      const maxUsedPort = existingInstances.length > 0
        ? Math.max(...existingInstances.map((inst: any) => inst.port))
        : startPort - 1;
      port = maxUsedPort + 1;
    }
    
    // 检查端口是否被占用
    while (port <= maxPort) {
      if (!usedPorts.has(port) && await this.checkPortAvailable(port)) {
        return port;
      }
      port++;
    }
    
    throw new Error('无法找到可用端口');
  }

  /**
   * 检查端口是否可用
   */
  async checkPortAvailable(port: number): Promise<boolean> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      // 使用 lsof 检查端口占用（macOS/Linux）
      const { stdout } = await execAsync(`lsof -Pi :${port} -sTCP:LISTEN -t 2>/dev/null || echo ""`);
      // 如果 stdout 为空，说明端口未被占用
      return !stdout || !stdout.trim();
    } catch (err: any) {
      // 如果命令执行失败（通常是端口未被占用），返回 true
      // 检查是否是因为端口未被占用而导致的错误（exit code 1）
      if (err.code === 1) {
        return true;
      }
      // 其他错误，返回 false 以安全处理
      this.logger.warn(`[Config] 检查端口 ${port} 时出现错误:`, err.message);
      return false;
    }
  }

  /**
   * 获取主题颜色（循环使用）
   */
  getThemeColor(index: number): string {
    const themePool = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
    return themePool[index % themePool.length];
  }
}