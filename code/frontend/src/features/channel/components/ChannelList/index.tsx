import { PinnedChannels } from './PinnedChannels';
import { ChannelListItem } from './ChannelListItem';
import { ChannelListEmpty } from './ChannelListEmpty';
import { useChannels } from '@/lib/trpc/hooks';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import type { ChannelEntity } from '../../api/client';

interface ChannelListProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

export function ChannelList({ selectedChannelId, onChannelSelect }: ChannelListProps) {
  const { data: channels, isLoading, error } = useChannels();

  if (isLoading) return <PageLoader />;
  if (error) return <PageError message="Failed to load channels" />;
  if (!channels || channels.length === 0) return <ChannelListEmpty />;

  const pinnedChannels = channels.filter((ch: ChannelEntity) => ch.is_pinned);
  const recentChannels = channels
    .filter((ch: ChannelEntity) => !ch.is_pinned)
    .sort((a: ChannelEntity, b: ChannelEntity) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

  return (
    <div className="h-full flex flex-col">
      {pinnedChannels.length > 0 && (
        <>
          <PinnedChannels
            channels={pinnedChannels}
            selectedChannelId={selectedChannelId}
            onChannelSelect={onChannelSelect}
          />
          <div className="border-t border-white/10 mx-4" />
        </>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {recentChannels.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              Recent
            </h3>
            {recentChannels.map((channel: ChannelEntity) => (
              <ChannelListItem
                key={channel.channel_id}
                channel={channel}
                isActive={selectedChannelId === channel.channel_id}
                onClick={() => onChannelSelect(channel.channel_id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
