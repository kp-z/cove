/**
 * useChannelState Hook
 *
 * 统一聚合频道的所有状态数据
 * - 输入状态（Phase 1 ✅）
 * - 最后消息预览（Phase 2 ✅）
 * - 在线状态（Phase 3 ✅）
 * - 未读计数（Phase 4 ✅）
 */

import { useTypingState } from './useTypingState';
import { useLastMessage } from './useLastMessage';
import { usePresence } from './usePresence';
import { useUnreadCount } from './useUnreadCount';
import type { ChannelState } from '../types/channel-state.types';
import type { ChannelEntity } from '../api/client';

interface UseChannelStateOptions {
  enableTyping?: boolean;
  enableLastMessage?: boolean;
  enableUnread?: boolean;
  enablePresence?: boolean;
}

export function useChannelState(
  channel: ChannelEntity,
  options: UseChannelStateOptions = {}
): ChannelState {
  const {
    enableTyping = true,
    enableLastMessage = true,
    enableUnread = true,
    enablePresence = true,
  } = options;

  const channelId = channel.channel_id;

  // Phase 1: 输入状态（已实现）
  const { typingUsers } = enableTyping
    ? useTypingState(channelId)
    : { typingUsers: [] };

  // Phase 2: 最后消息预览（已实现）
  const lastMessage = enableLastMessage ? useLastMessage(channelId) : null;

  // Phase 3: 在线状态（已实现 - 使用频道成员数据）
  const { onlineMembers, awayMembers, offlineMembers } = enablePresence
    ? usePresence(channel)
    : { onlineMembers: [], awayMembers: [], offlineMembers: [] };

  // Phase 4: 未读计数（已实现）
  const unreadCount = enableUnread ? useUnreadCount(channelId) : 0;

  return {
    channelId,
    typingUsers,
    lastMessage,
    unreadCount,
    onlineMembers,
    awayMembers,
    offlineMembers,
  };
}
