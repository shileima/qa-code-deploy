import React, { useState, useEffect, useCallback } from 'react';
import StatusPanel from './components/StatusPanel';
import RoutePanel from './components/RoutePanel';
import ConsolePanel from './components/ConsolePanel';
import ErrorPanel from './components/ErrorPanel';
import {
  Message,
  RenderCompleteData,
  RenderFailedData,
  RouteChangeData,
  ErrorData,
  ConsoleErrorData,
  BuildErrorData,
  ConsoleLog
} from './types';

const DEMO_APP_URL = 'http://localhost:5174';

const App: React.FC = () => {
  const [renderStatus, setRenderStatus] = useState<'loading' | 'complete' | 'failed' | 'idle'>('idle');
  const [renderData, setRenderData] = useState<RenderCompleteData | RenderFailedData | undefined>();
  const [currentRoute, setCurrentRoute] = useState<RouteChangeData | undefined>();
  const [routeHistory, setRouteHistory] = useState<RouteChangeData[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [errors, setErrors] = useState<(ErrorData | BuildErrorData)[]>([]);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    // 验证消息来源（可选，根据实际需求调整）
    const message: Message = event.data;

    if (!message || !message.type) {
      return;
    }

    console.log('[DevTool] 收到消息:', message);

    switch (message.type) {
      case 'render.complete':
        setRenderStatus('complete');
        setRenderData(message.data as RenderCompleteData);
        break;

      case 'render.failed':
        setRenderStatus('failed');
        setRenderData(message.data as RenderFailedData);
        break;

      case 'route.change':
        const routeData = message.data as RouteChangeData;
        setCurrentRoute(routeData);
        setRouteHistory(prev => [...prev, routeData]);
        break;

      case 'error':
        const errorData = message.data as ErrorData;
        setErrors(prev => [...prev, errorData]);
        // 同时添加到控制台
        setConsoleLogs(prev => [...prev, {
          type: 'error',
          message: errorData.message,
          timestamp: message.timestamp || Date.now()
        }]);
        break;

      case 'console.error':
        const consoleError = message.data as ConsoleErrorData;
        setConsoleLogs(prev => [...prev, {
          type: 'error',
          message: consoleError.message,
          timestamp: message.timestamp || Date.now()
        }]);
        break;

      case 'build-error':
        const buildError = message.data as BuildErrorData;
        setErrors(prev => [...prev, buildError]);
        setConsoleLogs(prev => [...prev, {
          type: 'error',
          message: buildError.message,
          timestamp: buildError.timestamp
        }]);
        break;

      default:
        console.warn('[DevTool] 未知消息类型:', message.type);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    setRenderStatus('loading');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部标题栏 */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">渲染监控开发工具</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Demo 应用: <a href={DEMO_APP_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{DEMO_APP_URL}</a>
          </span>
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            {panelCollapsed ? '展开面板' : '折叠面板'}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：iframe 预览区域 */}
        <div className="flex-1 bg-white m-4 rounded-lg shadow-lg overflow-hidden">
          <iframe
            src={DEMO_APP_URL}
            className="w-full h-full border-0"
            title="Demo App Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>

        {/* 右侧：监控面板 */}
        {!panelCollapsed && (
          <div className="w-96 bg-gray-100 overflow-y-auto p-4 space-y-4">
            <StatusPanel renderStatus={renderStatus} renderData={renderData} />
            <RoutePanel currentRoute={currentRoute} routeHistory={routeHistory} />
            <ConsolePanel logs={consoleLogs} />
            <ErrorPanel errors={errors} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
