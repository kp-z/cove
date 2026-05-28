/**
 * 默认配置
 */

import { messageActionManager } from './registry';
import { defaultStatusExtractor } from './extractors';
import type { MessageHoverActionsConfig } from './types';
import type { Message } from '../../../../domain/models/Message';

export type TabType = 'thinking' | 'tools' | 'usage' | 'stats';

/**
 * 获取默认配置
 */
export function getDefaultConfig(
  message: Message,
  onOpenModal?: (defaultTab?: TabType) => void,
  onEdit?: () => void,
  onDelete?: () => void,
  onReply?: () => void
): MessageHoverActionsConfig {
  const isAgent = message.senderType === 'agent';
  const isUser = message.senderType === 'user';

  if (isAgent) {
    return {
      actionGroups: [
        {
          id: 'agent-details',
          actions: [
            messageActionManager.get('thinking', {
              onClick: () => onOpenModal?.('thinking'),
            })!,
            messageActionManager.get('tools', {
              onClick: () => onOpenModal?.('tools'),
            })!,
            messageActionManager.get('usage', {
              onClick: () => onOpenModal?.('usage'),
            })!,
            messageActionManager.get('diff', {
              onClick: () => {
                // TODO: 实现 diff 查看器
                console.log('Open diff viewer');
              },
            })!,
          ].filter(Boolean),
        },
        {
          id: 'common-actions',
          actions: [messageActionManager.get('copy')!],
        },
      ],
      statusExtractor: defaultStatusExtractor,
      showStatus: true,
      showActions: true,
    };
  }

  if (isUser) {
    return {
      actionGroups: [
        {
          id: 'user-actions',
          actions: [
            messageActionManager.get('copy')!,
            messageActionManager.get('edit', {
              onClick: () => onEdit?.(),
            })!,
            messageActionManager.get('delete', {
              onClick: () => onDelete?.(),
            })!,
            messageActionManager.get('reply', {
              onClick: () => onReply?.(),
            })!,
          ].filter(Boolean),
        },
      ],
      statusExtractor: () => [], // 用户消息不显示状态信息
      showStatus: false,
      showActions: true,
    };
  }

  // 系统消息
  return {
    actionGroups: [
      {
        id: 'system-actions',
        actions: [messageActionManager.get('copy')!],
      },
    ],
    statusExtractor: () => [],
    showStatus: false,
    showActions: true,
  };
}
