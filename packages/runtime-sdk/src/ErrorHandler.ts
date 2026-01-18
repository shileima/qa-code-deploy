import { MessageBridge } from './MessageBridge';
import { ErrorData, ConsoleErrorData, BuildErrorData } from './types';

export class ErrorHandler {
  private messageBridge: MessageBridge;
  private originalConsoleError: typeof console.error;
  private originalOnError: typeof window.onerror;
  private originalUnhandledRejection: typeof window.onunhandledrejection;

  constructor(messageBridge: MessageBridge) {
    this.messageBridge = messageBridge;
    this.originalConsoleError = console.error;
    this.originalOnError = window.onerror;
    this.originalUnhandledRejection = window.onunhandledrejection;
  }

  /**
   * 初始化错误处理
   */
  init(): void {
    this.setupWindowError();
    this.setupConsoleError();
    this.setupUnhandledRejection();
  }

  /**
   * 设置 window.onerror 拦截
   */
  private setupWindowError(): void {
    window.onerror = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ): boolean => {
      // 调用原始错误处理
      if (this.originalOnError) {
        this.originalOnError.call(window, message, source, lineno, colno, error);
      }

      const errorData: ErrorData = {
        message: typeof message === 'string' ? message : message.type,
        source: source || '',
        lineno: lineno,
        colno: colno,
        error: error?.message || '',
        stack: error?.stack
      };

      this.messageBridge.send('error', errorData);
      return true;
    };
  }

  /**
   * 设置 console.error 拦截
   */
  private setupConsoleError(): void {
    console.error = (...args: any[]): void => {
      // 调用原始 console.error
      this.originalConsoleError.apply(console, args);

      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // 检查是否为构建错误
      if (
        message.includes('Pre-transform error') ||
        message.includes('Failed to load url') ||
        message.includes('Does the file exist') ||
        message.includes('Module not found') ||
        message.includes('Cannot resolve module')
      ) {
        const buildErrorData: BuildErrorData = {
          message,
          errorType: 'build-error',
          timestamp: Date.now()
        };
        this.messageBridge.send('build-error', buildErrorData);
        return;
      }

      const consoleErrorData: ConsoleErrorData = {
        message,
        args: args.map(arg => {
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return String(arg);
          }
        })
      };

      this.messageBridge.send('console.error', consoleErrorData);
    };
  }

  /**
   * 设置未处理的 Promise 错误拦截
   */
  private setupUnhandledRejection(): void {
    window.onunhandledrejection = (event: PromiseRejectionEvent): void => {
      // 调用原始处理
      if (this.originalUnhandledRejection) {
        this.originalUnhandledRejection.call(window, event);
      }

      const error = event.reason;
      const errorData: ErrorData = {
        message: error?.message || String(error) || 'Unhandled Promise Rejection',
        error: error?.message || String(error),
        stack: error?.stack
      };

      this.messageBridge.send('error', errorData);
    };
  }

  /**
   * 恢复原始错误处理
   */
  restore(): void {
    window.onerror = this.originalOnError;
    console.error = this.originalConsoleError;
    window.onunhandledrejection = this.originalUnhandledRejection;
  }
}
