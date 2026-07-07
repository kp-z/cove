/**
 * 状态信息提取器
 */

import { Wrench, Coins, Zap } from 'lucide-react';
import type { StatusBadge, StatusExtractor } from './types';

/**
 * 默认状态提取器
 */
export const defaultStatusExtractor: StatusExtractor = (message) => {
  const badges: StatusBadge[] = [];

  if (!message.agentMetadata) {
    return badges;
  }

  const { usage, tool_logs, execution_mode } = message.agentMetadata;

  // Token 使用状态
  if (usage?.total_tokens) {
    const totalTokens = usage.total_tokens;
    const cost = usage.cost?.total_cost;

    badges.push({
      id: 'tokens',
      label: `${totalTokens.toLocaleString()} tokens`,
      icon: Coins,
      variant: 'green',
      priority: 10,
      tooltip: cost ? `Cost: $${cost.toFixed(4)}` : `${totalTokens.toLocaleString()} tokens used`,
    });
  }

  // 思考过程不再以状态徽章展示（详情统一在点击面板查看）

  // Tool 使用状态
  const toolCount = tool_logs?.length || 0;
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
  if (execution_mode) {
    badges.push({
      id: 'mode',
      label: execution_mode,
      variant: 'info',
      priority: 40,
      tooltip: `Execution mode: ${execution_mode}`,
    });
  }

  // 缓存命中率（如果可用）
  if (usage?.cache?.hit_rate !== undefined) {
    const hitRate = usage.cache.hit_rate;
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
