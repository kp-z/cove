import { motion } from 'framer-motion';
import { Bookmark, Check, Settings, Hash, Lock, MessageSquare } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useTranslation } from 'react-i18next';
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
  compact?: boolean; // 紧凑模式
}

function getChannelIcon(type: ChannelType, compact = false) {
  const size = compact ? 10 : 16;
  const className = compact ? 'w-2.5 h-2.5' : 'w-4 h-4';
  switch (type) {
    case 'public':
      return <Hash className={className} size={size} />;
    case 'private':
      return <Lock className={className} size={size} />;
    case 'dm':
    case 'thread':
      return <MessageSquare className={className} size={size} />;
    default:
      return <Hash className={className} size={size} />;
  }
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

  // Compact mode: smaller sizes
  const buttonSize = compact ? 'w-7 h-7' : 'w-10 h-10';
  const textSize = compact ? 'text-[10px]' : 'text-xs';
  const gridWidth = compact ? '48px' : '64px';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="flex flex-col items-center gap-1">
          <motion.button
            onClick={onSelect}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              ${buttonSize} rounded-lg flex items-center justify-center
              cursor-pointer transition-all
              ${isActive
                ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]'
                : 'bg-white/5 text-gray-500 ring-2 ring-transparent hover:ring-gray-600 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
              }
            `}
          >
            {getChannelIcon(channel.type as ChannelType, compact)}
          </motion.button>
          <span className={`${textSize} text-gray-400 w-full text-center truncate px-1`}>
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
