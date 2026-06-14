import { memo, useState } from 'react';
import { X } from 'lucide-react';
import type { AgentMetadata } from '../../types';
import { ThinkingTab } from './ThinkingTab';
import { ToolsTab } from './ToolsTab';
import { UsageTab } from './UsageTab';
import { StatsTab } from './StatsTab';
import { normalizeAgentMetadata } from './normalizeAgentMetadata';

export type TabType = 'thinking' | 'tools' | 'usage' | 'stats';

interface AgentExecutionModalProps {
  metadata: AgentMetadata;
  isStreaming?: boolean;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: TabType;
}

export const AgentExecutionModal = memo(function AgentExecutionModal({
  metadata,
  isStreaming = false,
  isOpen,
  onClose,
  defaultTab: initialTab,
}: AgentExecutionModalProps) {
  // 运行时下发的是 snake_case 元数据，统一归一化为 snake_case 结构供各标签页安全消费
  const normalizedMetadata: AgentMetadata = normalizeAgentMetadata(metadata);
  const toolLogs = normalizedMetadata.tool_logs ?? [];
  const usage = normalizedMetadata.usage;

  const hasThinking = !!normalizedMetadata.thinking;
  const hasTools = toolLogs.length > 0;
  const hasUsage = !!usage;

  // Auto-select first available tab
  const autoSelectedTab = hasThinking ? 'thinking' : hasTools ? 'tools' : hasUsage ? 'usage' : 'stats';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || autoSelectedTab);

  if (!isOpen) return null;

  const currentTab = activeTab;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1d2e] border border-white/10 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-gray-100">Agent Execution Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/10 bg-black/20">
          {hasThinking && (
            <button
              onClick={() => setActiveTab('thinking')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'thinking'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              Thinking
            </button>
          )}
          {hasTools && (
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'tools'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              Tools ({toolLogs.length})
            </button>
          )}
          {hasUsage && (
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'usage'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              Usage
            </button>
          )}
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentTab === 'stats'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Stats
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {currentTab === 'thinking' && hasThinking && (
            <ThinkingTab content={normalizedMetadata.thinking!} isStreaming={isStreaming} />
          )}
          {currentTab === 'tools' && hasTools && (
            <ToolsTab logs={toolLogs} isStreaming={isStreaming} />
          )}
          {currentTab === 'usage' && hasUsage && (
            <UsageTab usage={usage!} />
          )}
          {currentTab === 'stats' && (
            <StatsTab metadata={normalizedMetadata} isStreaming={isStreaming} />
          )}
        </div>
      </div>
    </div>
  );
});
