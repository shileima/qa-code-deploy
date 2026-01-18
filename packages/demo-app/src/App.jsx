import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useEffect, useRef } from 'react';
import { initAppConfig } from './utils/urlConfig';

function App() {
  const sdkRef = useRef(null);

  useEffect(() => {
    // 初始化 URL 前缀配置（根据子域名前缀应用不同的配置）
    initAppConfig();
    
    // 初始化内联 SDK（简化版本，用于演示）
    // 在生产环境中，应该加载构建后的 SDK 文件
    const initSDK = () => {
      const { MessageBridge, RenderMonitor, RouteMonitor, ErrorHandler } = createInlineSDK();
      const messageBridge = new MessageBridge();
      const renderMonitor = new RenderMonitor(messageBridge);
      const routeMonitor = new RouteMonitor(messageBridge);
      const errorHandler = new ErrorHandler(messageBridge);
      
      errorHandler.init();
      renderMonitor.init();
      routeMonitor.init();
      
      sdkRef.current = { 
        destroy: () => {
          renderMonitor.destroy();
          routeMonitor.destroy();
          errorHandler.restore();
        }
      };
      
      console.log('[DemoApp] 运行时 SDK 已初始化');
    };

    initSDK();

    return () => {
      if (sdkRef.current && sdkRef.current.destroy) {
        sdkRef.current.destroy();
      }
    };
  }, []);

  return <RouterProvider router={router} />;
}

// 内联 SDK 实现（简化版本，用于演示）
// 实际项目中应该使用构建后的 SDK 文件
function createInlineSDK() {
  class MessageBridge {
    send(type, data) {
      if (window.parent) {
        window.parent.postMessage({ type, data, timestamp: Date.now() }, '*');
      }
    }
  }

  class RenderMonitor {
    constructor(messageBridge) {
      this.messageBridge = messageBridge;
      this.startTime = Date.now();
      this.observer = null;
      this.isComplete = false;
    }

    init() {
      const rootElement = document.getElementById('root') || document.body;
      
      const checkRender = () => {
        if (this.isComplete) return;
        
        if (rootElement && rootElement.children.length > 0) {
          this.isComplete = true;
          const renderTime = Date.now() - this.startTime;
          const routerMode = window.location.hash ? 'hash' : (window.location.pathname !== '/' ? 'history' : 'default');
          
          this.messageBridge.send('render.complete', {
            renderTime,
            routerMode,
            routerPath: window.location.pathname
          });
          
          if (this.observer) {
            this.observer.disconnect();
          }
        }
      };

      this.observer = new MutationObserver(checkRender);
      this.observer.observe(rootElement, { childList: true, subtree: true });
      
      // 立即检查一次
      checkRender();
      
      // 定期检查（作为备用方案）
      const interval = setInterval(() => {
        if (this.isComplete) {
          clearInterval(interval);
          return;
        }
        checkRender();
      }, 500);
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }
  }

  class RouteMonitor {
    constructor(messageBridge) {
      this.messageBridge = messageBridge;
      this.currentUrl = window.location.href;
    }

    init() {
      const handleChange = (triggerType) => {
        const newUrl = window.location.href;
        if (newUrl === this.currentUrl) return;
        
        this.currentUrl = newUrl;
        const routerMode = window.location.hash ? 'hash' : (window.location.pathname !== '/' ? 'history' : 'default');
        
        this.messageBridge.send('route.change', {
          routerMode,
          routerPath: window.location.pathname,
          triggerType
        });
      };

      window.addEventListener('hashchange', () => handleChange('hashchange'));
      window.addEventListener('popstate', () => handleChange('popstate'));
      
      const observer = new MutationObserver(() => {
        if (window.location.href !== this.currentUrl) {
          handleChange('react-router-change');
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      
      setInterval(() => {
        if (window.location.href !== this.currentUrl) {
          handleChange('url-check');
        }
      }, 500);
    }

    destroy() {}
  }

  class ErrorHandler {
    constructor(messageBridge) {
      this.messageBridge = messageBridge;
      this.originalError = window.onerror;
      this.originalConsoleError = console.error;
      this.originalUnhandledRejection = window.onunhandledrejection;
    }

    init() {
      window.onerror = (msg, source, lineno, colno, error) => {
        if (this.originalError) {
          this.originalError.call(window, msg, source, lineno, colno, error);
        }
        this.messageBridge.send('error', { 
          message: String(msg), 
          source, 
          lineno, 
          colno, 
          error: error?.message,
          stack: error?.stack 
        });
        return true;
      };

      console.error = (...args) => {
        this.originalConsoleError.apply(console, args);
        const message = args.map(a => {
          if (typeof a === 'object') {
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          }
          return String(a);
        }).join(' ');
        
        // 检查是否为构建错误
        if (
          message.includes('Pre-transform error') ||
          message.includes('Failed to load url') ||
          message.includes('Does the file exist') ||
          message.includes('Module not found') ||
          message.includes('Cannot resolve module')
        ) {
          this.messageBridge.send('build-error', {
            message,
            errorType: 'build-error',
            timestamp: Date.now()
          });
          return;
        }
        
        this.messageBridge.send('console.error', { message });
      };

      window.onunhandledrejection = (event) => {
        if (this.originalUnhandledRejection) {
          this.originalUnhandledRejection.call(window, event);
        }
        this.messageBridge.send('error', { 
          message: 'Unhandled Promise Rejection', 
          error: String(event.reason),
          stack: event.reason?.stack
        });
      };
    }

    restore() {
      window.onerror = this.originalError;
      console.error = this.originalConsoleError;
      window.onunhandledrejection = this.originalUnhandledRejection;
    }
  }

  return { MessageBridge, RenderMonitor, RouteMonitor, ErrorHandler };
}

export default App;
