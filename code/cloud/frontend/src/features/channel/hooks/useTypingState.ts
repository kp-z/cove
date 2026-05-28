/**
 * useTypingState Hook
 * 管理输入状态的发送和接收
 */

import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/core/auth';
import { typingManager } from '../domain/TypingManager';

export function useTypingState(channelId: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const { userId } = useCurrentUser();

  // 订阅输入状态
  useEffect(() => {
    const unsubscribe = typingManager.subscribe(channelId, (users) => {
      // 过滤掉自己
      setTypingUsers(users.filter((id) => id !== userId));
    });
    return unsubscribe;
  }, [channelId, userId]);

  // 开始输入
  const startTyping = useCallback(() => {
    if (userId) {
      typingManager.startTyping(channelId, userId);
    }
  }, [channelId, userId]);

  // 停止输入
  const stopTyping = useCallback(() => {
    if (userId) {
      typingManager.stopTyping(channelId, userId);
    }
  }, [channelId, userId]);

  return { typingUsers, startTyping, stopTyping };
}
