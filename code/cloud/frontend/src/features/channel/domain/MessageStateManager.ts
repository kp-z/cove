/**
 * MessageStateManager
 * 统一管理所有消息状态（local + remote）
 * 负责消息合并、去重、排序
 */

import { Message, type MessageStatus, type MessageError } from './models';

export class MessageStateManager {
  private localMessages: Map<string, Message> = new Map();
  private remoteMessages: Map<string, Message> = new Map();
  private subscribers: Map<string, Set<(messages: Message[]) => void>> = new Map();

  // 添加本地消息（optimistic）
  addLocalMessage(message: Message): void {
    if (!message.isLocal()) {
      throw new Error('Only local messages can be added');
    }
    this.localMessages.set(message.id, message);
    this.notifySubscribers(message.channelId);
  }

  // 更新消息状态
  updateMessageStatus(id: string, status: MessageStatus, error?: MessageError): void {
    const message = this.localMessages.get(id);
    if (!message) return;

    const updated =
      status === 'failed'
        ? message.markAsFailed(error!)
        : new Message({ ...message, status });

    this.localMessages.set(id, updated);
    this.notifySubscribers(message.channelId);
  }

  // 同步远程消息
  syncRemoteMessages(channelId: string, messages: Message[]): void {
    messages.forEach((msg) => {
      this.remoteMessages.set(msg.id, msg);

      // 如果有对应的本地消息，移除它
      const localMsg = Array.from(this.localMessages.values()).find(
        (m) =>
          m.tempId &&
          m.content === msg.content &&
          m.channelId === channelId &&
          Math.abs(m.timestamp.getTime() - msg.timestamp.getTime()) < 5000
      );

      if (localMsg) {
        this.localMessages.delete(localMsg.id);
      }
    });

    this.notifySubscribers(channelId);
  }

  // 获取频道的所有消息（合并 + 去重 + 排序）
  getMessages(channelId: string): Message[] {
    const local = Array.from(this.localMessages.values()).filter(
      (m) => m.channelId === channelId
    );

    const remote = Array.from(this.remoteMessages.values()).filter(
      (m) => m.channelId === channelId
    );

    // 合并并去重
    const messageMap = new Map<string, Message>();

    // 先添加远程消息
    remote.forEach((msg) => messageMap.set(msg.messageId!, msg));

    // 再添加本地消息（不与远程消息重复）
    local.forEach((msg) => {
      const isDuplicate = remote.some(
        (r) =>
          r.content === msg.content &&
          Math.abs(r.timestamp.getTime() - msg.timestamp.getTime()) < 1000
      );
      if (!isDuplicate) {
        messageMap.set(msg.id, msg);
      }
    });

    // 按时间排序（最旧在前）
    return Array.from(messageMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  // 订阅消息变化
  subscribe(channelId: string, callback: (messages: Message[]) => void): () => void {
    if (!this.subscribers.has(channelId)) {
      this.subscribers.set(channelId, new Set());
    }
    this.subscribers.get(channelId)!.add(callback);

    // 立即触发一次
    callback(this.getMessages(channelId));

    // 返回取消订阅函数
    return () => {
      this.subscribers.get(channelId)?.delete(callback);
    };
  }

  private notifySubscribers(channelId: string): void {
    const callbacks = this.subscribers.get(channelId);
    if (!callbacks) return;

    const messages = this.getMessages(channelId);
    callbacks.forEach((cb) => cb(messages));
  }

  // 清理已完成的本地消息（5秒后）
  cleanupCompletedMessages(): void {
    const now = Date.now();
    Array.from(this.localMessages.entries()).forEach(([id, msg]) => {
      if (msg.status === 'sent' && now - msg.timestamp.getTime() > 5000) {
        this.localMessages.delete(id);
        this.notifySubscribers(msg.channelId);
      }
    });
  }
}

// 单例实例
export const messageStateManager = new MessageStateManager();

// 定时清理
if (typeof window !== 'undefined') {
  setInterval(() => messageStateManager.cleanupCompletedMessages(), 5000);
}
