import { motion } from 'framer-motion';
import { Bookmark, Check, Settings } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useTranslation } from 'react-i18next';
import { Avatar, getAvatarUrl } from '@/shared/components/display/Avatar';
import { useChannelState } from '../../hooks/useChannelState';
import { TypingStateIndicator, OnlineStatusDot, UnreadBadge } from './ChannelStateIndicators';
import type { ChannelEntity } from '../../api/client';

type ChannelType = 'public' | 'private' | 'dm' | 'thread';

interface PinnedChannelsProps {
  channels: ChannelEntity[];
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  onTogglePin?: (channel: ChannelEntity) => void;
  onMarkAsRead?: (channel: ChannelEntity) => void;
  onOpenSettings?: (channel: ChannelEntity) => void;
  compact?: boolean; // 紧凑模式：缩小图标和尺寸
}

interface PinnedChannelItemProps {
  channel: ChannelEntity;
  isActive: boolean;
  onSelect: () => void;
  onTogglePin?: () => void;
  onMarkAsRead?: () => void;
  onOpenSettings?: () => void;
  compact?: boolean;
}

function PinnedChannelItem({
  channel,
  isActive,
  onSelect,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
  compact = false,
}: PinnedChannelItemProps) {
  const { t } = useTranslation('channel');

  // Phase 1-4: 获取频道状态（所有功能已启用）
  const channelState = useChannelState(channel, {
    enableTyping: true,
    enableLastMessage: false, // 网格模式不显示消息预览
    enableUnread: true,
    enablePresence: true,
  });

  // Compact mode: smaller sizes
  const avatarSize = compact ? 'sm' : 'md';
  const textSize = compact ? 'text-[10px]' : 'text-xs';

  const avatarUrl = getAvatarUrl(channel.avatar);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="flex flex-col items-start gap-1">
          <div className="relative inline-block">
            <motion.div
              onClick={onSelect}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                cursor-pointer transition-all relative
                ${isActive
                  ? 'ring-2 ring-blue-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]'
                  : 'ring-2 ring-transparent hover:ring-gray-600 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                }
              `}
              style={{ borderRadius: '0.5rem' }}
            >
              <Avatar
                src={avatarUrl}
                alt={channel.name}
                type="channel"
                channelType={channel.type as ChannelType}
                size={avatarSize}
              />

              {/* 输入状态叠加层 */}
              {channelState.typingUsers.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5 rounded-b">
                  <TypingStateIndicator
                    users={channelState.typingUsers}
                    layout="grid"
                    compact={compact}
                  />
                </div>
              )}

              {/* 在线状态点 - 在头像右下角，稍微超出边缘 */}
              {channelState.onlineMembers.length > 0 && (
                <div className="absolute -bottom-0.5 -right-0.5">
                  <OnlineStatusDot
                    members={channelState.onlineMembers}
                    status="online"
                  />
                </div>
              )}
            </motion.div>

            {/* 未读徽章 - 在 motion.div 外层 */}
            {channelState.unreadCount > 0 && (
              <UnreadBadge
                count={channelState.unreadCount}
                className="absolute -top-1 -right-1"
              />
            )}
          </div>
          <span className={`${textSize} text-gray-400 w-full text-left truncate`}>
            {channel.name}
          </span>
        </div>
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
              onClick={onTogglePin}
              className="
                flex items-center gap-3 px-3 py-2 text-sm text-gray-200
                rounded cursor-pointer outline-none
                hover:bg-gray-700 focus:bg-gray-700
              "
            >
              <Bookmark className="w-4 h-4" />
              <span>{t('list.unpinChannel')}</span>
            </ContextMenu.Item>
          )}

          {onMarkAsRead && (
            <ContextMenu.Item
              onClick={onMarkAsRead}
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
                onClick={onOpenSettings}
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
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export function PinnedChannels({
  channels,
  selectedChannelId,
  onChannelSelect,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
  compact = false,
}: PinnedChannelsProps) {
  if (channels.length === 0) return null;

  // Compact mode: smaller grid cells
  const gridCols = compact ? 'grid-cols-[repeat(auto-fill,48px)]' : 'grid-cols-[repeat(auto-fill,64px)]';

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {channels.map((channel) => (
        <PinnedChannelItem
          key={channel.channel_id}
          channel={channel}
          isActive={selectedChannelId === channel.channel_id}
          onSelect={() => onChannelSelect(channel.channel_id)}
          onTogglePin={onTogglePin ? () => onTogglePin(channel) : undefined}
          onMarkAsRead={onMarkAsRead ? () => onMarkAsRead(channel) : undefined}
          onOpenSettings={onOpenSettings ? () => onOpenSettings(channel) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}
