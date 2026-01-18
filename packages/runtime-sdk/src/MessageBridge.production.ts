import { MessageType } from './types';

/**
 * 生产环境扩展的 MessageBridge
 * 支持 HTTP API 上报和 postMessage 两种方式
 */
export interface MessageBridgeOptions {
  targetOrigin?: string;
  apiEndpoint?: string;
  enablePostMessage?: boolean;
  sampleRate?: number; // 采样率 0-1
  retries?: number; // 重试次数
}

export class ProductionMessageBridge {
  private targetOrigin: string;
  private apiEndpoint?: string;
  private enablePostMessage: boolean;
  private sampleRate: number;
  private retries: number;
  private retryQueue: Array<{ message: any; timestamp: number }> = [];

  constructor(options: MessageBridgeOptions = {}) {
    this.targetOrigin = options.targetOrigin || '*';
    this.apiEndpoint = options.apiEndpoint;
    this.enablePostMessage = options.enablePostMessage !== false;
    this.sampleRate = options.sampleRate ?? 1.0;
    this.retries = options.retries ?? 3;

    // 初始化重试队列处理
    if (this.apiEndpoint) {
      this.initRetryQueue();
    }
  }

  /**
   * 发送消息
   */
  send(type: MessageType, data: any): void {
    // 采样率控制
    if (Math.random() > this.sampleRate) {
      return;
    }

    const message = {
      type,
      data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    // 发送到父窗口（如果在 iframe 中且启用）
    if (this.enablePostMessage && window.parent) {
      try {
        window.parent.postMessage(message, this.targetOrigin);
      } catch (error) {
        console.warn('[RenderMonitorSDK] postMessage 失败:', error);
      }
    }

    // 上报到后端 API
    if (this.apiEndpoint) {
      this.reportToAPI(message);
    }
  }

  /**
   * 上报到 API
   */
  private async reportToAPI(message: any): Promise<void> {
    try {
      const response = await fetch(this.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        keepalive: true, // 不阻塞页面卸载
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // 失败后加入重试队列
      this.retryQueue.push({
        message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 初始化重试队列处理
   */
  private initRetryQueue(): void {
    // 定期处理重试队列
    setInterval(() => {
      this.processRetryQueue();
    }, 10000); // 每10秒处理一次

    // 页面卸载前尝试发送
    window.addEventListener('beforeunload', () => {
      this.processRetryQueue(true);
    });

    // 从 localStorage 恢复未发送的消息
    this.restoreFromStorage();
  }

  /**
   * 处理重试队列
   */
  private async processRetryQueue(sync = false): Promise<void> {
    if (this.retryQueue.length === 0) {
      return;
    }

    const now = Date.now();
    const toRetry = this.retryQueue.filter(
      item => now - item.timestamp < 3600000 // 1小时内
    );

    for (const item of toRetry) {
      try {
        if (sync) {
          // 同步发送（使用 sendBeacon）
          navigator.sendBeacon(
            this.apiEndpoint!,
            JSON.stringify(item.message)
          );
        } else {
          await this.reportToAPI(item.message);
        }
        
        // 成功后从队列移除
        this.retryQueue = this.retryQueue.filter(
          q => q !== item
        );
      } catch (error) {
        // 继续重试
        console.warn('[RenderMonitorSDK] 重试失败:', error);
      }
    }

    // 保存到 localStorage
    this.saveToStorage();
  }

  /**
   * 保存到 localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        '_render_monitor_queue',
        JSON.stringify(this.retryQueue)
      );
    } catch (error) {
      // 忽略存储错误
    }
  }

  /**
   * 从 localStorage 恢复
   */
  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem('_render_monitor_queue');
      if (stored) {
        this.retryQueue = JSON.parse(stored);
        localStorage.removeItem('_render_monitor_queue');
      }
    } catch (error) {
      // 忽略恢复错误
    }
  }

  /**
   * 检查是否在 iframe 中
   */
  isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }
}
