import { MessageBridge } from './MessageBridge';
import { RouteChangeData } from './types';

export class RouteMonitor {
  private messageBridge: MessageBridge;
  private currentUrl: string;
  private routeHistory: RouteChangeData[] = [];
  private observer: MutationObserver | null = null;
  private isInitialized: boolean = false;

  constructor(messageBridge: MessageBridge) {
    this.messageBridge = messageBridge;
    this.currentUrl = window.location.href;
  }

  /**
   * 初始化路由监控
   */
  init(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupHashChange();
    this.setupPopState();
    this.setupDOMObserver();
    this.isInitialized = true;
  }

  /**
   * 获取路由模式
   */
  private getRouterMode(): 'hash' | 'history' | 'default' {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#/')) {
      return 'hash';
    }
    if (window.location.pathname !== '/') {
      return 'history';
    }
    return 'default';
  }

  /**
   * 获取路由路径
   */
  private getRouterPath(): string {
    const mode = this.getRouterMode();
    if (mode === 'hash') {
      const hash = window.location.hash;
      return '/' + (hash.split('#/')[1] || '');
    }
    return window.location.pathname;
  }

  /**
   * 处理路由变化
   */
  private handleRouteChange(triggerType: string): void {
    const newUrl = window.location.href;
    if (newUrl === this.currentUrl) {
      return;
    }

    this.currentUrl = newUrl;

    const routeData: RouteChangeData = {
      routerMode: this.getRouterMode(),
      routerPath: this.getRouterPath(),
      triggerType
    };

    this.routeHistory.push({ ...routeData, triggerType });
    this.messageBridge.send('route.change', routeData);
  }

  /**
   * 设置 hashchange 监听
   */
  private setupHashChange(): void {
    window.addEventListener('hashchange', () => {
      this.handleRouteChange('hashchange');
    });
  }

  /**
   * 设置 popstate 监听
   */
  private setupPopState(): void {
    window.addEventListener('popstate', () => {
      this.handleRouteChange('popstate');
    });
  }

  /**
   * 设置 DOM 观察器（用于检测 React Router 变化）
   */
  private setupDOMObserver(): void {
    this.observer = new MutationObserver(() => {
      const newUrl = window.location.href;
      if (newUrl !== this.currentUrl) {
        this.handleRouteChange('react-router-change');
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 定期检查 URL 变化（作为备用方案）
    setInterval(() => {
      const newUrl = window.location.href;
      if (newUrl !== this.currentUrl) {
        this.handleRouteChange('url-check');
      }
    }, 500);
  }

  /**
   * 获取路由历史
   */
  getRouteHistory(): RouteChangeData[] {
    return [...this.routeHistory];
  }

  /**
   * 销毁监控
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isInitialized = false;
  }
}
