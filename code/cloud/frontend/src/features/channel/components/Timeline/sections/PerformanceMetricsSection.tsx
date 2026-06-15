/**
 * PerformanceMetricsSection - 性能指标区块
 * 显示：模型、tokens、缓存、延迟、成本
 */

import React from 'react';
import { formatTokens, formatPercentage, formatCost, formatLatency } from '../utils/format';

interface PerformanceMetricsSectionProps {
  messageData: any;
}

export const PerformanceMetricsSection = React.memo(({ messageData }: PerformanceMetricsSectionProps) => {
  const usage = messageData?.agent_execution_metadata?.usage;

  if (!usage || messageData?.sender_type !== 'agent') return null;

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-gray-400 mb-2">⚡ 性能指标</div>
      <div className="text-xs text-gray-300 space-y-1">
        {usage.model && (
          <div>
            <span className="text-gray-500">├─ 模型:</span> {usage.model}
          </div>
        )}
        <div>
          <span className="text-gray-500">├─ Input Tokens:</span> {formatTokens(usage.input_tokens)}
        </div>
        <div>
          <span className="text-gray-500">├─ Output Tokens:</span> {formatTokens(usage.output_tokens)}
        </div>
        <div>
          <span className="text-gray-500">├─ Total Tokens:</span> {formatTokens(usage.total_tokens)}
        </div>

        {/* 缓存信息 */}
        {usage.cache && (
          <>
            <div>
              <span className="text-gray-500">├─ Cache Creation:</span> {formatTokens(usage.cache.creation_tokens)}
            </div>
            <div>
              <span className="text-gray-500">├─ Cache Read:</span> {formatTokens(usage.cache.read_tokens)}
            </div>
            {usage.cache.hit_rate !== undefined && (
              <div>
                <span className="text-gray-500">├─ Cache Hit Rate:</span> {formatPercentage(usage.cache.hit_rate)}
              </div>
            )}
          </>
        )}

        {/* 延迟信息 */}
        {usage.latency && (
          <>
            {usage.latency.first_token_ms && (
              <div>
                <span className="text-gray-500">├─ First Token:</span> {formatLatency(usage.latency.first_token_ms)}
              </div>
            )}
            {usage.latency.total_ms && (
              <div>
                <span className="text-gray-500">├─ Total Latency:</span> {formatLatency(usage.latency.total_ms)}
              </div>
            )}
            {usage.latency.tokens_per_second && (
              <div>
                <span className="text-gray-500">├─ Tokens/s:</span> {usage.latency.tokens_per_second.toFixed(1)}
              </div>
            )}
          </>
        )}

        {/* 成本信息 */}
        {usage.cost && (
          <>
            <div>
              <span className="text-gray-500">├─ Input Cost:</span> {formatCost(usage.cost.input_cost)}
            </div>
            <div>
              <span className="text-gray-500">├─ Output Cost:</span> {formatCost(usage.cost.output_cost)}
            </div>
            {usage.cost.cache_cost > 0 && (
              <div>
                <span className="text-gray-500">├─ Cache Cost:</span> {formatCost(usage.cost.cache_cost)}
              </div>
            )}
            <div>
              <span className="text-gray-500">└─ Total Cost:</span> {formatCost(usage.cost.total_cost)}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

PerformanceMetricsSection.displayName = 'PerformanceMetricsSection';
