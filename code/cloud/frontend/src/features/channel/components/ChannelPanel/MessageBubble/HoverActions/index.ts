/**
 * HoverActions 模块导出
 */

export { MessageHoverActions } from './MessageHoverActions';
export { ActionButton } from './ActionButton';
export { StatusBadge } from './StatusBadge';
export { MessageActionBar } from './MessageActionBar';
export { MessageStatusInfo } from './MessageStatusInfo';

export { messageActionManager } from './registry';
export { defaultStatusExtractor, createStatusExtractor } from './extractors';
export { getDefaultConfig } from './config';

export type {
  MessageAction,
  MessageActionGroup,
  StatusBadge,
  StatusExtractor,
  MessageHoverActionsConfig,
  ActionType,
  ActionFactory,
  ActionRegistry,
} from './types';
