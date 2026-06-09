/**
 * MessageQueue
 * 管理离线和失败消息的重试
 */

import { logger } from '@/lib/logger';

const log = logger.scope('MessageQueue');

export interface QueuedMessage {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  timestamp: Date;
  retryCount: number;
}

export class MessageQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private subscribers: Set<(size: number) => void> = new Set();
  private readonly STORAGE_KEY = 'message_queue';
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.loadFromStorage();
    this.watchOnlineStatus();
  }

  enqueue(message: QueuedMessage): void {
    // 检查队列大小限制
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      log.warn('Message queue is full, removing oldest message');
      this.queue.shift();
    }

    this.queue.push(message);
    this.saveToStorage();
    this.notifySubscribers();
  }

  dequeue(id: string): void {
    this.queue = this.queue.filter((m) => m.id !== id);
    this.saveToStorage();
    this.notifySubscribers();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    // 按时间顺序处理
    const messages = [...this.queue].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    for (const msg of messages) {
      try {
        await this.sendMessage(msg);
        this.dequeue(msg.id);
      } catch (error) {
        log.error('Failed to send queued message', error);

        // 重试次数超过3次，移除
        if (msg.retryCount >= 3) {
          this.dequeue(msg.id);
        } else {
          // 增加重试次数
          const index = this.queue.findIndex((m) => m.id === msg.id);
          if (index !== -1) {
            this.queue[index].retryCount++;
            this.saveToStorage();
          }
        }
      }
    }

    this.isProcessing = false;
  }

  private async sendMessage(msg: QueuedMessage): Promise<void> {
    // 通过事件通知外部发送消息
    window.dispatchEvent(new CustomEvent('queue:send-message', { detail: msg }));

    // 等待发送完成（通过 Promise）
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.id === msg.id) {
          clearTimeout(timeout);
          window.removeEventListener('queue:message-sent', handler);
          window.removeEventListener('queue:message-failed', failHandler);
          resolve();
        }
      };

      const failHandler = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.id === msg.id) {
          clearTimeout(timeout);
          window.removeEventListener('queue:message-sent', handler);
          window.removeEventListener('queue:message-failed', failHandler);
          reject(new Error(customEvent.detail.error));
        }
      };

      window.addEventListener('queue:message-sent', handler);
      window.addEventListener('queue:message-failed', failHandler);
    });
  }

  private watchOnlineStatus(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      log.debug('Network online, processing queue');
      this.processQueue();
    });
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    } catch (error) {
      log.error('Failed to load queue from storage', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      log.error('Failed to save queue to storage', error);
    }
  }

  subscribe(callback: (size: number) => void): () => void {
    this.subscribers.add(callback);
    callback(this.queue.length);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    this.subscribers.forEach((cb) => cb(this.queue.length));
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

// 单例实例
export const messageQueue = new MessageQueue();
