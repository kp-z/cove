import { Hash, Lock, MessageSquare, Bookmark, Check, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { useTranslation } from 'react-i18next';
import type { ChannelEntity } from '../../api/client';

type ChannelType = 'public' | 'private' | 'dm' | 'thread';

interface ChannelListItemProps {
  channel: ChannelEntity;
  isActive: boolean;
  onClick: () => void;
  onTogglePin?: (channel: ChannelEntity) => void;
  onMarkAsRead?: (channel: ChannelEntity) => void;
  onOpenSettings?: (channel: ChannelEntity) => void;
  onLeaveChannel?: (channel: ChannelEntity) => void;
}

function getChannelIcon(type: ChannelType) {
  switch (type) {
    case 'public':
      return <Hash className="w-4 h-4" />;
    case 'private':
      return <Lock className="w-4 h-4" />;
    case 'dm':
    case 'thread':
      return <MessageSquare className="w-4 h-4" />;
    default:
      return <Hash className="w-4 h-4" />;
  }
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
  onClick,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
  onLeaveChannel,
}: ChannelListItemProps) {
  const { t } = useTranslation('channel');

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <motion.button
          onClick={onClick}
          whileHover={{ scale: 1.01, x: 4 }}
          whileTap={{ scale: 0.99 }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className={`w-full px-4 py-3 flex items-center gap-3 rounded-lg transition-all duration-200 ${
            isActive
              ? 'bg-blue-500/10 border border-blue-500/20 text-white'
              : 'hover:bg-white/[0.03] text-gray-300 border border-transparent'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'
            }`}
          >
            {getChannelIcon(channel.type as ChannelType)}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{channel.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatTime(channel.updated_at)}
              </span>
            </div>
            {channel.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{channel.description}</p>
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
              <span>{t('list.pinChannel')}</span>
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
