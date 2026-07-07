/**
 * 状态信息提取器
 */

import { Wrench } from 'lucide-react';
import type { StatusBadge, StatusExtractor } from './types';

/**
 * 默认状态提取器
 *
 * 注意：token 数量、cache 命中率等用量细节不再以徽章展示——
 * 花费（cost）已经由 MessageBubbleNew.tsx 里独立的行尾徽章常驻展示，
 * 其余用量明细（token 数、cache 命中率等）统一在点击「详情」后的弹窗里查看，
 * 避免同一份信息在 hover 行和弹窗里重复出现。
 */
export const defaultStatusExtractor: StatusExtractor = (message) => {
  const badges: StatusBadge[] = [];

  if (!message.agentMetadata) {
    return badges;
  }

  const { tool_logs, execution_mode } = message.agentMetadata;

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
