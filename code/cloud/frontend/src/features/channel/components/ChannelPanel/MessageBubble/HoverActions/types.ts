/**
 * 消息悬浮操作组件类型定义
 */

import type { LucideIcon } from 'lucide-react';
import type { Message } from '../../../../domain/models/Message';

/**
 * 操作按钮配置
 */
export interface MessageAction {
  /** 唯一标识 */
  id: string;

  /** 显示标签 */
  label: string;

  /** 图标组件 (lucide-react) */
  icon: LucideIcon;

  /** 点击处理函数 */
  onClick: (message: Message) => void;

  /** 条件显示函数 - 返回 false 则不显示该按钮 */
  shouldShow?: (message: Message) => boolean;

  /** 禁用条件函数 */
  isDisabled?: (message: Message) => boolean;

  /** 按钮变体样式 */
  variant?: 'default' | 'primary' | 'danger' | 'ghost';

  /** 优先级 (用于排序，数字越小越靠前) */
  priority?: number;

  /** Tooltip 提示文本 */
  tooltip?: string;

  /** 快捷键提示 */
  shortcut?: string;
}

/**
 * 操作分组配置
 */
export interface MessageActionGroup {
  /** 分组 ID */
  id: string;

  /** 分组标签 */
  label?: string;

  /** 分组内的操作列表 */
  actions: MessageAction[];

  /** 分组显示条件 */
  shouldShow?: (message: Message) => boolean;
}

/**
 * 状态徽章配置
 */
export interface StatusBadge {
  /** 唯一标识 */
  id: string;

  /** 显示文本 */
  label: string;

  /** 图标 */
  icon?: LucideIcon;

  /** 颜色变体 */
  variant: 'default' | 'success' | 'warning' | 'info' | 'purple' | 'blue' | 'green';

  /** 显示条件 */
  shouldShow?: (message: Message) => boolean;

  /** 优先级 */
  priority?: number;

  /** Tooltip 详细信息 */
  tooltip?: string;
}

/**
 * 状态信息提取器
 */
export type StatusExtractor = (message: Message) => StatusBadge[];

/**
 * MessageHoverActions 组件配置
 */
export interface MessageHoverActionsConfig {
  /** 操作分组列表 */
  actionGroups: MessageActionGroup[];

  /** 状态提取器 */
  statusExtractor: StatusExtractor;

  /** 是否显示状态信息 */
  showStatus?: boolean;

  /** 是否显示操作按钮 */
  showActions?: boolean;
}

/**
 * 预定义的操作类型
 */
export type ActionType =
  | 'details'
  | 'thinking'
  | 'tools'
  | 'usage'
  | 'diff'
  | 'copy'
  | 'edit'
  | 'delete'
  | 'reply'
  | 'react'
  | 'share';

/**
 * 操作工厂函数
 */
export type ActionFactory = (config?: Partial<MessageAction>) => MessageAction;

/**
 * 操作注册表
 */
export type ActionRegistry = Record<string, ActionFactory>;
