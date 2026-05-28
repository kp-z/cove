/**
 * TypingManager
 * 管理输入状态的发送和接收
 */

import { EventBus } from './EventBus';

// 简单的防抖函数
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export class TypingManager {
  private typingUsers: Map<string, Set<string>> = new Map(); // channelId -> Set<userId>
  private typingTimers: Map<string, NodeJS.Timeout> = new Map(); // userId -> timeout
  private subscribers: Map<string, Set<(users: string[]) => void>> = new Map();
  private sendTypingDebounced: Map<string, () => void> = new Map();

  constructor(private eventBus: EventBus) {
    this.subscribeToTypingEvents();
  }

  // 开始输入（防抖 500ms）
  startTyping(channelId: string, userId: string): void {
    const key = `${channelId}:${userId}`;

    if (!this.sendTypingDebounced.has(key)) {
      this.sendTypingDebounced.set(
        key,
        debounce(() => {
          this.eventBus.emit('typing.started', { channelId, userId });
        }, 500)
      );
    }

    this.sendTypingDebounced.get(key)!();

    // 重置自动停止计时器
    this.resetAutoStopTimer(channelId, userId);
  }

  // 停止输入
  stopTyping(channelId: string, userId: string): void {
    this.eventBus.emit('typing.stopped', { channelId, userId });
    this.clearAutoStopTimer(userId);
  }

  // 获取正在输入的用户
  getTypingUsers(channelId: string): string[] {
    return Array.from(this.typingUsers.get(channelId) || []);
  }

  // 订阅输入状态变化
  subscribe(channelId: string, callback: (users: string[]) => void): () => void {
    if (!this.subscribers.has(channelId)) {
      this.subscribers.set(channelId, new Set());
    }
    this.subscribers.get(channelId)!.add(callback);

    callback(this.getTypingUsers(channelId));

    return () => {
      this.subscribers.get(channelId)?.delete(callback);
    };
  }

  private subscribeToTypingEvents(): void {
    this.eventBus.on('typing.started', (data: { channelId: string; userId: string }) => {
      if (!this.typingUsers.has(data.channelId)) {
        this.typingUsers.set(data.channelId, new Set());
      }
      this.typingUsers.get(data.channelId)!.add(data.userId);
      this.notifySubscribers(data.channelId);

      // 3秒后自动停止
      this.resetAutoStopTimer(data.channelId, data.userId);
    });

    this.eventBus.on('typing.stopped', (data: { channelId: string; userId: string }) => {
      this.typingUsers.get(data.channelId)?.delete(data.userId);
      this.notifySubscribers(data.channelId);
      this.clearAutoStopTimer(data.userId);
    });
  }

  private resetAutoStopTimer(channelId: string, userId: string): void {
    this.clearAutoStopTimer(userId);

    const timer = setTimeout(() => {
      this.typingUsers.get(channelId)?.delete(userId);
      this.notifySubscribers(channelId);
    }, 3000);

    this.typingTimers.set(userId, timer);
  }

  private clearAutoStopTimer(userId: string): void {
    const timer = this.typingTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(userId);
    }
  }

  private notifySubscribers(channelId: string): void {
    const callbacks = this.subscribers.get(channelId);
    if (!callbacks) return;

    const users = this.getTypingUsers(channelId);
    callbacks.forEach((cb) => cb(users));
  }
}

// 单例实例（需要注入 eventBus）
import { eventBus } from './EventBus';
export const typingManager = new TypingManager(eventBus);
