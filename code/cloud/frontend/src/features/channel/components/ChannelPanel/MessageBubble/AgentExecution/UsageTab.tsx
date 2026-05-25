import { memo } from 'react';
import { Coins, TrendingUp, Clock, Zap } from 'lucide-react';
import { TokenUsage } from '../../types';

interface UsageTabProps {
  usage: TokenUsage;
}

export const UsageTab = memo(function UsageTab({ usage }: UsageTabProps) {
  const formatNumber = (num: number) => num.toLocaleString();
  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-green-400">
        <Coins className="w-4 h-4" />
        <span className="text-sm font-semibold">Token Usage & Cost</span>
      </div>

      {/* Token Statistics */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Token Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Input Tokens</div>
            <div className="text-lg font-semibold text-gray-200">
              {formatNumber(usage.inputTokens)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Output Tokens</div>
            <div className="text-lg font-semibold text-gray-200">
              {formatNumber(usage.outputTokens)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-gray-500">Total Tokens</div>
            <div className="text-lg font-semibold text-green-300">
              {formatNumber(usage.totalTokens)}
            </div>
          </div>
        </div>
      </div>

      {/* Cache Statistics */}
      {usage.cache && (usage.cache.creationTokens > 0 || usage.cache.readTokens > 0) && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            Cache Performance
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Cache Creation</div>
              <div className="text-lg font-semibold text-gray-200">
                {formatNumber(usage.cache.creationTokens)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Cache Read</div>
              <div className="text-lg font-semibold text-blue-300">
                {formatNumber(usage.cache.readTokens)}
              </div>
            </div>
            {usage.cache.hitRate !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Hit Rate</div>
                <div className="text-lg font-semibold text-blue-300">
                  {(usage.cache.hitRate * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cost Breakdown */}
      {usage.cost && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-yellow-400" />
            Cost Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Input Cost</div>
              <div className="text-base font-semibold text-gray-200">
                {formatCost(usage.cost.inputCost)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Output Cost</div>
              <div className="text-base font-semibold text-gray-200">
                {formatCost(usage.cost.outputCost)}
              </div>
            </div>
            {usage.cost.cacheCost > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Cache Cost</div>
                <div className="text-base font-semibold text-gray-200">
                  {formatCost(usage.cost.cacheCost)}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Total Cost</div>
              <div className="text-lg font-semibold text-yellow-300">
                {formatCost(usage.cost.totalCost)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {usage.latency && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {usage.latency.firstTokenMs !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">First Token</div>
                <div className="text-base font-semibold text-gray-200">
                  {formatDuration(usage.latency.firstTokenMs)}
                </div>
              </div>
            )}
            {usage.latency.totalMs !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Total Time</div>
                <div className="text-base font-semibold text-gray-200">
                  {formatDuration(usage.latency.totalMs)}
                </div>
              </div>
            )}
            {usage.latency.tokensPerSecond !== undefined && (
              <div className="space-y-1">
                <div className="text-xs text-gray-500">Tokens/sec</div>
                <div className="text-base font-semibold text-purple-300">
                  {usage.latency.tokensPerSecond.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Info */}
      {usage.model && (
        <div className="text-xs text-gray-500">
          Model: <span className="text-gray-400 font-mono">{usage.model}</span>
        </div>
      )}
    </div>
  );
});
