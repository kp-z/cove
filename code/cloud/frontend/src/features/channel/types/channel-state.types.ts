/**
 * Channel State Types
 *
 * 定义频道状态相关的类型，用于状态指示器组件
 */

export interface ChannelState {
  channelId: string;
  typingUsers: string[];
  lastMessage: LastMessagePreview | null;
  unreadCount: number;
  onlineMembers: string[];
  awayMembers: string[];
  offlineMembers: string[];
}

export interface LastMessagePreview {
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  senderType: 'human' | 'agent';
  timestamp: string;
  isSystemMessage: boolean;
}

export type OnlineStatus = 'online' | 'offline' | 'away';

export interface PresenceState {
  onlineMembers: string[];
  awayMembers: string[];
  offlineMembers: string[];
  totalOnline: number;
}
