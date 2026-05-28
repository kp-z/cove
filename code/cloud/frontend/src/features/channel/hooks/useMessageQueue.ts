/**
 * useMessageQueue Hook
 * 管理离线消息队列和网络状态
 */

import { useState, useEffect } from 'react';
import { messageQueue } from '../domain/MessageQueue';
import { useSendMessage } from './useSendMessage';

export function useMessageQueue() {
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { send } = useSendMessage();

  // 订阅队列大小
  useEffect(() => {
    const unsubscribe = messageQueue.subscribe(setQueueSize);
    return unsubscribe;
  }, []);

  // 监听网络状态
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      messageQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 监听队列发送事件
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { channelId, content } = customEvent.detail;
      send(channelId, content);
    };

    window.addEventListener('queue:send-message', handler);
    return () => window.removeEventListener('queue:send-message', handler);
  }, [send]);

  return { queueSize, isOnline };
}
