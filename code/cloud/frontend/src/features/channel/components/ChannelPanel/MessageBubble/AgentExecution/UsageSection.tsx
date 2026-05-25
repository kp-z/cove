import { memo } from 'react';
import { Coins } from 'lucide-react';
import { TokenUsage } from '../../types';

interface UsageSectionProps {
  usage: TokenUsage;
}

export const UsageSection = memo(function UsageSection({ usage }: UsageSectionProps) {
  return (
    <div className="bg-green-500/10 border-l-2 border-green-500/50 rounded p-2">
      <div className="flex items-center gap-2 mb-1">
        <Coins className="w-3 h-3 text-green-400" />
        <span className="text-xs text-green-400 font-semibold">Usage</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Input:</span>
          <span className="text-gray-200">{usage.inputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Output:</span>
          <span className="text-gray-200">{usage.outputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total:</span>
          <span className="text-gray-200 font-semibold">{usage.totalTokens.toLocaleString()}</span>
        </div>
        {usage.cost?.totalCost !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Cost:</span>
            <span className="text-green-300 font-semibold">${usage.cost.totalCost.toFixed(4)}</span>
          </div>
        )}
        {usage.cache?.readTokens !== undefined && usage.cache.readTokens > 0 && (
          <div className="flex items-center justify-between col-span-2">
            <span className="text-gray-400">Cache Read:</span>
            <span className="text-blue-300">{usage.cache.readTokens.toLocaleString()}</span>
          </div>
        )}
        {usage.model && (
          <div className="flex items-center justify-between col-span-2">
            <span className="text-gray-400">Model:</span>
            <span className="text-gray-300">{usage.model}</span>
          </div>
        )}
      </div>
    </div>
  );
});
