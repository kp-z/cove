import { memo } from 'react';
import { Brain, Wrench, Coins, Loader2, ChevronRight } from 'lucide-react';
import { AgentMetadata } from '../../types';

interface AgentExecutionStatusBarProps {
  metadata: AgentMetadata;
  isStreaming?: boolean;
  onViewDetails: () => void;
}

export const AgentExecutionStatusBar = memo(function AgentExecutionStatusBar({
  metadata,
  isStreaming = false,
  onViewDetails,
}: AgentExecutionStatusBarProps) {
  const hasThinking = !!metadata.thinking;
  const toolCount = metadata.toolLogs?.length || 0;
  const hasUsage = !!metadata.usage;

  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <button
        onClick={onViewDetails}
        className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-gray-300 transition-colors group"
      >
        <div className="flex items-center gap-3">
          {/* Thinking indicator */}
          {hasThinking && (
            <div className="flex items-center gap-1">
              <Brain className="w-3 h-3 text-purple-400" />
              <span className="text-purple-400">Thinking</span>
            </div>
          )}

          {/* Tool logs indicator */}
          {toolCount > 0 && (
            <div className="flex items-center gap-1">
              <Wrench className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400">{toolCount} tools</span>
            </div>
          )}

          {/* Usage indicator */}
          {hasUsage && metadata.usage && (
            <div className="flex items-center gap-1">
              <Coins className="w-3 h-3 text-green-400" />
              <span className="text-green-400">
                {metadata.usage.totalTokens.toLocaleString()} tokens
              </span>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
              <span className="text-yellow-400">Processing...</span>
            </div>
          )}
        </div>

        {/* View details button */}
        <div className="flex items-center gap-1 text-gray-500 group-hover:text-gray-300">
          <span>View Details</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </button>
    </div>
  );
});
