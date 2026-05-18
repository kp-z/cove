import { PinnedChannels } from './PinnedChannels';
import { ChannelListItem } from './ChannelListItem';
import { ChannelListEmpty } from './ChannelListEmpty';
import { useChannels } from '@/lib/trpc/hooks';
import { useChannelPin } from '../../hooks/useChannelPin';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ChannelEntity } from '../../api/client';

interface ChannelListProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ selectedChannelId, onChannelSelect }: ChannelListProps) {
  const { t } = useTranslation('channel');
  const { data, isLoading, error } = useChannels();

  // TODO: Get current user ID from auth context
  // For now, using hardcoded user ID
  const currentUserId = 'user-kp';
  const { pinnedChannels: pinnedChannelIds, togglePin, isPinned } = useChannelPin(currentUserId);

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message="Failed to load channels" />;

  // Backend returns { channels: [...], total: number }
  const channels = data?.channels || [];
  if (channels.length === 0) return <ChannelListEmpty />;

  // Filter channels based on user's pinned list
  const pinnedChannels = channels.filter((ch: ChannelEntity) =>
    isPinned(ch.channel_id)
  );

  // Sort pinned channels by user's preference order
  pinnedChannels.sort((a: ChannelEntity, b: ChannelEntity) => {
    const indexA = pinnedChannelIds.indexOf(a.channel_id);
    const indexB = pinnedChannelIds.indexOf(b.channel_id);
    return indexA - indexB;
  });

  const recentChannels = channels
    .filter((ch: ChannelEntity) => !isPinned(ch.channel_id))
    .sort((a: ChannelEntity, b: ChannelEntity) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  // Business logic handlers
  const handleTogglePin = async (channel: ChannelEntity) => {
    const willPin = !isPinned(channel.channel_id);

    try {
      console.log('Toggling pin for channel:', {
        channelId: channel.channel_id,
        name: channel.name,
        currentPinState: isPinned(channel.channel_id),
        newPinState: willPin,
      });

      await togglePin(channel.channel_id);

      toast.success(willPin ? t('list.pinSuccess') : t('list.unpinSuccess'));
      console.log('Pin toggle successful');
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      const errorMessage = error instanceof Error ? error.message : t('list.pinError');
      toast.error(errorMessage);
    }
  };

  const handleMarkAsRead = async (channel: ChannelEntity) => {
    // TODO: Implement mark as read functionality
    console.log('Mark as read:', channel.channel_id);
  };

  const handleOpenSettings = (channel: ChannelEntity) => {
    // TODO: Implement open settings functionality
    console.log('Open settings:', channel.channel_id);
  };

  const handleLeaveChannel = async (channel: ChannelEntity) => {
    // TODO: Implement leave channel functionality
    console.log('Leave channel:', channel.channel_id);
  };

  return (
    <div className="h-full flex flex-col">
      {pinnedChannels.length > 0 && (
        <div className="p-2">
          <PinnedChannels
            channels={pinnedChannels}
            selectedChannelId={selectedChannelId}
            onChannelSelect={onChannelSelect}
            onTogglePin={handleTogglePin}
            onMarkAsRead={handleMarkAsRead}
            onOpenSettings={handleOpenSettings}
          />
        </div>
      )}

      {pinnedChannels.length > 0 && recentChannels.length > 0 && (
        <div className="border-t border-white/10 mx-2" />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {recentChannels.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              {t('list.recent')}
            </h3>
            {recentChannels.map((channel: ChannelEntity) => (
              <ChannelListItem
                key={channel.channel_id}
                channel={channel}
                isActive={selectedChannelId === channel.channel_id}
                onClick={() => onChannelSelect(channel.channel_id)}
                onTogglePin={handleTogglePin}
                onMarkAsRead={handleMarkAsRead}
                onOpenSettings={handleOpenSettings}
                onLeaveChannel={handleLeaveChannel}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
