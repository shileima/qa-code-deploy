import { MessageBridge } from './MessageBridge';
import { RenderCompleteData } from './types';

export class RenderMonitor {
  private messageBridge: MessageBridge;
  private observer: MutationObserver | null = null;
  private startTime: number;
  private isRenderComplete: boolean = false;
  private checkTimeout: number | null = null;
  private readonly RENDER_TIMEOUT = 60000; // 60秒超时

  constructor(messageBridge: MessageBridge) {
    this.messageBridge = messageBridge;
    this.startTime = Date.now();
  }

  /**
   * 获取根元素
   */
  private getRootElement(): HTMLElement | null {
    // 优先查找 id="root" 的元素
    const rootById = document.getElementById('root');
    if (rootById) {
      return rootById;
    }

    // 查找 data-root-element-id 属性
    const script = document.currentScript;
    if (script) {
      const rootElementId = script.getAttribute('data-root-element-id');
      if (rootElementId) {
        const element = document.getElementById(rootElementId);
        if (element) {
          return element;
        }
      }
    }

    // 查找第一个 div
    return document.body.querySelector('div');
  }

  /**
   * 检查是否为默认模板页面
   */
  private checkDefaultTemplate(element: HTMLElement): boolean {
    // 检查是否存在特定的 DOM 结构
    const hasNotifications = !!element.querySelector('section[aria-label*="Notifications"]');
    if (!hasNotifications) {
      return false;
    }

    const centerContainer = element.querySelector('.min-h-screen.flex.items-center.justify-center.bg-gray-100');
    if (!centerContainer) {
      return false;
    }

    const textCenter = centerContainer.querySelector('.text-center');
    if (!textCenter) {
      return false;
    }

    const children = Array.from(textCenter.children);
    if (children.length !== 2) {
      return false;
    }

    const [h1, p] = children;
    if (h1.tagName !== 'H1' || p.tagName !== 'P') {
      return false;
    }

    const h1Text = h1.textContent || '';
    const pText = p.textContent || '';

    return h1Text.includes('欢迎页!') && pText.includes('开始构建你的神奇应用!');
  }

  /**
   * 检测渲染完成
   */
  private detectRenderComplete(): void {
    if (this.isRenderComplete) {
      return;
    }

    const rootElement = this.getRootElement();
    if (!rootElement || rootElement.children.length === 0) {
      // 继续等待
      this.scheduleCheck();
      return;
    }

    // 检测到有效内容
    this.isRenderComplete = true;
    const renderTime = Date.now() - this.startTime;
    const isDefaultTemplate = this.checkDefaultTemplate(rootElement);

    const renderData: RenderCompleteData = {
      isDefaultTemplate,
      renderTime,
      routerMode: this.getRouterMode(),
      routerPath: this.getRouterPath()
    };

    this.messageBridge.send('render.complete', renderData);

    // 清理
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }
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
   * 安排下一次检查
   */
  private scheduleCheck(): void {
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    const elapsed = Date.now() - this.startTime;
    if (elapsed >= this.RENDER_TIMEOUT) {
      // 超时，发送失败消息
      this.messageBridge.send('render.failed', {
        reason: `超时无有效内容 (等待时间: ${elapsed}ms)`,
        domContent: document.documentElement.outerHTML
      });
      return;
    }

    this.checkTimeout = window.setTimeout(() => {
      this.detectRenderComplete();
    }, 500);
  }

  /**
   * 初始化渲染监控
   */
  init(): void {
    // 如果 DOM 已经加载完成，立即检查
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.startObserving();
      });
    } else {
      this.startObserving();
    }
  }

  /**
   * 开始观察
   */
  private startObserving(): void {
    const rootElement = this.getRootElement() || document.body;

    // 立即检查一次
    this.detectRenderComplete();

    // 使用 MutationObserver 监听 DOM 变化
    this.observer = new MutationObserver(() => {
      this.detectRenderComplete();
    });

    this.observer.observe(rootElement, {
      childList: true,
      subtree: true
    });

    // 定期检查（作为备用方案）
    this.scheduleCheck();
  }

  /**
   * 销毁监控
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
  }
}
