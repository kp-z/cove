import React from 'react';
import { Hash, Lock, MessageSquare, User, Bot, Building } from 'lucide-react';

export type EntityType = 'user' | 'agent' | 'channel' | 'realm';
export type ChannelType = 'public' | 'private' | 'dm' | 'thread';

/**
 * 统一的 Avatar URL 处理函数
 * 合并了 getAvatarUrl 和 getAgentAvatarUrl
 */
export function getAvatarUrl(
  avatarUrl?: string | null | { url: string }
): string | undefined {
  if (!avatarUrl) return undefined;

  // Handle object format
  if (typeof avatarUrl === 'object' && avatarUrl.url) {
    avatarUrl = avatarUrl.url;
  }

  // Ensure string
  if (typeof avatarUrl !== 'string') {
    console.warn('Invalid avatar URL type:', typeof avatarUrl, avatarUrl);
    return undefined;
  }

  // Already full URL
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }

  // Prepend API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
  const cleanPath = avatarUrl.startsWith('/') ? avatarUrl.slice(1) : avatarUrl;
  return `${apiUrl}/${cleanPath}`;
}

/**
 * 获取 Channel 类型对应的图标
 */
export function getChannelIcon(channelType: ChannelType, size: number) {
  switch (channelType) {
    case 'public':
      return <Hash size={size} />;
    case 'private':
      return <Lock size={size} />;
    case 'dm':
    case 'thread':
      return <MessageSquare size={size} />;
    default:
      return <Hash size={size} />;
  }
}

/**
 * 获取实体类型对应的图标
 */
export function getIconForType(
  type: EntityType,
  channelType: ChannelType,
  size: number
) {
  switch (type) {
    case 'user':
      return <User size={size} />;
    case 'agent':
      return <Bot size={size} />;
    case 'realm':
      return <Building size={size} />;
    case 'channel':
      return getChannelIcon(channelType, size);
    default:
      return <User size={size} />;
  }
}
