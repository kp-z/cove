/**
 * MessageService - Message 管理业务逻辑（协调器）
 *
 * 职责：
 * - 协调各个子服务
 * - 提供统一的消息管理接口
 *
 * 依赖：
 * - MessageCrudService: CRUD 操作
 * - MessageQueryService: 查询操作
 * - MessageReactionService: 反应管理
 */

import { MessageEntity } from '../../../domain/models/message/message.entity';
import { MessageReaction } from '../../../domain/models/message/message.types';
import { MessageCrudService, SendMessageDTO, UpdateMessageDTO, DeleteMessageDTO } from './message-crud.service.js';
import { MessageQueryService } from './message-query.service.js';
import { MessageReactionService, AddReactionDTO, RemoveReactionDTO } from './message-reaction.service.js';
import { ServerContext } from '../../context/server-context';

export { SendMessageDTO, UpdateMessageDTO, DeleteMessageDTO, AddReactionDTO, RemoveReactionDTO };

export class MessageService {
  constructor(
    private readonly crudService: MessageCrudService,
    private readonly queryService: MessageQueryService,
    private readonly reactionService: MessageReactionService
  ) {}

  async sendMessage(dto: SendMessageDTO, context: ServerContext): Promise<MessageEntity> {
    return this.crudService.sendMessage(dto, context);
  }

  async getMessageById(messageId: string): Promise<MessageEntity> {
    return this.queryService.getMessageById(messageId);
  }

  async getMessagesByChannel(channelId: string, limit?: number, offset?: number): Promise<MessageEntity[]> {
    return this.queryService.getMessagesByChannel(channelId, limit, offset);
  }

  async getMessagesByChannelCursor(
    channelId: string,
    cursor: string | null,
    limit: number
  ): Promise<{ messages: MessageEntity[]; nextCursor: string | null }> {
    return this.queryService.getMessagesByChannelCursor(channelId, cursor, limit);
  }

  async getMessagesByThread(threadId: string, limit?: number): Promise<MessageEntity[]> {
    return this.queryService.getMessagesByThread(threadId, limit);
  }

  async getMessagesBySender(senderId: string): Promise<MessageEntity[]> {
    return this.queryService.getMessagesBySender(senderId);
  }

  async updateMessage(dto: UpdateMessageDTO, context: ServerContext): Promise<MessageEntity> {
    return this.crudService.updateMessage(dto, context);
  }

  async deleteMessage(dto: DeleteMessageDTO, context: ServerContext): Promise<MessageEntity> {
    return this.crudService.deleteMessage(dto, context);
  }

  async addReaction(dto: AddReactionDTO, context: ServerContext): Promise<MessageEntity> {
    return this.reactionService.addReaction(dto, context);
  }

  async removeReaction(dto: RemoveReactionDTO, context: ServerContext): Promise<MessageEntity> {
    return this.reactionService.removeReaction(dto, context);
  }

  async getMessageReactions(messageId: string): Promise<readonly MessageReaction[]> {
    return this.reactionService.getMessageReactions(messageId);
  }

  async getReactionStats(messageId: string): Promise<Map<string, number>> {
    return this.reactionService.getReactionStats(messageId);
  }

  async searchMessages(query: string, channelId?: string): Promise<MessageEntity[]> {
    return this.queryService.searchMessages(query, channelId);
  }
}
