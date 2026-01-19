import { Service } from 'egg';
import * as VError from 'verror';
import { generatePrefix, generateUniquePrefix, validatePrefix } from '../utils/prefix-generator';

interface CreateInstanceOptions {
  prefix?: string; // 可选，如果不提供则自动生成
  port?: number; // 可选，如果不提供则自动分配
}

/**
 * 实例管理服务
 */
export default class InstanceService extends Service {
  /**
   * 创建新实例
   */
  async createInstance(options: CreateInstanceOptions = {}): Promise<any> {
    const configService = this.service.config;
    const dockerService = this.service.docker;
    
    try {
      // 1. 加载现有配置
      const config = await configService.loadInstancesConfig();
      const existingInstances = config.instances || [];
      const existingPrefixes = existingInstances.map((inst: any) => inst.prefix);
      
      // 2. 生成或验证前缀
      let prefix: string;
      if (options.prefix) {
        // 验证自定义前缀
        if (!validatePrefix(options.prefix)) {
          throw new Error('前缀格式无效（必须是小写字母和数字，至少8位）');
        }
        if (existingPrefixes.includes(options.prefix)) {
          throw new Error('前缀已存在');
        }
        prefix = options.prefix;
      } else {
        // 自动生成唯一前缀
        prefix = generateUniquePrefix(
          this.config.instance.prefixLength,
          existingPrefixes
        );
      }
      
      // 3. 分配端口
      const port = options.port || await configService.findAvailablePort(
        this.config.instance.defaultPort,
        existingInstances
      );
      
      // 检查端口是否被占用
      const portAvailable = await configService.checkPortAvailable(port);
      if (!portAvailable) {
        throw new Error(`端口 ${port} 已被占用`);
      }
      
      // 4. 创建实例配置
      const containerName = `render-monitor-app-${prefix}`;
      const instanceCount = existingInstances.length;
      const primaryColor = configService.getThemeColor(instanceCount);
      const timestamp = new Date().toISOString();
      
      const newInstance = {
        prefix,
        port,
        containerName,
        status: 'stopped',
        createdAt: timestamp,
        theme: {
          primaryColor,
        },
      };
      
      // 5. 更新实例配置
      const updatedInstances = [...existingInstances, newInstance];
      const nextPort = port + 1;
      
      await configService.saveInstancesConfig({
        ...config,
        instances: updatedInstances,
        nextPort,
      });
      
      this.logger.info(`[Instance] 已创建实例配置: ${prefix} (端口: ${port})`);
      
      // 6. 更新代理配置
      const proxyConfig = await configService.loadProxyConfig();
      proxyConfig.routes[prefix] = port;
      await configService.updateProxyConfig(proxyConfig.routes);
      
      this.logger.info(`[Instance] 已更新代理配置: ${prefix} -> ${port}`);
      
      // 7. 生成 Docker Compose 配置
      await dockerService.generateDockerCompose();
      
      // 8. 生成应用配置
      await dockerService.generateAppConfig();
      
      // 9. 生成 Nginx 配置（支持外部域名）
      await dockerService.generateNginxConfig();
      
      // 10. 启动 Docker 容器
      const serviceIndex = existingInstances.length;
      const serviceName = `vite-app-${serviceIndex + 1}`;
      
      await dockerService.startContainer(serviceName);
      
      // 11. 更新实例状态
      const finalConfig = await configService.loadInstancesConfig();
      const instanceIndex = finalConfig.instances.findIndex((inst: any) => inst.prefix === prefix);
      if (instanceIndex !== -1) {
        finalConfig.instances[instanceIndex].status = 'running';
        await configService.saveInstancesConfig(finalConfig);
      }
      
      // 12. 重载代理服务器
      await dockerService.reloadProxy();
      
      // 13. 返回实例信息
      const subdomainDomain = this.config.instance.subdomainDomain;
      
      return {
        prefix,
        port,
        containerName,
        status: 'running',
        url: `http://${prefix}.localhost`,
        externalUrl: `http://${prefix}.${subdomainDomain}`,
        createdAt: timestamp,
        theme: {
          primaryColor,
        },
      };
    } catch (err: any) {
      const verror = new VError({ cause: err }, '创建实例失败');
      throw verror;
    }
  }

  /**
   * 删除实例
   */
  async deleteInstance(prefix: string): Promise<void> {
    const configService = this.service.config;
    const dockerService = this.service.docker;
    
    try {
      // 1. 加载配置
      const config = await configService.loadInstancesConfig();
      const instances = config.instances || [];
      
      // 2. 查找实例
      const instanceIndex = instances.findIndex((inst: any) => inst.prefix === prefix);
      if (instanceIndex === -1) {
        throw new Error('实例不存在');
      }
      
      const instance = instances[instanceIndex];
      
      // 3. 停止并删除 Docker 容器
      await dockerService.removeContainer(instance.containerName);
      
      // 4. 从配置中移除实例
      const updatedInstances = instances.filter((inst: any) => inst.prefix !== prefix);
      await configService.saveInstancesConfig({
        ...config,
        instances: updatedInstances,
      });
      
      this.logger.info(`[Instance] 已从配置中移除实例: ${prefix}`);
      
      // 5. 更新代理配置
      const proxyConfig = await configService.loadProxyConfig();
      delete proxyConfig.routes[prefix];
      await configService.updateProxyConfig(proxyConfig.routes);
      
      // 6. 重新生成 Docker Compose 配置
      await dockerService.generateDockerCompose();
      
      // 7. 重新生成应用配置
      await dockerService.generateAppConfig();
      
      // 8. 重新生成 Nginx 配置
      await dockerService.generateNginxConfig();
      
      // 9. 重载代理服务器
      await dockerService.reloadProxy();
      
      this.logger.info(`[Instance] 实例已删除: ${prefix}`);
    } catch (err: any) {
      const verror = new VError({ cause: err }, '删除实例失败');
      throw verror;
    }
  }

  /**
   * 列出所有实例
   */
  async listInstances(): Promise<any[]> {
    const configService = this.service.config;
    const dockerService = this.service.docker;
    
    try {
      const config = await configService.loadInstancesConfig();
      const instances = config.instances || [];
      const subdomainDomain = this.config.instance.subdomainDomain;
      
      // 检查每个实例的实际运行状态
      const instancesWithStatus = await Promise.all(
        instances.map(async (instance: any) => {
          const containerStatus = await dockerService.getContainerStatus(instance.containerName);
          const actualStatus = containerStatus.running ? 'running' : 'stopped';
          
          // 如果状态不一致，更新配置
          if (instance.status !== actualStatus) {
            const updatedConfig = await configService.loadInstancesConfig();
            const instanceIndex = updatedConfig.instances.findIndex(
              (inst: any) => inst.prefix === instance.prefix
            );
            if (instanceIndex !== -1) {
              updatedConfig.instances[instanceIndex].status = actualStatus;
              await configService.saveInstancesConfig(updatedConfig);
            }
          }
          
          return {
            prefix: instance.prefix,
            port: instance.port,
            containerName: instance.containerName,
            status: actualStatus,
            url: `http://${instance.prefix}.localhost`,
            externalUrl: `http://${instance.prefix}.${subdomainDomain}`,
            createdAt: instance.createdAt,
            theme: instance.theme,
          };
        })
      );
      
      return instancesWithStatus;
    } catch (err: any) {
      const verror = new VError({ cause: err }, '获取实例列表失败');
      throw verror;
    }
  }

  /**
   * 获取实例详情
   */
  async getInstance(prefix: string): Promise<any> {
    const configService = this.service.config;
    const dockerService = this.service.docker;
    
    try {
      const config = await configService.loadInstancesConfig();
      const instances = config.instances || [];
      
      const instance = instances.find((inst: any) => inst.prefix === prefix);
      if (!instance) {
        throw new Error('实例不存在');
      }
      
      // 检查实际运行状态
      const containerStatus = await dockerService.getContainerStatus(instance.containerName);
      const actualStatus = containerStatus.running ? 'running' : 'stopped';
      
      const subdomainDomain = this.config.instance.subdomainDomain;
      
      return {
        prefix: instance.prefix,
        port: instance.port,
        containerName: instance.containerName,
        status: actualStatus,
        url: `http://${instance.prefix}.localhost`,
        externalUrl: `http://${instance.prefix}.${subdomainDomain}`,
        createdAt: instance.createdAt,
        theme: instance.theme,
      };
    } catch (err: any) {
      const verror = new VError({ cause: err }, '获取实例详情失败');
      throw verror;
    }
  }

  /**
   * 启动实例
   */
  async startInstance(prefix: string): Promise<any> {
    const configService = this.service.config;
    const dockerService = this.service.docker;
    
    try {
      const config = await configService.loadInstancesConfig();
      const instances = config.instances || [];
      
      const instanceIndex = instances.findIndex((inst: any) => inst.prefix === prefix);
      if (instanceIndex === -1) {
        throw new Error('实例不存在');
      }
      
      const instance = instances[instanceIndex];
      
      // 检查容器是否已经在运行
      const isRunning = await dockerService.isContainerRunning(instance.containerName);
      if (isRunning) {
        throw new Error('实例已在运行中');
      }
      
      // 启动容器
      const serviceIndex = instanceIndex;
      const serviceName = `vite-app-${serviceIndex + 1}`;
      await dockerService.startContainer(serviceName);
      
      // 更新状态
      instance.status = 'running';
      config.instances[instanceIndex] = instance;
      await configService.saveInstancesConfig(config);
      
      // 重载代理服务器
      await dockerService.reloadProxy();
      
      const subdomainDomain = this.config.instance.subdomainDomain;
      
      return {
        prefix: instance.prefix,
        port: instance.port,
        containerName: instance.containerName,
        status: 'running',
        url: `http://${instance.prefix}.localhost`,
        externalUrl: `http://${instance.prefix}.${subdomainDomain}`,
      };
    } catch (err: any) {
      const verror = new VError({ cause: err }, '启动实例失败');
      throw verror;
    }
  }

  /**
   * 停止实例
   */
  async stopInstance(prefix: string): Promise<any> {
    const configService = this.service.config;
    const dockerService = this.service.docker;
    
    try {
      const config = await configService.loadInstancesConfig();
      const instances = config.instances || [];
      
      const instanceIndex = instances.findIndex((inst: any) => inst.prefix === prefix);
      if (instanceIndex === -1) {
        throw new Error('实例不存在');
      }
      
      const instance = instances[instanceIndex];
      
      // 检查容器是否在运行
      const isRunning = await dockerService.isContainerRunning(instance.containerName);
      if (!isRunning) {
        throw new Error('实例未在运行');
      }
      
      // 停止容器
      await dockerService.removeContainer(instance.containerName);
      
      // 更新状态
      instance.status = 'stopped';
      config.instances[instanceIndex] = instance;
      await configService.saveInstancesConfig(config);
      
      // 重载代理服务器
      await dockerService.reloadProxy();
      
      const subdomainDomain = this.config.instance.subdomainDomain;
      
      return {
        prefix: instance.prefix,
        port: instance.port,
        containerName: instance.containerName,
        status: 'stopped',
        url: `http://${instance.prefix}.localhost`,
        externalUrl: `http://${instance.prefix}.${subdomainDomain}`,
      };
    } catch (err: any) {
      const verror = new VError({ cause: err }, '停止实例失败');
      throw verror;
    }
  }
}