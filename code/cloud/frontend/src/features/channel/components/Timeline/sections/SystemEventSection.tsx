/**
 * SystemEventSection - 系统事件区块
 * 显示：类型、级别、消息、metadata、stack
 */

import React from 'react';

interface SystemEventSectionProps {
  systemDetails?: {
    message: string;
    metadata?: Record<string, any>;
    stack?: string;
  };
}

export const SystemEventSection = React.memo(({ systemDetails }: SystemEventSectionProps) => {
  if (!systemDetails) return null;

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">⚙️ 系统事件</div>

      {/* 完整消息 */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Message:</div>
        <div className="text-sm text-gray-300">
          {systemDetails.message}
        </div>
      </div>

      {/* Metadata */}
      {systemDetails.metadata && Object.keys(systemDetails.metadata).length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">Metadata:</div>
          <pre className="text-xs text-gray-300 font-mono overflow-x-auto bg-black/20 p-2 rounded">
            {JSON.stringify(systemDetails.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Stack Trace */}
      {systemDetails.stack && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Stack Trace:</div>
          <pre className="text-xs text-gray-500 font-mono overflow-x-auto max-h-40 overflow-y-auto bg-black/20 p-2 rounded">
            {systemDetails.stack}
          </pre>
        </div>
      )}
    </div>
  );
});

SystemEventSection.displayName = 'SystemEventSection';
