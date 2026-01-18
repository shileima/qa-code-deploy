import { MessageBridge } from './MessageBridge';
import { RenderMonitor } from './RenderMonitor';
import { RouteMonitor } from './RouteMonitor';
import { ErrorHandler } from './ErrorHandler';

export interface RenderMonitorSDKOptions {
  targetOrigin?: string;
}

export class RenderMonitorSDK {
  private messageBridge: MessageBridge;
  private renderMonitor: RenderMonitor;
  private routeMonitor: RouteMonitor;
  private errorHandler: ErrorHandler;
  private isInitialized: boolean = false;

  constructor(options: RenderMonitorSDKOptions = {}) {
    const { targetOrigin = '*' } = options;
    this.messageBridge = new MessageBridge(targetOrigin);
    this.renderMonitor = new RenderMonitor(this.messageBridge);
    this.routeMonitor = new RouteMonitor(this.messageBridge);
    this.errorHandler = new ErrorHandler(this.messageBridge);
  }

  /**
   * 初始化 SDK
   */
  init(): void {
    if (this.isInitialized) {
      console.warn('[RenderMonitorSDK] SDK 已经初始化');
      return;
    }

    // 检查是否在 iframe 中
    if (!this.messageBridge.isInIframe()) {
      console.warn('[RenderMonitorSDK] 当前不在 iframe 中，某些功能可能无法正常工作');
    }

    // 初始化各个模块
    this.errorHandler.init();
    this.renderMonitor.init();
    this.routeMonitor.init();

    this.isInitialized = true;
    console.log('[RenderMonitorSDK] 初始化完成');
  }

  /**
   * 销毁 SDK
   */
  destroy(): void {
    this.renderMonitor.destroy();
    this.routeMonitor.destroy();
    this.errorHandler.restore();
    this.isInitialized = false;
  }
}

// 导出默认实例创建函数
export const createRenderMonitor = (options?: RenderMonitorSDKOptions): RenderMonitorSDK => {
  return new RenderMonitorSDK(options);
};

// 全局暴露（用于浏览器环境）
if (typeof window !== 'undefined') {
  (window as any).RenderMonitorSDK = RenderMonitorSDK;
  (window as any).createRenderMonitor = createRenderMonitor;
}

export default RenderMonitorSDK;
