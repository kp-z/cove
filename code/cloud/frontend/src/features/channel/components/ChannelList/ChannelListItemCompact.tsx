import { Hash, Lock, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAvatarUrl } from '@/shared/utils/avatar';

type ChannelEntity = any; // Will be inferred from trpc response
type ChannelType = 'public' | 'private' | 'dm' | 'thread';

interface ChannelListItemCompactProps {
  channel: ChannelEntity;
  isActive: boolean;
  onClick: () => void;
  unreadCount?: number;
}

function getChannelIcon(type: ChannelType) {
  switch (type) {
    case 'public':
      return <Hash className="w-3.5 h-3.5" />;
    case 'private':
      return <Lock className="w-3.5 h-3.5" />;
    case 'dm':
    case 'thread':
      return <MessageSquare className="w-3.5 h-3.5" />;
    default:
      return <Hash className="w-3.5 h-3.5" />;
  }
}

/**
 * ChannelListItemCompact - 紧凑版 Channel List Item
 *
 * 设计目标：
 * - 单行布局，高度 36px
 * - 只显示关键信息：头像 + 名称 + 未读徽章
 * - 移除右键菜单（点击直接跳转）
 * - 简化动画效果
 *
 * 适用场景：
 * - TopBar Popover（宽度 280px，最大高度 400px）
 * - 需要紧凑展示的场景
 */
export function ChannelListItemCompact({
  channel,
  isActive,
  onClick,
  unreadCount = 0,
}: ChannelListItemCompactProps) {
  const avatarUrl = getAvatarUrl(channel.avatar);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01, x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full h-9 px-2 flex items-center gap-2 rounded-lg transition-all duration-150
        ${
          isActive
            ? 'bg-blue-500/10 border border-blue-500/20 text-white'
            : 'hover:bg-white/[0.03] text-gray-300 border border-transparent'
        }
      `}
    >
      {/* Avatar or Icon */}
      {avatarUrl ? (
        <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
          <img
            src={avatarUrl}
            alt={channel.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`
            w-6 h-6 rounded-md flex items-center justify-center shrink-0
            ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'}
          `}
        >
          {getChannelIcon(channel.type as ChannelType)}
        </div>
      )}

      {/* Channel Name */}
      <span className="flex-1 text-sm font-medium truncate text-left">
        {channel.name}
      </span>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <div className="shrink-0 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center bg-blue-500 text-white text-[10px] font-semibold rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </motion.button>
  );
}
