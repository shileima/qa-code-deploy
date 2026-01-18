import React from 'react';
import { RenderCompleteData, RenderFailedData } from '../types';

interface StatusPanelProps {
  renderStatus: 'loading' | 'complete' | 'failed' | 'idle';
  renderData?: RenderCompleteData | RenderFailedData;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ renderStatus, renderData }) => {
  const getStatusColor = () => {
    switch (renderStatus) {
      case 'complete':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'loading':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = () => {
    switch (renderStatus) {
      case 'complete':
        return '渲染完成';
      case 'failed':
        return '渲染失败';
      case 'loading':
        return '渲染中...';
      default:
        return '等待渲染';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">渲染状态</h3>
      
      <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {getStatusText()}
      </div>

      {renderStatus === 'complete' && renderData && 'renderTime' in renderData && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">渲染时间:</span>
            <span className="font-mono">{renderData.renderTime}ms</span>
          </div>
          {renderData.routerMode && (
            <div className="flex justify-between">
              <span className="text-gray-600">路由模式:</span>
              <span className="font-mono">{renderData.routerMode}</span>
            </div>
          )}
          {renderData.routerPath && (
            <div className="flex justify-between">
              <span className="text-gray-600">路由路径:</span>
              <span className="font-mono text-sm">{renderData.routerPath}</span>
            </div>
          )}
          {renderData.isDefaultTemplate !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">默认模板:</span>
              <span className={renderData.isDefaultTemplate ? 'text-yellow-600' : 'text-green-600'}>
                {renderData.isDefaultTemplate ? '是' : '否'}
              </span>
            </div>
          )}
        </div>
      )}

      {renderStatus === 'failed' && renderData && 'reason' in renderData && (
        <div className="mt-4">
          <div className="text-red-600 text-sm">
            <strong>失败原因:</strong> {renderData.reason}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
