import React from 'react';
import { ErrorData, BuildErrorData } from '../types';

interface ErrorPanelProps {
  errors: (ErrorData | BuildErrorData)[];
}

const ErrorPanel: React.FC<ErrorPanelProps> = ({ errors }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">
        错误列表
        {errors.length > 0 && (
          <span className="ml-2 text-sm font-normal text-red-600">
            ({errors.length})
          </span>
        )}
      </h3>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {errors.length === 0 ? (
          <div className="text-gray-400 text-sm">暂无错误</div>
        ) : (
          errors.map((error, index) => (
            <div
              key={index}
              className="p-3 bg-red-50 border border-red-200 rounded"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-red-800">
                  {('errorType' in error && error.errorType) || 'Error'}
                </span>
                {error.timestamp && (
                  <span className="text-xs text-gray-500">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="text-sm text-red-700 mb-1">
                {error.message}
              </div>
              
              {'source' in error && error.source && (
                <div className="text-xs text-gray-600 mt-1">
                  来源: {error.source}
                  {error.lineno && `:${error.lineno}`}
                  {error.colno && `:${error.colno}`}
                </div>
              )}
              
              {'stack' in error && error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer">
                    查看堆栈
                  </summary>
                  <pre className="mt-1 text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ErrorPanel;
