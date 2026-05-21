import { PinnedChannels } from './PinnedChannels';
import { ChannelListItem } from './ChannelListItem';
import { ChannelListEmpty } from './ChannelListEmpty';
import { useChannels } from '@/lib/trpc/hooks';
import { useChannelPin } from '../../hooks/useChannelPin';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useTranslation } from 'react-i18next';
import { notify } from '@/core/services/notificationService';
import { useCurrentUser } from '@/core/auth';
import type { ChannelEntity } from '../../api/client';

interface ChannelListProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ selectedChannelId, onChannelSelect }: ChannelListProps) {
  const { t } = useTranslation('channel');
  const { data, isLoading, error } = useChannels();
  const { userId } = useCurrentUser();

  // Use current user ID from auth store
  const { pinnedChannels: pinnedChannelIds, togglePin, isPinned } = useChannelPin(userId || '');

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
      await togglePin(channel.channel_id);

      notify.toast.success(willPin ? t('list.pinSuccess') : t('list.unpinSuccess'));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('list.pinError');
      notify.toast.error(errorMessage);
    }
  };

  const handleMarkAsRead = async () => {
    // TODO: Implement mark as read functionality
  };

  const handleOpenSettings = () => {
    // TODO: Implement open settings functionality
  };

  const handleLeaveChannel = async () => {
    // TODO: Implement leave channel functionality
  };

  return (
    <div className="h-full flex flex-col gap-3 px-4 pt-4 pb-6">
      {pinnedChannels.length > 0 && (
        <div className="p-4">
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

      {recentChannels.length > 0 && (
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t('list.recent')}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-1 -mx-6 px-2">
            {recentChannels.map((channel: ChannelEntity) => (
              <ChannelListItem
                key={channel.channel_id}
                channel={channel}
                isActive={selectedChannelId === channel.channel_id}
                isPinned={isPinned(channel.channel_id)}
                onClick={() => onChannelSelect(channel.channel_id)}
                onTogglePin={handleTogglePin}
                onMarkAsRead={handleMarkAsRead}
                onOpenSettings={handleOpenSettings}
                onLeaveChannel={handleLeaveChannel}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
