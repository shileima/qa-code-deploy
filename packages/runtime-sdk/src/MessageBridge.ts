import { Message, MessageType } from './types';

export class MessageBridge {
  private targetOrigin: string;

  constructor(targetOrigin: string = '*') {
    this.targetOrigin = targetOrigin;
  }

  /**
   * 发送消息到父窗口
   */
  send(type: MessageType, data: any): void {
    if (typeof window === 'undefined' || !window.parent) {
      console.warn('[RenderMonitorSDK] window.parent 不存在，无法发送消息');
      return;
    }

    const message: Message = {
      type,
      data,
      timestamp: Date.now()
    };

    try {
      window.parent.postMessage(message, this.targetOrigin);
    } catch (error) {
      console.error('[RenderMonitorSDK] 发送消息失败:', error);
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
