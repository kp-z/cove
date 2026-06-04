/**
 * SystemNode - 系统事件节点渲染器
 * 
 * 在 Timeline 中显示系统调试事件
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import type { NodeRenderer, TimelineNode, NodeContext } from '../NodeRegistry';
import type { SystemEvent } from '../../../types/system-event';
import { getEventLevelColor, getEventTypeLabel } from '../../../types/system-event';

export type SystemNodeData = SystemEvent;

function SystemNodeComponent({ event }: { event: SystemEvent }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0;
  const hasStack = !!event.stack;
  
  return (
    <div className="group relative">
      {/* 主内容 */}
      <div
        className={`flex items-start gap-3 px-4 py-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 图标 */}
        <div className={`flex-shrink-0 mt-0.5`}>
          <Terminal className={`w-4 h-4 ${getEventLevelColor(event.level)}`} />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-mono ${getEventLevelColor(event.level)}`}>
              {getEventTypeLabel(event.type)}
            </span>
            <span className="text-xs text-gray-500">
              {event.timestamp.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                fractionalSecondDigits: 3 
              })}
            </span>
          </div>

          {/* 消息 */}
          <div className="text-sm text-gray-300">
            {event.message}
          </div>
        </div>

        {/* 展开/折叠图标 */}
        {(hasMetadata || hasStack) && (
          <div className="flex-shrink-0 mt-1">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* 展开内容 */}
      {isExpanded && (hasMetadata || hasStack) && (
        <div className="mt-2 ml-7 px-4 py-3 rounded-lg bg-black/30 border border-white/5">
          {/* Metadata */}
          {hasMetadata && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-400 mb-2">Metadata:</div>
              <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* Stack Trace */}
          {hasStack && (
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">Stack Trace:</div>
              <pre className="text-xs text-gray-500 font-mono overflow-x-auto max-h-40 overflow-y-auto">
                {event.stack}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const SystemNodeRenderer: NodeRenderer<SystemNodeData> = {
  type: 'system',
  icon: Terminal,
  color: 'text-blue-400',
  render: (node: TimelineNode<SystemNodeData>, context: NodeContext) => {
    return <SystemNodeComponent event={node.data} />;
  },
};
