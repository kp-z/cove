/**
 * IMessageRepository - Message Repository 接口
 *
 * Application Layer 通过此接口访问 Message 数据。
 */

import { MessageEntity, MessageStatus } from '../../../domain/models/message/message.entity';

export interface IMessageRepository {
  findById(messageId: string): Promise<MessageEntity | null>;
  findByChannel(channelId: string, limit?: number, offset?: number): Promise<MessageEntity[]>;
  findByChannelCursor(channelId: string, cursor: string | null, limit: number): Promise<{ messages: MessageEntity[]; nextCursor: string | null }>;
  countRecentByChannelAndSender(channelId: string, senderId: string, sinceMinutes: number): Promise<number>;
  findBySender(senderId: string): Promise<MessageEntity[]>;
  findByThread(threadId: string): Promise<MessageEntity[]>;
  findByStatus(status: MessageStatus): Promise<MessageEntity[]>;
  save(message: MessageEntity): Promise<void>;
  update(message: MessageEntity): Promise<void>;
  delete(messageId: string): Promise<void>;
  exists(messageId: string): Promise<boolean>;
}
