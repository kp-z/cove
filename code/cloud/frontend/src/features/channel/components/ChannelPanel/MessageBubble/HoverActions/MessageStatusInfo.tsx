/**
 * MessageStatusInfo 组件
 * 渲染状态徽章列表
 */

import { memo, useMemo } from 'react';
import { StatusBadge } from './StatusBadge';
import type { StatusExtractor } from './types';
import type { Message } from '../../../../domain/models/Message';

interface MessageStatusInfoProps {
  message: Message;
  statusExtractor: StatusExtractor;
  className?: string;
}

export const MessageStatusInfo = memo(function MessageStatusInfo({
  message,
  statusExtractor,
  className,
}: MessageStatusInfoProps) {
  const badges = useMemo(() => {
    return statusExtractor(message);
  }, [message, statusExtractor]);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {badges.map((badge) => (
          <StatusBadge key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
});
