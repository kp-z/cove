/**
 * ChannelPanel 组件导出
 *
 * 统一导出所有 ChannelPanel 相关的组件和类型
 */

// 主组件
export { default as ChannelPanel } from './index';
export { default as ChannelHeader } from './ChannelHeader';
export { default as ThreadTabs } from './ThreadTabs';
export { default as AgentInfoBar } from './AgentInfoBar';
export { default as MessageList } from './MessageList';
export { default as Composer } from './Composer';

// 类型定义
export type {
  Channel,
  ChannelType,
  Thread,
  Message,
  MessageSender,
  AgentInfo,
  ChannelPanelProps,
} from './types';

export type { ChannelHeaderProps } from './ChannelHeader';
export type { ThreadTabsProps } from './ThreadTabs';
export type { AgentInfoBarProps } from './AgentInfoBar';
export type { MessageListProps } from './MessageList';
export type { ComposerProps } from './Composer';
