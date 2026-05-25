import { PinnedChannels } from './PinnedChannels';
import { ChannelListItem } from './ChannelListItem';
import { ChannelListEmpty } from './ChannelListEmpty';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useTranslation } from 'react-i18next';
import { useChannelListLogic } from './hooks/useChannelListLogic';

interface ChannelListProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ selectedChannelId, onChannelSelect }: ChannelListProps) {
  const { t } = useTranslation('channel');

  // Use shared business logic hook
  const {
    channels,
    pinnedChannels,
    recentChannels,
    isLoading,
    error,
    isPinned,
    handleTogglePin,
    handleMarkAsRead,
    handleOpenSettings,
    handleLeaveChannel,
  } = useChannelListLogic({ onChannelSelect });

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message="Failed to load channels" />;
  if (channels.length === 0) return <ChannelListEmpty />;

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
            {recentChannels.map((channel) => (
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
