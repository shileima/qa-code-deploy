import React, { useRef, useEffect } from 'react';
import { ConsoleLog } from '../types';

interface ConsolePanelProps {
  logs: ConsoleLog[];
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'info':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">控制台输出</h3>
      
      <div
        ref={scrollRef}
        className="max-h-64 overflow-y-auto space-y-1 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-gray-400 text-sm">暂无输出</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`p-2 rounded ${getLogColor(log.type)}`}
            >
              <div className="flex items-start justify-between">
                <span className="flex-1 break-words">{log.message}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
