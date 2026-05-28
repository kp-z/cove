/**
 * MessageActionBar 组件
 * 渲染操作按钮列表，支持分组和分隔符
 */

import { memo, useCallback } from 'react';
import { ActionButton } from './ActionButton';
import type { MessageActionGroup, MessageAction } from './types';
import type { Message } from '../../../../domain/models/Message';

interface MessageActionBarProps {
  actionGroups: MessageActionGroup[];
  message: Message;
  className?: string;
}

export const MessageActionBar = memo(function MessageActionBar({
  actionGroups,
  message,
  className,
}: MessageActionBarProps) {
  const handleActionClick = useCallback(
    (action: MessageAction) => {
      action.onClick(message);
    },
    [message]
  );

  const visibleGroups = actionGroups.filter((group) => {
    if (group.shouldShow && !group.shouldShow(message)) {
      return false;
    }

    const visibleActions = group.actions.filter((action) => {
      return !action.shouldShow || action.shouldShow(message);
    });

    return visibleActions.length > 0;
  });

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-0.5">
        {visibleGroups.map((group) => {
          const visibleActions = group.actions.filter((action) => {
            return !action.shouldShow || action.shouldShow(message);
          });

          return (
            <div key={group.id} className="flex items-center gap-0.5">
              {visibleActions.map((action) => {
                const isDisabled = action.isDisabled ? action.isDisabled(message) : false;

                return (
                  <ActionButton
                    key={action.id}
                    action={action}
                    onClick={() => handleActionClick(action)}
                    disabled={isDisabled}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});
