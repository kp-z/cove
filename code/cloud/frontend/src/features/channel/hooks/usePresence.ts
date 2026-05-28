/**
 * usePresence Hook
 *
 * 管理频道成员的在线状态
 * 使用现有的 MemberEntity.onlineStatus 字段
 */

import { useState, useEffect } from 'react';
import type { PresenceState, OnlineStatus } from '../types/channel-state.types';
import type { ChannelEntity } from '../api/client';
import { ENABLE_MOCK_DATA, getMockOnlineMembers } from './mockData';

// 从频道成员获取在线状态
// TODO: 实际实现需要查询 MemberEntity 的 onlineStatus 字段
function fetchPresenceState(channel: ChannelEntity | null): PresenceState {
  // 开发模式：使用模拟数据
  if (ENABLE_MOCK_DATA && channel) {
    const onlineMembers = getMockOnlineMembers(channel.channel_id);
    return {
      onlineMembers,
      awayMembers: [],
      offlineMembers: [],
      totalOnline: onlineMembers.length,
    };
  }

  // 如果没有频道数据，返回空状态
  if (!channel || !channel.members) {
    return {
      onlineMembers: [],
      awayMembers: [],
      offlineMembers: [],
      totalOnline: 0,
    };
  }

  // 从频道成员中提取成员 ID
  // 注意：这里假设所有成员都在线，因为我们没有实际的在线状态数据
  // TODO: 需要查询每个成员的 MemberEntity.onlineStatus
  const memberIds = channel.members.map(m => m.member_id);

  // 临时方案：将所有成员标记为在线以显示在线状态点
  // 实际应该通过 tRPC 查询或 WebSocket 获取真实的在线状态
  return {
    onlineMembers: memberIds,
    awayMembers: [],
    offlineMembers: [],
    totalOnline: memberIds.length,
  };
}

export function usePresence(channel: ChannelEntity | null): PresenceState {
  const [presenceState, setPresenceState] = useState<PresenceState>(
    () => fetchPresenceState(channel)
  );

  useEffect(() => {
    // 初始加载
    const state = fetchPresenceState(channel);
    setPresenceState(state);

    // TODO: 订阅 WebSocket 'presence.update' 事件
    // const unsubscribe = eventBus.on('presence.update', (event) => {
    //   if (event.channelId === channel?.channel_id) {
    //     const { userId, status } = event;
    //
    //     setPresenceState((prev) => {
    //       // 从所有列表中移除该用户
    //       const onlineMembers = prev.onlineMembers.filter(id => id !== userId);
    //       const awayMembers = prev.awayMembers.filter(id => id !== userId);
    //       const offlineMembers = prev.offlineMembers.filter(id => id !== userId);
    //
    //       // 根据新状态添加到对应列表
    //       if (status === 'online') {
    //         onlineMembers.push(userId);
    //       } else if (status === 'away') {
    //         awayMembers.push(userId);
    //       } else {
    //         offlineMembers.push(userId);
    //       }
    //
    //       return {
    //         onlineMembers,
    //         awayMembers,
    //         offlineMembers,
    //         totalOnline: onlineMembers.length + awayMembers.length,
    //       };
    //     });
    //   }
    // });

    // return unsubscribe;
  }, [channel]);

  return presenceState;
}

// 辅助函数：判断用户是否在线（online 或 away）
export function isUserOnline(status: OnlineStatus): boolean {
  return status === 'online' || status === 'away';
}

// 辅助函数：获取状态显示文本
export function getStatusText(status: OnlineStatus): string {
  const statusMap: Record<OnlineStatus, string> = {
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  };
  return statusMap[status];
}

// 辅助函数：获取状态颜色类
export function getStatusColor(status: OnlineStatus): string {
  const colorMap: Record<OnlineStatus, string> = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };
  return colorMap[status];
}
