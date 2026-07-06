import { Hash, Lock, MessageSquare, Bookmark, Check, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useTranslation } from 'react-i18next';
import { Avatar, getAvatarUrl } from '@/shared/components/display/Avatar';
import { useChannelState } from '../../hooks/useChannelState';
import { TypingStateIndicator, LastMessagePreview, OnlineStatusDot, UnreadBadge } from './ChannelStateIndicators';
import type { ChannelEntity } from '../../api/client';

type ChannelType = 'public' | 'private' | 'dm' | 'thread';

interface ChannelListItemProps {
  channel: ChannelEntity;
  isActive: boolean;
  isPinned?: boolean;
  onClick: () => void;
  onTogglePin?: (channel: ChannelEntity) => void;
  onMarkAsRead?: (channel: ChannelEntity) => void;
  onOpenSettings?: (channel: ChannelEntity) => void;
  onLeaveChannel?: (channel: ChannelEntity) => void;
  compact?: boolean;
}

/**
 * 将时间戳格式化为相对时间标签（如 "3d"）。
 *
 * `updated_at` 实际存放在 `channel.meta.updated_at`（见 ChannelEntityJSON），
 * 部分 Channel（如刚创建、数据尚未补全）可能拿不到有效时间戳，此时返回
 * `null` 交由调用方决定不渲染角标，避免出现 `NaNd`。
 */
function formatTime(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const timestamp = new Date(dateStr).getTime();
  if (Number.isNaN(timestamp)) return null;

  const diff = Date.now() - timestamp;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ChannelListItem({
  channel,
  isActive,
  isPinned = false,
  onClick,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
  onLeaveChannel,
  compact = false,
}: ChannelListItemProps) {
  const { t } = useTranslation('channel');
  const avatarUrl = getAvatarUrl(channel.avatar);
  // 时间戳实际存放在 channel.meta.updated_at（详见 ChannelEntityJSON 定义）
  const timeLabel = formatTime(channel.meta?.updated_at);

  // Phase 1-4: 获取频道状态（所有功能已启用）
  const channelState = useChannelState(channel, {
    enableTyping: true,
    enableLastMessage: true,
    enableUnread: true,
    enablePresence: true,
  });

  // Compact mode: smaller sizes (matching claude_manager reference)
  const avatarSize = compact ? 'sm' : 'md';
  const padding = compact ? 'px-2 py-1.5' : '-mx-3 px-3 py-3';
  const textSize = compact ? 'text-[11px]' : 'text-sm';
  const timeSize = compact ? 'text-[9px]' : 'text-[10px]';
  const descSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <motion.button
          layout="position"
          onClick={onClick}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{
            layout: { duration: 0.25, ease: 'easeOut' },
            opacity: { duration: 0.2 },
            x: { duration: 0.2 },
          }}
          className={`w-full ${padding} flex items-center ${compact ? 'gap-2' : 'gap-3'} rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-blue-500/20 border border-blue-500/20 text-white'
              : 'hover:bg-white/[0.08] text-gray-300 border border-transparent'
          }`}
        >
          <Avatar
            src={avatarUrl}
            alt={channel.name}
            type="channel"
            channelType={channel.type as ChannelType}
            size={avatarSize}
          />
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`${textSize} font-medium truncate`}>{channel.name}</span>
                {/* 在线状态点 */}
                {channelState.onlineMembers.length > 0 && (
                  <OnlineStatusDot
                    members={channelState.onlineMembers}
                    status="online"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {timeLabel && (
                  <span className={`${timeSize} text-muted-foreground`}>
                    {timeLabel}
                  </span>
                )}
                {/* 未读徽章 */}
                {channelState.unreadCount > 0 && (
                  <UnreadBadge count={channelState.unreadCount} />
                )}
              </div>
            </div>

            {/* 优先级：输入状态 > 消息预览 > 描述 */}
            {channelState.typingUsers.length > 0 ? (
              <TypingStateIndicator
                users={channelState.typingUsers}
                layout="list"
                compact={compact}
              />
            ) : channelState.lastMessage ? (
              <LastMessagePreview
                message={channelState.lastMessage}
                compact={compact}
              />
            ) : channel.description && !compact ? (
              <p className={`${descSize} text-muted-foreground truncate mt-0.5`}>{channel.description}</p>
            ) : null}
          </div>
        </motion.button>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="
            min-w-[180px] bg-gray-800 border border-gray-700 rounded-lg p-1
            shadow-lg z-50 animate-in fade-in-0 zoom-in-95
          "
        >
          {onTogglePin && (
            <ContextMenu.Item
              onClick={() => onTogglePin(channel)}
              className="
                flex items-center gap-3 px-3 py-2 text-sm text-gray-200
                rounded cursor-pointer outline-none
                hover:bg-gray-700 focus:bg-gray-700
              "
            >
              <Bookmark className="w-4 h-4" />
              <span>{isPinned ? t('list.unpinChannel') : t('list.pinChannel')}</span>
            </ContextMenu.Item>
          )}

          {onMarkAsRead && (
            <ContextMenu.Item
              onClick={() => onMarkAsRead(channel)}
              className="
                flex items-center gap-3 px-3 py-2 text-sm text-gray-200
                rounded cursor-pointer outline-none
                hover:bg-gray-700 focus:bg-gray-700
              "
            >
              <Check className="w-4 h-4" />
              <span>{t('list.markAsRead')}</span>
            </ContextMenu.Item>
          )}

          {onOpenSettings && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
              <ContextMenu.Item
                onClick={() => onOpenSettings(channel)}
                className="
                  flex items-center gap-3 px-3 py-2 text-sm text-gray-200
                  rounded cursor-pointer outline-none
                  hover:bg-gray-700 focus:bg-gray-700
                "
              >
                <Settings className="w-4 h-4" />
                <span>{t('list.channelSettings')}</span>
              </ContextMenu.Item>
            </>
          )}

          {onLeaveChannel && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-700 my-1" />
              <ContextMenu.Item
                onClick={() => onLeaveChannel(channel)}
                className="
                  flex items-center gap-3 px-3 py-2 text-sm text-red-400
                  rounded cursor-pointer outline-none
                  hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white
                "
              >
                <LogOut className="w-4 h-4" />
                <span>{t('list.leaveChannel')}</span>
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
