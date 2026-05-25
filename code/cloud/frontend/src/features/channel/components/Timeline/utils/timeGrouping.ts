/**
 * 时间分组工具函数
 */

import type { TimelineNode } from '../NodeRegistry';

export type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'older';

export interface GroupedNodes {
  today: TimelineNode[];
  yesterday: TimelineNode[];
  thisWeek: TimelineNode[];
  older: TimelineNode[];
}

/**
 * 判断日期属于哪个时间组
 */
export function getTimeGroup(date: Date): TimeGroup {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 7);

  if (date >= today) {
    return 'today';
  } else if (date >= yesterday) {
    return 'yesterday';
  } else if (date >= weekStart) {
    return 'thisWeek';
  } else {
    return 'older';
  }
}

/**
 * 将节点按时间分组
 */
export function groupNodesByTime(nodes: TimelineNode[]): GroupedNodes {
  const groups: GroupedNodes = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  nodes.forEach((node) => {
    const date = new Date(node.timestamp);
    const group = getTimeGroup(date);
    groups[group].push(node);
  });

  return groups;
}

/**
 * 获取时间组的显示标签
 */
export function getTimeGroupLabel(group: TimeGroup): string {
  switch (group) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'thisWeek':
      return 'This Week';
    case 'older':
      return 'Older';
  }
}

/**
 * 格式化时间戳为简短显示
 */
export function formatCompactTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;

  // 显示时间（HH:MM AM/PM）
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
