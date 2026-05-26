import { PinnedChannels } from './PinnedChannels';
import { ChannelListItem } from './ChannelListItem';
import { ChannelListEmpty } from './ChannelListEmpty';
import { PageLoader } from '@/shared/components/layout/PageLoader';
import { PageError } from '@/shared/components/layout/PageError';
import { useTranslation } from 'react-i18next';
import { useChannelListLogic } from './hooks/useChannelListLogic';
import { Loader2 } from 'lucide-react';

interface ChannelListProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
  compact?: boolean; // 紧凑模式：用于 Popover
}

export function ChannelList({ selectedChannelId, onChannelSelect, compact = false }: ChannelListProps) {
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

  // Compact mode: simplified loading/error states
  if (compact) {
    if (isLoading) {
      return (
        <div className="h-[200px] flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-sm text-red-400">Failed to load channels</p>
        </div>
      );
    }
    if (channels.length === 0) return <ChannelListEmpty />;
  } else {
    // Full mode: use PageLoader/PageError
    if (isLoading) return <PageLoader />;
    if (error) return <PageError message="Failed to load channels" />;
    if (channels.length === 0) return <ChannelListEmpty />;
  }

  // Compact mode: tighter spacing
  const containerClass = compact
    ? 'max-h-[400px] overflow-y-auto p-2 space-y-3'
    : 'h-full flex flex-col gap-3 px-4 pt-4 pb-6';

  const sectionClass = compact ? 'space-y-1' : 'space-y-3';

  const headerClass = compact
    ? 'text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1'
    : 'text-xs font-semibold text-gray-500 uppercase tracking-wider';

  const listClass = compact
    ? 'space-y-0.5'
    : 'space-y-1';

  return (
    <div className={containerClass}>
      {pinnedChannels.length > 0 && (
        <div className={sectionClass}>
          {!compact && <h3 className={headerClass}>{t('list.pinned')}</h3>}
          {compact ? (
            <div className={listClass}>
              {pinnedChannels.map((channel) => (
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
                  compact={true}
                />
              ))}
            </div>
          ) : (
            <PinnedChannels
              channels={pinnedChannels}
              selectedChannelId={selectedChannelId}
              onChannelSelect={onChannelSelect}
              onTogglePin={handleTogglePin}
              onMarkAsRead={handleMarkAsRead}
              onOpenSettings={handleOpenSettings}
            />
          )}
        </div>
      )}

      {recentChannels.length > 0 && (
        <div className={sectionClass}>
          <h3 className={headerClass}>
            {t('list.recent')}
          </h3>
          <div className={listClass}>
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
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
