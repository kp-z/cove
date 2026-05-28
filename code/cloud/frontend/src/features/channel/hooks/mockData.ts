/**
 * Mock Data for Testing Channel State Indicators
 *
 * 用于测试频道状态指示器的模拟数据
 * 在实际数据源集成前使用
 */

import type { LastMessagePreview } from '../types/channel-state.types';

// 启用模拟数据的开关
export const ENABLE_MOCK_DATA = false;

// 模拟的发送者名称列表
const mockSenderNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];

// 模拟的消息内容列表
const mockMessageContents = [
  'Hey team, let\'s discuss the new feature implementation',
  'The deployment is complete and everything looks good!',
  'Can someone review my PR when you get a chance?',
  'Meeting starts in 5 minutes',
  'Great work on the last sprint!',
  'I\'ve updated the documentation',
  'The bug fix is ready for testing',
];

// 根据 channelId 生成确定性的模拟数据
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// 动态生成最后消息
export function getMockLastMessage(channelId: string): LastMessagePreview | null {
  if (!ENABLE_MOCK_DATA) return null;

  const hash = hashCode(channelId);
  const senderIndex = hash % mockSenderNames.length;
  const contentIndex = hash % mockMessageContents.length;
  const minutesAgo = (hash % 60) + 1;

  return {
    messageId: `msg-${channelId}`,
    content: mockMessageContents[contentIndex],
    senderId: `user-${senderIndex}`,
    senderName: mockSenderNames[senderIndex],
    senderType: 'human',
    timestamp: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    isSystemMessage: false,
  };
}

// 动态生成在线成员
export function getMockOnlineMembers(channelId: string): string[] {
  if (!ENABLE_MOCK_DATA) return [];

  const hash = hashCode(channelId);
  const memberCount = (hash % 5) + 1; // 1-5 个在线成员

  const members: string[] = [];
  for (let i = 0; i < memberCount; i++) {
    members.push(`user-${i}`);
  }

  return members;
}

// 动态生成未读计数
export function getMockUnreadCount(channelId: string): number {
  if (!ENABLE_MOCK_DATA) return 0;

  const hash = hashCode(channelId);
  const count = hash % 20; // 0-19 未读消息

  return count;
}

// 兼容旧的导出（保持向后兼容）
export const mockLastMessages: Record<string, LastMessagePreview> = {};
export const mockOnlineMembers: Record<string, string[]> = {};
export const mockUnreadCounts: Record<string, number> = {};
