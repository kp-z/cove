import { Hash, Lock, MessageSquare, Bookmark, Check, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useTranslation } from 'react-i18next';
import { Avatar, getAvatarUrl } from '@/shared/components/display/Avatar';
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

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
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

  // Compact mode: smaller sizes (matching claude_manager reference)
  const avatarSize = compact ? 'sm' : 'md';
  const padding = compact ? 'px-2 py-1.5' : 'py-3';
  const textSize = compact ? 'text-[11px]' : 'text-sm';
  const timeSize = compact ? 'text-[9px]' : 'text-[10px]';
  const descSize = compact ? 'text-[10px]' : 'text-xs';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <motion.button
          onClick={onClick}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.99 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className={`w-full ${padding} flex items-center ${compact ? 'gap-2' : 'gap-3'} transition-all duration-200 ${
            isActive
              ? 'bg-blue-500/20 text-white'
              : 'hover:bg-white/[0.08] text-gray-300'
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
              <span className={`${textSize} font-medium truncate`}>{channel.name}</span>
              <span className={`${timeSize} text-muted-foreground shrink-0`}>
                {formatTime(channel.updated_at)}
              </span>
            </div>
            {channel.description && !compact && (
              <p className={`${descSize} text-muted-foreground truncate mt-0.5`}>{channel.description}</p>
            )}
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
