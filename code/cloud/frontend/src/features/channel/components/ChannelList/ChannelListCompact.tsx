import { ChannelListItemCompact } from './ChannelListItemCompact';
import { ChannelListEmpty } from './ChannelListEmpty';
import { useTranslation } from 'react-i18next';
import { useChannelListLogic } from './hooks/useChannelListLogic';
import { Loader2 } from 'lucide-react';

interface ChannelListCompactProps {
  selectedChannelId?: string;
  onChannelSelect: (channelId: string) => void;
}

/**
 * ChannelListCompact - 紧凑版 Channel List
 *
 * 设计目标：
 * - 紧凑布局：小 padding，紧凑间距
 * - 限制高度：max-h-[400px]，超出滚动
 * - 简化分组：只显示 Pinned 和 Recent，无额外装饰
 * - 快速扫描：单行 Item，关键信息优先
 *
 * 适用场景：
 * - TopBar Popover（宽度 280px）
 * - 需要快速切换 channel 的场景
 *
 * 与完整版的区别：
 * - 移除大 padding（px-4 pt-4 pb-6 → p-2）
 * - 使用 ChannelListItemCompact（36px 高度）
 * - 移除 PinnedChannels 组件（直接渲染列表）
 * - 简化分组标题样式
 */
export function ChannelListCompact({
  selectedChannelId,
  onChannelSelect,
}: ChannelListCompactProps) {
  const { t } = useTranslation('channel');

  // Use shared business logic hook
  const {
    channels,
    pinnedChannels,
    recentChannels,
    isLoading,
    error,
  } = useChannelListLogic({ onChannelSelect });

  // Loading state
  if (isLoading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-sm text-red-400">Failed to load channels</p>
      </div>
    );
  }

  // Empty state
  if (channels.length === 0) {
    return <ChannelListEmpty />;
  }

  return (
    <div className="max-h-[400px] overflow-y-auto p-2 space-y-3">
      {/* Pinned Channels */}
      {pinnedChannels.length > 0 && (
        <div className="space-y-1">
          <h3 className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {t('list.pinned')}
          </h3>
          <div className="space-y-0.5">
            {pinnedChannels.map((channel) => (
              <ChannelListItemCompact
                key={channel.channel_id}
                channel={channel}
                isActive={selectedChannelId === channel.channel_id}
                onClick={() => onChannelSelect(channel.channel_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Channels */}
      {recentChannels.length > 0 && (
        <div className="space-y-1">
          <h3 className="px-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {t('list.recent')}
          </h3>
          <div className="space-y-0.5">
            {recentChannels.map((channel) => (
              <ChannelListItemCompact
                key={channel.channel_id}
                channel={channel}
                isActive={selectedChannelId === channel.channel_id}
                onClick={() => onChannelSelect(channel.channel_id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
