/**
 * AgentExecutionSection - Agent 执行信息区块
 * 显示：执行模式、状态、时长、thinking、工具调用列表
 */

import React, { useState } from 'react';
import { formatDuration, truncateText } from '../utils/format';
import { Check, X, Loader2, Clock } from 'lucide-react';

interface AgentExecutionSectionProps {
  messageData: any;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <Check className="w-3 h-3 text-green-400" />;
    case 'error':
      return <X className="w-3 h-3 text-red-400" />;
    case 'running':
      return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
    case 'pending':
      return <Clock className="w-3 h-3 text-gray-400" />;
    default:
      return null;
  }
};

export const AgentExecutionSection = React.memo(({ messageData }: AgentExecutionSectionProps) => {
  const agentMeta = messageData?.agent_execution_metadata;
  const [showFullThinking, setShowFullThinking] = useState(false);

  if (!agentMeta || messageData?.sender_type !== 'agent') return null;

  const duration = agentMeta.started_at && agentMeta.completed_at
    ? new Date(agentMeta.completed_at).getTime() - new Date(agentMeta.started_at).getTime()
    : null;

  const { truncated: thinkingPreview, isTruncated } = agentMeta.thinking
    ? truncateText(agentMeta.thinking, 200)
    : { truncated: '', isTruncated: false };

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">🤖 Agent 执行</div>
      <div className="text-xs text-gray-300 space-y-1">
        <div>
          <span className="text-gray-500">├─ 执行模式:</span> {agentMeta.execution_mode || 'N/A'}
        </div>
        <div>
          <span className="text-gray-500">├─ 流状态:</span> {agentMeta.streaming_status || 'N/A'}
        </div>
        {duration !== null && (
          <div>
            <span className="text-gray-500">├─ 执行时长:</span> {formatDuration(duration)}
          </div>
        )}

        {/* Thinking */}
        {agentMeta.thinking && (
          <div>
            <span className="text-gray-500">├─ Thinking:</span>
            <div className="mt-1 ml-3 text-gray-300 bg-black/20 p-2 rounded">
              <pre className="whitespace-pre-wrap text-xs font-mono">
                {showFullThinking ? agentMeta.thinking : thinkingPreview}
              </pre>
              {isTruncated && (
                <button
                  onClick={() => setShowFullThinking(!showFullThinking)}
                  className="mt-1 text-blue-400 hover:text-blue-300 text-xs"
                >
                  {showFullThinking ? '收起' : '展开全文'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tool Logs */}
        {agentMeta.tool_logs && agentMeta.tool_logs.length > 0 && (
          <div>
            <span className="text-gray-500">└─ 工具调用 ({agentMeta.tool_logs.length}):</span>
            <div className="mt-1 ml-3 space-y-1">
              {agentMeta.tool_logs.map((tool: any, index: number) => (
                <div key={tool.id || index} className="flex items-center gap-2 text-xs">
                  {getStatusIcon(tool.status)}
                  <span className="text-gray-400">{tool.tool_name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-500">{tool.action}</span>
                  {tool.duration && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500">{formatDuration(tool.duration)}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AgentExecutionSection.displayName = 'AgentExecutionSection';
