/**
 * MessageQueryService - Message 查询操作
 *
 * 职责：
 * - 根据 ID 查询消息
 * - 根据 Channel 查询消息
 * - 根据 Thread 查询消息
 * - 根据 Sender 查询消息
 * - 搜索消息
 */

import { MessageEntity } from '../../../domain/models/message/message.entity';
import {
  IMessageRepository,
  IChannelQueryService,
} from '../../interfaces';
import { MessageNotFoundError } from './message.errors';

export class MessageQueryService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly channelQueryService: IChannelQueryService
  ) {}

  async getMessageById(messageId: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }
    return message;
  }

  async getMessagesByChannel(channelId: string, limit?: number, offset?: number): Promise<MessageEntity[]> {
    await this.channelQueryService.getChannelById(channelId);

    const messages = await this.messageRepository.findByChannel(channelId, limit, offset);

    return messages.filter(message => !message.threadId);
  }

  async getMessagesByChannelCursor(
    channelId: string,
    cursor: string | null,
    limit: number
  ): Promise<{ messages: MessageEntity[]; nextCursor: string | null }> {
    await this.channelQueryService.getChannelById(channelId);
    return this.messageRepository.findByChannelCursor(channelId, cursor, limit);
  }

  async getMessagesByThread(threadId: string, _limit?: number): Promise<MessageEntity[]> {
    return await this.messageRepository.findByThread(threadId);
  }

  async getMessagesBySender(senderId: string): Promise<MessageEntity[]> {
    return await this.messageRepository.findBySender(senderId);
  }

  async searchMessages(query: string, channelId?: string): Promise<MessageEntity[]> {
    const messages = channelId
      ? await this.messageRepository.findByChannel(channelId)
      : [];

    return messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }
}
