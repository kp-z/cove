/**
 * InMemoryMessageRepository - Message Repository 的内存实现
 *
 * MVP 阶段使用 Map 存储数据，后续可替换为 Prisma/TypeORM 实现。
 * 实现 IMessageRepository 接口，遵循依赖倒置原则。
 */

import { IMessageRepository } from '../../02-application/interfaces/repositories/message.repository.interface';
import { MessageEntity, MessageStatus } from '../../01-domain/models/message/message.entity';

export class InMemoryMessageRepository implements IMessageRepository {
  private messages: Map<string, MessageEntity> = new Map();

  /**
   * 根据 ID 查找 Message
   */
  async findById(messageId: string): Promise<MessageEntity | null> {
    const message = this.messages.get(messageId);
    return message || null;
  }

  /**
   * 根据频道查找 Messages
   */
  async findByChannel(channelId: string, limit?: number, offset: number = 0): Promise<MessageEntity[]> {
    const messages = Array.from(this.messages.values())
      .filter(msg => msg.channelId === channelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit !== undefined) {
      return messages.slice(offset, offset + limit);
    }

    return messages.slice(offset);
  }

  async findByChannelCursor(channelId: string, cursor: string | null, limit: number): Promise<{ messages: MessageEntity[]; nextCursor: string | null }> {
    const all = Array.from(this.messages.values())
      .filter(msg => msg.channelId === channelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = all.findIndex(msg => msg.messageId === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const slice = all.slice(startIndex, startIndex + limit);
    const nextCursor = slice.length === limit && startIndex + limit < all.length
      ? slice[slice.length - 1].messageId
      : null;

    return { messages: slice, nextCursor };
  }

  async countRecentByChannelAndSender(channelId: string, senderId: string, sinceMinutes: number): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return Array.from(this.messages.values())
      .filter(msg => msg.channelId === channelId && msg.senderId === senderId && msg.createdAt >= since)
      .length;
  }

  /**
   * 根据发送者查找 Messages
   */
  async findBySender(senderId: string): Promise<MessageEntity[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.senderId === senderId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 根据线程查找 Messages
   */
  async findByThread(threadId: string): Promise<MessageEntity[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // 线程内按时间正序
  }

  /**
   * 根据状态查找 Messages
   */
  async findByStatus(status: MessageStatus): Promise<MessageEntity[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 保存新 Message
   */
  async save(message: MessageEntity): Promise<void> {
    if (this.messages.has(message.messageId)) {
      throw new Error(`Message with ID ${message.messageId} already exists`);
    }
    this.messages.set(message.messageId, message);
  }

  /**
   * 更新 Message
   */
  async update(message: MessageEntity): Promise<void> {
    if (!this.messages.has(message.messageId)) {
      throw new Error(`Message with ID ${message.messageId} not found`);
    }
    this.messages.set(message.messageId, message);
  }

  /**
   * 删除 Message（软删除）
   */
  async delete(messageId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    // 软删除：更新状态为 deleted
    const deletedMessage = message.markAsDeleted();
    this.messages.set(messageId, deletedMessage);
  }

  /**
   * 检查 Message 是否存在
   */
  async exists(messageId: string): Promise<boolean> {
    return this.messages.has(messageId);
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  clear(): void {
    this.messages.clear();
  }

  /**
   * 获取总数（仅用于测试/调试）
   */
  count(): number {
    return this.messages.size;
  }
}
