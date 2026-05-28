/**
 * Channel State Indicators
 *
 * 可复用的频道状态指示器组件库
 * 支持列表和网格两种布局模式
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { LastMessagePreview } from '../../types/channel-state.types';

// ============================================================================
// Typing State Indicator
// ============================================================================

interface TypingStateIndicatorProps {
  users: string[];
  layout?: 'list' | 'grid';
  compact?: boolean;
}

export function TypingStateIndicator({
  users,
  layout = 'list',
  compact = false,
}: TypingStateIndicatorProps) {
  const { t } = useTranslation('channel');

  if (users.length === 0) return null;

  const textSize = compact ? 'text-[10px]' : 'text-xs';
  const isGrid = layout === 'grid';

  // 格式化输入用户名称
  const formatTypingUsers = () => {
    if (users.length === 1) {
      return t('state.typing.single', { user: users[0] });
    }
    if (users.length === 2) {
      return t('state.typing.double', { user1: users[0], user2: users[1] });
    }
    return t('state.typing.multiple', { count: users.length });
  };

  return (
    <div
      className={`flex items-center gap-1 ${textSize} text-gray-400 ${
        isGrid ? 'justify-center' : ''
      }`}
    >
      <span className="truncate">{formatTypingUsers()}</span>
      <TypingDots compact={compact} />
    </div>
  );
}

// 输入动画点
function TypingDots({ compact }: { compact: boolean }) {
  const dotSize = compact ? 'w-1 h-1' : 'w-1.5 h-1.5';

  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${dotSize} bg-gray-400 rounded-full`}
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Last Message Preview
// ============================================================================

interface LastMessagePreviewProps {
  message: LastMessagePreview;
  compact?: boolean;
}

export function LastMessagePreview({
  message,
  compact = false,
}: LastMessagePreviewProps) {
  const textSize = compact ? 'text-[10px]' : 'text-xs';
  const maxLength = compact ? 20 : 40;

  // 截断消息内容
  const truncateContent = (content: string | undefined) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  // 系统消息特殊样式
  if (message.isSystemMessage) {
    return (
      <p className={`${textSize} text-gray-500 italic truncate`}>
        {truncateContent(message.content)}
      </p>
    );
  }

  return (
    <p className={`${textSize} text-gray-400 truncate`}>
      <span className="font-medium text-gray-300">{message.senderName}:</span>{' '}
      {truncateContent(message.content)}
    </p>
  );
}

// ============================================================================
// Online Status Dot
// ============================================================================

interface OnlineStatusDotProps {
  members: string[];
  status?: 'online' | 'away' | 'offline';
  className?: string;
  showTooltip?: boolean;
}

export function OnlineStatusDot({
  members,
  status = 'online',
  className = '',
  showTooltip = true,
}: OnlineStatusDotProps) {
  if (members.length === 0 && status === 'offline') return null;

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  const dotColor = statusColors[status];

  return (
    <div className={`relative ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${dotColor} ring-2 ring-gray-900`}
        title={
          showTooltip && members.length > 0
            ? `${members.length} online: ${members.join(', ')}`
            : undefined
        }
      />
    </div>
  );
}

// ============================================================================
// Unread Badge
// ============================================================================

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export function UnreadBadge({ count, className = '' }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <div
      className={`
        flex items-center justify-center
        min-w-[18px] h-[18px] px-1.5
        bg-red-500 text-white
        text-[10px] font-semibold
        rounded-full
        ${className}
      `}
      aria-label={`${count} unread messages`}
    >
      {displayCount}
    </div>
  );
}

// ============================================================================
// Composite Component (Optional)
// ============================================================================

interface ChannelStateIndicatorsProps {
  channelId: string;
  typingUsers?: string[];
  lastMessage?: LastMessagePreview | null;
  unreadCount?: number;
  onlineMembers?: string[];
  layout?: 'list' | 'grid';
  compact?: boolean;
}

export function ChannelStateIndicators({
  typingUsers = [],
  lastMessage = null,
  unreadCount = 0,
  onlineMembers = [],
  layout = 'list',
  compact = false,
}: ChannelStateIndicatorsProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* 输入状态优先显示 */}
      {typingUsers.length > 0 ? (
        <TypingStateIndicator
          users={typingUsers}
          layout={layout}
          compact={compact}
        />
      ) : lastMessage ? (
        <LastMessagePreview message={lastMessage} compact={compact} />
      ) : null}

      {/* 在线状态和未读徽章 */}
      <div className="flex items-center gap-2">
        {onlineMembers.length > 0 && (
          <OnlineStatusDot members={onlineMembers} />
        )}
        {unreadCount > 0 && <UnreadBadge count={unreadCount} />}
      </div>
    </div>
  );
}
