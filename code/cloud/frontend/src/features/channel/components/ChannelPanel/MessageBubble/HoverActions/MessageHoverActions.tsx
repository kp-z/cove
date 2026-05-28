/**
 * MessageHoverActions 容器组件
 * 管理 hover 状态，集成操作栏和状态信息
 */

import { memo, useMemo } from 'react';
import { cn } from '@/shared/utils/cn';
import { MessageActionBar } from './MessageActionBar';
import { MessageStatusInfo } from './MessageStatusInfo';
import type { MessageHoverActionsConfig } from './types';
import type { Message } from '../../../../domain/models/Message';

interface MessageHoverActionsProps {
  message: Message;
  config: MessageHoverActionsConfig;
  className?: string;
}

export const MessageHoverActions = memo(function MessageHoverActions({
  message,
  config,
  className,
}: MessageHoverActionsProps) {
  const {
    actionGroups,
    statusExtractor,
    showStatus = true,
    showActions = true,
  } = config;

  const hasVisibleContent = useMemo(() => {
    if (showStatus) {
      const badges = statusExtractor(message);
      if (badges.length > 0) return true;
    }

    if (showActions) {
      const hasVisibleActions = actionGroups.some((group) => {
        if (group.shouldShow && !group.shouldShow(message)) {
          return false;
        }
        return group.actions.some((action) => !action.shouldShow || action.shouldShow(message));
      });
      if (hasVisibleActions) return true;
    }

    return false;
  }, [message, actionGroups, statusExtractor, showStatus, showActions]);

  if (!hasVisibleContent) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-1',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        className
      )}
    >
      {showStatus && (
        <MessageStatusInfo message={message} statusExtractor={statusExtractor} />
      )}

      {showActions && <MessageActionBar actionGroups={actionGroups} message={message} />}
    </div>
  );
});
