/**
 * MessageService - Message 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Message
 * - 处理消息发送和接收
 * - 管理消息反应（Reactions）
 * - 管理消息线程（Threads）
 *
 * 依赖：
 * - IMessageRepository: Message 数据访问
 * - IChannelRepository: Channel 数据访问
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { MessageEntity, SenderType, MessageMention } from '../../../domain/models/message/message.entity';
import { MessageReaction } from '../../../domain/models/message/message.types';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IMessageRepository,
  IEventBus,
  ILogger,
  DomainEvent,
  IChannelQueryService,
  IEventPublisher,
} from '../../interfaces';
import {
  MessageNotFoundError,
  UnauthorizedMessageDeletionError,
  UnauthorizedMessageEditError,
  SendMessageDeniedError,
} from './message.errors';

export interface SendMessageDTO {
  readonly channelId: string;
  readonly senderId: string;
  readonly senderType: SenderType;
  readonly content: string;
  readonly threadId?: string;
  readonly attachments?: readonly string[];
  readonly mentions?: readonly MessageMention[];
}

export interface UpdateMessageDTO {
  readonly messageId: string;
  readonly content: string;
  readonly editorId: string;
}

export interface AddReactionDTO {
  readonly messageId: string;
  readonly userId: string;
  readonly emoji: string;
}

export interface RemoveReactionDTO {
  readonly messageId: string;
  readonly userId: string;
  readonly emoji: string;
}

export interface DeleteMessageDTO {
  readonly messageId: string;
  readonly deletedBy: string;
}

export class MessageService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly channelQueryService: IChannelQueryService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly eventPublisher?: IEventPublisher
  ) {}

  /**
   * 发送消息
   */
  async sendMessage(dto: SendMessageDTO): Promise<MessageEntity> {
    this.logger.info('Sending message', { channelId: dto.channelId, senderId: dto.senderId });

    const result = await this.channelQueryService.canSendMessage(dto.channelId, dto.senderId);
    if (!result.allowed) {
      throw new SendMessageDeniedError(dto.senderId, dto.channelId, result.reason ?? 'Permission denied');
    }

    const channel = await this.channelQueryService.getChannelById(dto.channelId);

    // Auto-parse @mentions from content if not explicitly provided
    let mentions = dto.mentions ?? [];
    if (mentions.length === 0 && dto.content.includes('@')) {
      mentions = this.parseMentionsFromContent(dto.content, channel);
    }

    const messageId = this.generateMessageId();
    const msgShortId = messageId.split('-')[1]?.substring(0, 8) || 'unknown';
    const now = new Date();

    // 创建 Message 实体
    const message = MessageEntity.create({
      messageId,
      msgShortId,
      channelId: dto.channelId,
      channelName: channel.name,
      senderId: dto.senderId,
      senderName: dto.senderId, // TODO: lookup actual sender name
      senderType: dto.senderType,
      content: dto.content,
      contentType: 'text',
      contentFormat: 'plain',
      threadId: dto.threadId,
      isThreadRoot: !dto.threadId,
      attachments: [],
      mentions,
      references: [],
      reactions: [],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
      meta: {
        client: 'server',
        isPinned: false,
        isImportant: false,
      },
    });

    // 保存到数据库
    await this.messageRepository.save(message);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.sent',
      aggregateId: messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId,
        channelId: dto.channelId,
        senderId: dto.senderId,
        senderType: dto.senderType,
        threadId: dto.threadId,
        mentions: dto.mentions,
      },
    });

    this.logger.info('Message sent successfully', { messageId });

    await this.publishWsEvent('new_message', dto.channelId, {
      messageId,
      channelId: dto.channelId,
      senderId: dto.senderId,
      content: dto.content,
    });

    return message;
  }

  /**
   * 根据 ID 获取 Message
   */
  async getMessageById(messageId: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }
    return message;
  }

  /**
   * 根据 Channel 获取 Messages (只返回顶层消息，不包含 Thread 回复)
   */
  async getMessagesByChannel(channelId: string, limit?: number, offset?: number): Promise<MessageEntity[]> {
    await this.channelQueryService.getChannelById(channelId);

    const messages = await this.messageRepository.findByChannel(channelId, limit, offset);

    return messages.filter(message => !message.threadId);
  }

  async getMessagesByChannelCursor(channelId: string, cursor: string | null, limit: number): Promise<{ messages: MessageEntity[]; nextCursor: string | null }> {
    await this.channelQueryService.getChannelById(channelId);
    return this.messageRepository.findByChannelCursor(channelId, cursor, limit);
  }

  /**
   * 根据 Thread 获取 Messages
   */
  async getMessagesByThread(threadId: string, limit?: number): Promise<MessageEntity[]> {
    return await this.messageRepository.findByThread(threadId);
  }

  /**
   * 根据 Sender 获取 Messages
   */
  async getMessagesBySender(senderId: string): Promise<MessageEntity[]> {
    return await this.messageRepository.findBySender(senderId);
  }

  /**
   * 更新消息内容
   */
  async updateMessage(dto: UpdateMessageDTO): Promise<MessageEntity> {
    this.logger.info('Updating message', { messageId: dto.messageId });

    const message = await this.getMessageById(dto.messageId);

    if (message.senderId !== dto.editorId) {
      throw new UnauthorizedMessageEditError(dto.messageId, dto.editorId);
    }

    const updatedMessage = message.updateContent(dto.content, dto.editorId);

    await this.messageRepository.update(updatedMessage);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.updated',
      aggregateId: dto.messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId: dto.messageId,
        content: dto.content,
      },
    });

    await this.publishWsEvent('message_updated', message.channelId, {
      messageId: dto.messageId,
      action: 'edited',
      content: dto.content,
    });

    this.logger.info('Message updated successfully', { messageId: dto.messageId });

    return updatedMessage;
  }

  /**
   * 添加反应
   */
  async addReaction(dto: AddReactionDTO): Promise<MessageEntity> {
    this.logger.info('Adding reaction to message', { ...dto });

    // 获取 Message
    const message = await this.getMessageById(dto.messageId);

    // 添加反应（Domain 层业务规则）
    const updatedMessage = message.addReaction(dto.emoji, dto.userId);

    // 保存更新
    await this.messageRepository.update(updatedMessage);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.reaction_added',
      aggregateId: dto.messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId: dto.messageId,
        userId: dto.userId,
        emoji: dto.emoji,
      },
    });

    this.logger.info('Reaction added successfully', { ...dto });

    return updatedMessage;
  }

  /**
   * 移除反应
   */
  async removeReaction(dto: RemoveReactionDTO): Promise<MessageEntity> {
    this.logger.info('Removing reaction from message', { ...dto });

    // 获取 Message
    const message = await this.getMessageById(dto.messageId);

    // 移除反应（Domain 层业务规则）
    const updatedMessage = message.removeReaction(dto.userId, dto.emoji);

    // 保存更新
    await this.messageRepository.update(updatedMessage);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.reaction_removed',
      aggregateId: dto.messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId: dto.messageId,
        userId: dto.userId,
        emoji: dto.emoji,
      },
    });

    this.logger.info('Reaction removed successfully', { ...dto });

    return updatedMessage;
  }

  /**
   * 删除消息
   */
  async deleteMessage(dto: DeleteMessageDTO): Promise<MessageEntity> {
    this.logger.info('Deleting message', { messageId: dto.messageId });

    // 获取 Message
    const message = await this.getMessageById(dto.messageId);

    // 验证删除权限（只有发送者可以删除）
    if (message.senderId !== dto.deletedBy) {
      throw new UnauthorizedMessageDeletionError(dto.messageId, dto.deletedBy);
    }

    // 标记为已删除（Domain 层业务规则）
    const deletedMessage = message.markAsDeleted();

    // 保存更新
    await this.messageRepository.update(deletedMessage);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.deleted',
      aggregateId: dto.messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId: dto.messageId,
        deletedBy: dto.deletedBy,
      },
    });

    this.logger.info('Message deleted successfully', { messageId: dto.messageId });

    await this.publishWsEvent('message_updated', message.channelId, {
      messageId: dto.messageId,
      action: 'deleted',
    });

    return deletedMessage;
  }

  /**
   * 获取消息的所有反应
   */
  async getMessageReactions(messageId: string): Promise<readonly MessageReaction[]> {
    const message = await this.getMessageById(messageId);
    return message.reactions;
  }

  /**
   * 获取消息的反应统计
   */
  async getReactionStats(messageId: string): Promise<Map<string, number>> {
    const message = await this.getMessageById(messageId);

    const stats = new Map<string, number>();
    for (const reaction of message.reactions) {
      const count = stats.get(reaction.emoji) || 0;
      stats.set(reaction.emoji, count + 1);
    }

    return stats;
  }

  /**
   * 搜索消息
   */
  async searchMessages(query: string, channelId?: string): Promise<MessageEntity[]> {
    // 这里简化实现，实际应该使用全文搜索
    const messages = channelId
      ? await this.messageRepository.findByChannel(channelId)
      : [];

    return messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  // --- Private helpers ---

  private parseMentionsFromContent(content: string, channel: ChannelEntity): MessageMention[] {
    const mentions: MessageMention[] = [];
    const seen = new Set<string>();
    const pattern = /@(\S+)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const name = match[1]?.toLowerCase();
      if (!name) continue;

      for (const agentId of channel.agentPool) {
        if (seen.has(agentId)) continue;
        if (agentId.toLowerCase().includes(name) || name.includes('agent') || name.includes('cove')) {
          mentions.push({ mentionType: 'agent', mentionId: agentId });
          seen.add(agentId);
        }
      }

      for (const member of channel.members) {
        if (member.memberType !== 'human' || seen.has(member.memberId)) continue;
        if (member.memberId.toLowerCase() === name) {
          mentions.push({ mentionType: 'user', mentionId: member.memberId });
          seen.add(member.memberId);
        }
      }
    }

    return mentions;
  }

  private generateMessageId(): string {
    return `message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    }
  }

  private async publishWsEvent(eventType: string, channelId: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.eventPublisher) return;
    try {
      await this.eventPublisher.publish(eventType, channelId, payload);
    } catch (error) {
      this.logger.error('Failed to publish WS event', error as Error, { eventType, channelId });
    }
  }
}
