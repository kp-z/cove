import { motion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useTranslation } from 'react-i18next';
import type { ChannelEntity } from '../../api/client';

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

function PinnedChannelItem({
  channel,
  isActive,
  onSelect,
  onTogglePin,
  onMarkAsRead,
  onOpenSettings,
}: PinnedChannelItemProps) {
  const { t } = useTranslation('channel');

  // Check if channel name is an emoji
  const isEmoji = /^[\p{Emoji}]+$/u.test(channel.name);
  const initial = isEmoji ? channel.name : channel.name.charAt(0).toUpperCase();

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <Tooltip.Root delayDuration={300}>
          <Tooltip.Trigger asChild>
            <motion.button
              onClick={onSelect}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center
                font-semibold text-white cursor-pointer transition-all
                ${isEmoji ? 'bg-white/5 text-2xl' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-sm'}
                ${isActive
                  ? 'ring-2 ring-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]'
                  : 'ring-2 ring-transparent hover:ring-gray-600 hover:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]'
                }
              `}
            >
              {initial}
            </motion.button>
          </Tooltip.Trigger>
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
}: PinnedChannelsProps) {
  if (channels.length === 0) return null;

  return (
    <Tooltip.Provider>
      <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-center mb-2">
          <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
        </div>

        {/* Pinned channels - vertical layout */}
        <div className="flex flex-col items-center gap-1.5">
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
      </div>
    </Tooltip.Provider>
  );
}
