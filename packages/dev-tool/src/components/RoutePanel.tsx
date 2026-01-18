import React from 'react';
import { RouteChangeData } from '../types';

interface RoutePanelProps {
  currentRoute?: RouteChangeData;
  routeHistory: RouteChangeData[];
}

const RoutePanel: React.FC<RoutePanelProps> = ({ currentRoute, routeHistory }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">路由监控</h3>
      
      {currentRoute ? (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">当前路由:</span>
            <span className="font-mono text-sm">{currentRoute.routerPath}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">路由模式:</span>
            <span className="font-mono">{currentRoute.routerMode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">触发方式:</span>
            <span className="text-sm">{currentRoute.triggerType}</span>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm mb-4">暂无路由信息</div>
      )}

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">路由历史 ({routeHistory.length})</h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {routeHistory.length === 0 ? (
            <div className="text-gray-400 text-sm">暂无历史记录</div>
          ) : (
            routeHistory.slice(-10).reverse().map((route, index) => (
              <div
                key={index}
                className="text-xs p-2 bg-gray-50 rounded border border-gray-200"
              >
                <div className="flex justify-between">
                  <span className="font-mono">{route.routerPath}</span>
                  <span className="text-gray-500">{route.triggerType}</span>
                </div>
                <div className="text-gray-400 mt-1">{route.routerMode}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutePanel;
