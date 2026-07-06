import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useChannels } from '@/lib/trpc/hooks';
import { useChannelPin } from '../../../hooks/useChannelPin';
import { notify } from '@/core/services/notificationService';
import { useCurrentUser } from '@/core/auth';

// Use the same type import path as other ChannelList components
type ChannelEntity = any; // Will be inferred from trpc response

export interface ChannelListLogicOptions {
  onChannelSelect?: (channelId: string) => void;
}

/**
 * useChannelListLogic - Channel List 业务逻辑 Hook
 *
 * 封装 ChannelList 的所有业务逻辑，包括：
 * - 数据获取和加载状态
 * - 置顶逻辑（pin/unpin）
 * - 频道分组和排序（pinned + recent）
 * - 事件处理器（togglePin, markAsRead, openSettings, leaveChannel）
 *
 * 设计原则：
 * - 高内聚：所有 channel list 相关逻辑集中在此
 * - 低耦合：不依赖具体的 UI 组件
 * - 可复用：可被完整版和紧凑版共享
 */
export function useChannelListLogic(options: ChannelListLogicOptions = {}) {
  const { t } = useTranslation('channel');
  const navigate = useNavigate();
  const { data, isLoading, error } = useChannels();
  const { userId } = useCurrentUser();

  // Use current user ID from auth store
  const { pinnedChannels: pinnedChannelIds, togglePin, isPinned } = useChannelPin(userId);

  // Extract channels from backend response
  const channels = data?.channels || [];

  // Filter and sort pinned channels
  const pinnedChannels = channels
    .filter((ch: ChannelEntity) => isPinned(ch.channel_id))
    .sort((a: ChannelEntity, b: ChannelEntity) => {
      const indexA = pinnedChannelIds.indexOf(a.channel_id);
      const indexB = pinnedChannelIds.indexOf(b.channel_id);
      return indexA - indexB;
    });

  // Filter and sort recent channels (non-pinned, sorted by updated_at)
  // 注：updated_at 实际存放在 channel.meta.updated_at（见 ChannelEntityJSON），
  // 顶层不存在该字段，读取顶层会永远得到 undefined。
  const recentChannels = channels
    .filter((ch: ChannelEntity) => !isPinned(ch.channel_id))
    .sort((a: ChannelEntity, b: ChannelEntity) =>
      new Date(b.meta?.updated_at ?? 0).getTime() - new Date(a.meta?.updated_at ?? 0).getTime()
    );

  // Event handlers
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

  const handleMarkAsRead = async (_channel: ChannelEntity) => {
    // TODO: Implement mark as read functionality
  };

  const handleOpenSettings = (channel: ChannelEntity) => {
    navigate(`/channels/${channel.channel_id}/edit`);
  };

  const handleLeaveChannel = async (_channel: ChannelEntity) => {
    // TODO: Implement leave channel functionality
  };

  const handleChannelSelect = (channelId: string) => {
    if (options.onChannelSelect) {
      options.onChannelSelect(channelId);
    }
  };

  return {
    // Data
    channels,
    pinnedChannels,
    recentChannels,

    // Loading states
    isLoading,
    error,

    // Pin state
    isPinned,

    // Event handlers
    handleTogglePin,
    handleMarkAsRead,
    handleOpenSettings,
    handleLeaveChannel,
    handleChannelSelect,
  };
}
