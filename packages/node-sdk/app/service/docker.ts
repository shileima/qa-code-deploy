import { Service } from 'egg';
import * as VError from 'verror';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Docker 操作服务
 */
export default class DockerService extends Service {
  /**
   * 执行 Docker 命令
   */
  async execDockerCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const options: any = {
        timeout: 60000, // 60秒超时
        maxBuffer: 10 * 1024 * 1024, // 10MB
      };
      
      if (cwd) {
        options.cwd = cwd;
      }
      
      const result = await execAsync(command, options);
      return result;
    } catch (err: any) {
      const verror = new VError({ cause: err }, `Docker 命令执行失败: ${command}`);
      throw verror;
    }
  }

  /**
   * 生成 Docker Compose 配置
   */
  async generateDockerCompose(): Promise<void> {
    const { generateScriptPath, projectRoot } = this.config.instance;
    
    try {
      // 使用绝对路径执行脚本
      const scriptPath = require('path').resolve(generateScriptPath);
      await this.execDockerCommand(`node "${scriptPath}"`, projectRoot);
      this.logger.info('[Docker] Docker Compose 配置已生成');
    } catch (err: any) {
      this.logger.error('[Docker] 生成 Docker Compose 配置失败', err);
      throw err;
    }
  }

  /**
   * 生成应用配置
   */
  async generateAppConfig(): Promise<void> {
    const { generateAppConfigScriptPath, projectRoot } = this.config.instance;
    
    try {
      // 使用绝对路径执行脚本
      const scriptPath = require('path').resolve(generateAppConfigScriptPath);
      await this.execDockerCommand(`node "${scriptPath}"`, projectRoot);
      this.logger.info('[Docker] 应用配置已生成');
    } catch (err: any) {
      // 应用配置生成失败不是致命错误，只记录警告
      this.logger.warn('[Docker] 生成应用配置失败（非致命错误）', err);
    }
  }

  /**
   * 生成 Nginx 配置（支持外部域名）
   */
  async generateNginxConfig(): Promise<void> {
    const { generateNginxScriptPath, projectRoot } = this.config.instance;
    
    try {
      // 使用绝对路径执行脚本
      const scriptPath = require('path').resolve(generateNginxScriptPath);
      await this.execDockerCommand(`node "${scriptPath}"`, projectRoot);
      this.logger.info('[Docker] Nginx 配置已生成');
    } catch (err: any) {
      // Nginx 配置生成失败不是致命错误，只记录警告
      this.logger.warn('[Docker] 生成 Nginx 配置失败（非致命错误）', err);
    }
  }

  /**
   * 启动 Docker 容器
   * @param serviceName Docker Compose 服务名
   */
  async startContainer(serviceName: string): Promise<void> {
    const { dockerComposeFile, projectRoot } = this.config.instance;
    const dockerComposeDir = projectRoot;
    const path = require('path');
    
    try {
      // 检查 docker-compose.yml 是否存在
      const fs = require('fs');
      const composeFilePath = path.resolve(dockerComposeFile);
      if (!fs.existsSync(composeFilePath)) {
        throw new Error('docker-compose.yml 文件不存在，请先生成配置');
      }
      
      // 启动指定的服务（使用绝对路径）
      const command = `docker compose -f "${composeFilePath}" up -d ${serviceName}`;
      await this.execDockerCommand(command, dockerComposeDir);
      
      // 等待容器启动
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      this.logger.info(`[Docker] 容器 ${serviceName} 已启动`);
    } catch (err: any) {
      this.logger.error(`[Docker] 启动容器 ${serviceName} 失败`, err);
      throw err;
    }
  }

  /**
   * 停止并删除 Docker 容器
   * @param containerName 容器名称
   */
  async removeContainer(containerName: string): Promise<void> {
    try {
      // 先停止容器
      try {
        await this.execDockerCommand(`docker stop ${containerName}`);
        this.logger.info(`[Docker] 容器 ${containerName} 已停止`);
      } catch (err: any) {
        // 容器可能已经停止，继续执行删除
        this.logger.warn(`[Docker] 停止容器 ${containerName} 时出现警告`, err.message);
      }
      
      // 删除容器
      try {
        await this.execDockerCommand(`docker rm ${containerName}`);
        this.logger.info(`[Docker] 容器 ${containerName} 已删除`);
      } catch (err: any) {
        // 容器可能不存在，记录警告但不抛出错误
        this.logger.warn(`[Docker] 删除容器 ${containerName} 时出现警告`, err.message);
      }
    } catch (err: any) {
      this.logger.error(`[Docker] 删除容器 ${containerName} 失败`, err);
      throw err;
    }
  }

  /**
   * 检查容器状态
   * @param containerName 容器名称
   * @returns 容器是否运行中
   */
  async isContainerRunning(containerName: string): Promise<boolean> {
    try {
      const { stdout } = await this.execDockerCommand(
        `docker ps --filter "name=${containerName}" --format "{{.Names}}"`
      );
      return stdout.trim() === containerName;
    } catch (err: any) {
      return false;
    }
  }

  /**
   * 获取容器状态
   * @param containerName 容器名称
   * @returns 容器状态信息
   */
  async getContainerStatus(containerName: string): Promise<{ running: boolean; status?: string }> {
    try {
      const running = await this.isContainerRunning(containerName);
      if (running) {
        const { stdout } = await this.execDockerCommand(
          `docker inspect --format='{{.State.Status}}' ${containerName}`
        );
        return { running: true, status: stdout.trim() };
      }
      return { running: false };
    } catch (err: any) {
      return { running: false };
    }
  }

  /**
   * 重载代理服务器
   */
  async reloadProxy(): Promise<void> {
    const { proxyScriptPath } = this.config.instance;
    const path = require('path');
    
    try {
      // 查找 subdomain-proxy.js 进程（使用脚本文件名）
      const scriptName = path.basename(proxyScriptPath);
      let stdout = '';
      try {
        const result = await this.execDockerCommand(
          `pgrep -f "${scriptName}" || echo ""`
        );
        stdout = result.stdout;
      } catch (err: any) {
        // pgrep 未找到进程会返回非零退出码，这是正常的
        stdout = '';
      }
      
      const pids = stdout.trim().split('\n').filter((pid: string) => pid && /^\d+$/.test(pid));
      
      if (pids.length === 0) {
        this.logger.warn('[Docker] 未找到代理服务器进程，跳过重载');
        return;
      }
      
      // 发送 SIGHUP 信号到所有匹配的进程
      for (const pid of pids) {
        try {
          await this.execDockerCommand(`kill -HUP ${pid}`);
          this.logger.info(`[Docker] 已发送重载信号到代理服务器 (PID: ${pid})`);
        } catch (err: any) {
          this.logger.warn(`[Docker] 重载代理服务器失败 (PID: ${pid})`, err.message);
        }
      }
    } catch (err: any) {
      // 重载失败不是致命错误，只记录警告
      this.logger.warn('[Docker] 重载代理服务器时出现错误', err);
    }
  }
}