/**
 * AgentThinking 组件
 * 展示 Agent 的思考过程
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain } from 'lucide-react';

interface AgentThinkingProps {
  thinking: string;
}

export function AgentThinking({ thinking }: AgentThinkingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 如果 thinking 内容很长，默认只显示前 500 字符
  const isLongContent = thinking.length > 500;
  const previewText = isLongContent ? thinking.slice(0, 500) + '...' : thinking;
  
  return (
    <div className="mt-2 border border-blue-500/20 rounded-lg overflow-hidden bg-blue-500/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-blue-300">
          <Brain className="w-4 h-4" />
          <span>Agent 思考过程</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-blue-300" /> : <ChevronDown className="w-4 h-4 text-blue-300" />}
      </button>
      
      {isExpanded && (
        <div className="p-3 border-t border-blue-500/20">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
            {thinking}
          </pre>
        </div>
      )}
      
      {!isExpanded && isLongContent && (
        <div className="px-3 pb-2 text-xs text-gray-400">
          {previewText}
        </div>
      )}
    </div>
  );
}
