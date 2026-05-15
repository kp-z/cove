import { motion } from 'framer-motion';
import { ChannelAvatar } from './ChannelAvatar';
import type { ChannelEntity } from '../../api/client';

interface PinnedChannelsProps {
  channels: ChannelEntity[];
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function PinnedChannels({ channels, selectedChannelId, onChannelSelect }: PinnedChannelsProps) {
  if (channels.length === 0) return null;

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Pinned
      </h3>
      <div className="flex flex-wrap gap-3">
        {channels.map((channel) => (
          <motion.div
            key={channel.channel_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <ChannelAvatar
              channel={channel}
              size="md"
              onClick={() => onChannelSelect(channel.channel_id)}
            />
            {selectedChannelId === channel.channel_id && (
              <motion.div
                layoutId="activeChannelIndicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
