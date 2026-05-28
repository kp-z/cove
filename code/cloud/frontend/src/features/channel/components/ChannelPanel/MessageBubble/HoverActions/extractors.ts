/**
 * 状态信息提取器
 */

import { Brain, Wrench, Coins, Zap } from 'lucide-react';
import type { StatusBadge, StatusExtractor } from './types';

/**
 * 默认状态提取器
 */
export const defaultStatusExtractor: StatusExtractor = (message) => {
  const badges: StatusBadge[] = [];

  if (!message.agentMetadata) {
    return badges;
  }

  const { usage, thinking, toolLogs, executionMode } = message.agentMetadata;

  // Token 使用状态
  if (usage?.totalTokens) {
    const totalTokens = usage.totalTokens;
    const cost = usage.cost?.totalCost;

    badges.push({
      id: 'tokens',
      label: `${totalTokens.toLocaleString()} tokens`,
      icon: Coins,
      variant: 'green',
      priority: 10,
      tooltip: cost ? `Cost: $${cost.toFixed(4)}` : `${totalTokens.toLocaleString()} tokens used`,
    });
  }

  // Thinking 状态
  if (thinking) {
    badges.push({
      id: 'thinking',
      label: 'Thinking',
      icon: Brain,
      variant: 'purple',
      priority: 20,
      tooltip: 'AI thinking process available',
    });
  }

  // Tool 使用状态
  const toolCount = toolLogs?.length || 0;
  if (toolCount > 0) {
    badges.push({
      id: 'tools',
      label: `${toolCount} tool${toolCount > 1 ? 's' : ''}`,
      icon: Wrench,
      variant: 'blue',
      priority: 30,
      tooltip: `${toolCount} tool${toolCount > 1 ? 's' : ''} used`,
    });
  }

  // 执行模式
  if (executionMode) {
    badges.push({
      id: 'mode',
      label: executionMode,
      variant: 'info',
      priority: 40,
      tooltip: `Execution mode: ${executionMode}`,
    });
  }

  // 缓存命中率（如果可用）
  if (usage?.cache?.hitRate !== undefined) {
    const hitRate = usage.cache.hitRate;
    badges.push({
      id: 'cache',
      label: `${(hitRate * 100).toFixed(0)}% cache`,
      icon: Zap,
      variant: hitRate > 0.8 ? 'success' : hitRate > 0.5 ? 'info' : 'warning',
      priority: 15,
      tooltip: `Cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
    });
  }

  return badges.sort((a, b) => (a.priority || 0) - (b.priority || 0));
};

/**
 * 创建组合状态提取器
 */
export const createStatusExtractor = (extractors: StatusExtractor[]): StatusExtractor => {
  return (message) => {
    const allBadges = extractors.flatMap((extractor) => extractor(message));

    const uniqueBadges = Array.from(new Map(allBadges.map((badge) => [badge.id, badge])).values());

    return uniqueBadges.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  };
};
