import { motion } from 'framer-motion';
import { Bookmark, Check, Settings, Hash, Lock, MessageSquare } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
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
}

interface PinnedChannelItemProps {
  channel: ChannelEntity;
  isActive: boolean;
  onSelect: () => void;
  onTogglePin?: () => void;
  onMarkAsRead?: () => void;
  onOpenSettings?: () => void;
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

function PinnedChannelItem({
  channel,
  isActive,
  onSelect,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
}: PinnedChannelItemProps) {
  const { t } = useTranslation('channel');

  return (
    <Tooltip.Root delayDuration={300}>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <Tooltip.Trigger asChild>
            <motion.button
              onClick={onSelect}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                cursor-pointer transition-all
                ${isActive
                  ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]'
                  : 'bg-white/5 text-gray-500 ring-2 ring-transparent hover:ring-gray-600 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                }
              `}
            >
              {getChannelIcon(channel.type as ChannelType)}
            </motion.button>
          </Tooltip.Trigger>
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

      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="
            bg-gray-900 text-gray-100 px-3 py-1.5 rounded-md text-xs
            border border-gray-700 shadow-lg z-50
            animate-in fade-in-0 zoom-in-95
          "
        >
          {channel.name}
          <Tooltip.Arrow className="fill-gray-700" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function PinnedChannels({
  channels,
  selectedChannelId,
  onChannelSelect,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
}: PinnedChannelsProps) {
  if (channels.length === 0) return null;

  return (
    <Tooltip.Provider>
      <div className="grid grid-cols-[repeat(auto-fill,40px)] gap-1.5">
        {channels.map((channel) => (
          <PinnedChannelItem
            key={channel.channel_id}
            channel={channel}
            isActive={selectedChannelId === channel.channel_id}
            onSelect={() => onChannelSelect(channel.channel_id)}
            onTogglePin={onTogglePin ? () => onTogglePin(channel) : undefined}
            onMarkAsRead={onMarkAsRead ? () => onMarkAsRead(channel) : undefined}
            onOpenSettings={onOpenSettings ? () => onOpenSettings(channel) : undefined}
          />
        ))}
      </div>
    </Tooltip.Provider>
  );
}
