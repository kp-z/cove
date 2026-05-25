import { memo, useMemo } from 'react';
import { BarChart3, Brain, Wrench, Coins, Clock, Loader2 } from 'lucide-react';
import { AgentMetadata } from '../../types';

interface StatsTabProps {
  metadata: AgentMetadata;
  isStreaming?: boolean;
}

export const StatsTab = memo(function StatsTab({
  metadata,
  isStreaming = false,
}: StatsTabProps) {
  const stats = useMemo(() => {
    const hasThinking = !!metadata.thinking;
    const thinkingLength = metadata.thinking?.length || 0;

    const toolCount = metadata.toolLogs?.length || 0;
    const successCount = metadata.toolLogs?.filter(l => l.status === 'success').length || 0;
    const errorCount = metadata.toolLogs?.filter(l => l.status === 'error').length || 0;
    const totalDuration = metadata.toolLogs?.reduce((sum, l) => sum + (l.duration || 0), 0) || 0;

    const totalTokens = metadata.usage?.totalTokens || 0;
    const totalCost = metadata.usage?.cost?.totalCost || 0;

    return {
      hasThinking,
      thinkingLength,
      toolCount,
      successCount,
      errorCount,
      totalDuration,
      totalTokens,
      totalCost,
    };
  }, [metadata]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-orange-400">
        <BarChart3 className="w-4 h-4" />
        <span className="text-sm font-semibold">Execution Statistics</span>
        {isStreaming && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Thinking Stats */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Thinking</span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Status</div>
            <div className="text-base font-semibold text-gray-200">
              {stats.hasThinking ? 'Available' : 'Not Available'}
            </div>
            {stats.hasThinking && (
              <>
                <div className="text-xs text-gray-500 mt-2">Content Length</div>
                <div className="text-base font-semibold text-purple-300">
                  {stats.thinkingLength.toLocaleString()} chars
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tool Stats */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-300">Tools</span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Total Operations</div>
            <div className="text-base font-semibold text-gray-200">
              {stats.toolCount}
            </div>
            {stats.toolCount > 0 && (
              <>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-green-400">{stats.successCount} success</span>
                  <span className="text-red-400">{stats.errorCount} errors</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Token Stats */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-green-300">Tokens</span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Total Usage</div>
            <div className="text-base font-semibold text-gray-200">
              {stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : 'N/A'}
            </div>
            {stats.totalCost > 0 && (
              <>
                <div className="text-xs text-gray-500 mt-2">Total Cost</div>
                <div className="text-base font-semibold text-green-300">
                  {formatCost(stats.totalCost)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-300">Performance</span>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Tool Execution Time</div>
            <div className="text-base font-semibold text-gray-200">
              {stats.totalDuration > 0 ? formatDuration(stats.totalDuration) : 'N/A'}
            </div>
            {metadata.usage?.latency?.totalMs && (
              <>
                <div className="text-xs text-gray-500 mt-2">Total Latency</div>
                <div className="text-base font-semibold text-yellow-300">
                  {formatDuration(metadata.usage.latency.totalMs)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Execution Mode */}
      {metadata.executionMode && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Execution Mode</span>
            <span className="text-sm font-semibold text-gray-200 font-mono">
              {metadata.executionMode}
            </span>
          </div>
        </div>
      )}

      {/* Streaming Status */}
      {metadata.streamingStatus && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Streaming Status</span>
            <span className="text-sm font-semibold text-gray-200">
              {metadata.streamingStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="text-xs text-gray-500 border-t border-white/10 pt-3">
        This execution {stats.hasThinking ? 'includes' : 'does not include'} thinking process,
        used {stats.toolCount} tool{stats.toolCount !== 1 ? 's' : ''},
        and consumed {stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '0'} tokens
        {stats.totalCost > 0 ? ` (${formatCost(stats.totalCost)})` : ''}.
      </div>
    </div>
  );
});
