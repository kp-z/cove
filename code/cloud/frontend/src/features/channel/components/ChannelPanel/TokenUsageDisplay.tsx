/**
 * TokenUsageDisplay 组件
 * 展示 Token 使用统计
 */

import { BarChart3 } from 'lucide-react';
import type { TokenUsage } from '@/types/agent-execution';

interface TokenUsageDisplayProps {
  usage: TokenUsage;
}

export function TokenUsageDisplay({ usage }: TokenUsageDisplayProps) {
  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    return num.toLocaleString();
  };
  
  const hasCacheStats = usage.cacheReadTokens || usage.cacheCreationTokens;
  
  return (
    <div className="mt-2 border border-gray-500/20 rounded-lg overflow-hidden bg-gray-500/5">
      <div className="px-3 py-2 border-b border-gray-500/20 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">Token 使用统计</span>
      </div>
      
      <div className={`p-3 grid ${hasCacheStats ? 'grid-cols-5' : 'grid-cols-3'} gap-4 text-xs`}>
        <div>
          <div className="text-gray-400 mb-1">输入</div>
          <div className="font-semibold text-gray-200">{formatNumber(usage.inputTokens)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">输出</div>
          <div className="font-semibold text-gray-200">{formatNumber(usage.outputTokens)}</div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">总计</div>
          <div className="font-semibold text-blue-400">{formatNumber(usage.totalTokens)}</div>
        </div>
        
        {usage.cacheReadTokens !== undefined && (
          <div>
            <div className="text-gray-400 mb-1">缓存读取</div>
            <div className="font-semibold text-green-400">{formatNumber(usage.cacheReadTokens)}</div>
          </div>
        )}
        {usage.cacheCreationTokens !== undefined && (
          <div>
            <div className="text-gray-400 mb-1">缓存创建</div>
            <div className="font-semibold text-gray-200">{formatNumber(usage.cacheCreationTokens)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
