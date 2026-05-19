/**
 * MessageCrudService - Message CRUD 操作
 *
 * 职责：
 * - 创建消息（发送）
 * - 更新消息内容
 * - 删除消息
 */

import { MessageEntity, SenderType, MessageMention } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IMessageRepository,
  IEventBus,
  ILogger,
  DomainEvent,
  IChannelQueryService,
} from '../../interfaces';
import {
  MessageNotFoundError,
  UnauthorizedMessageDeletionError,
  UnauthorizedMessageEditError,
  SendMessageDeniedError,
} from './message.errors';
import { getServerContext } from '../../context/server-context-store';

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

export interface DeleteMessageDTO {
  readonly messageId: string;
  readonly deletedBy: string;
}

export class MessageCrudService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly channelQueryService: IChannelQueryService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async sendMessage(dto: SendMessageDTO): Promise<MessageEntity> {
      const context = getServerContext();
    this.logger.info('Sending message', { channelId: dto.channelId, senderId: dto.senderId, serverId: context.serverId });

    const result = await this.channelQueryService.canSendMessage(dto.channelId, dto.senderId);
    if (!result.allowed) {
      throw new SendMessageDeniedError(dto.senderId, dto.channelId, result.reason ?? 'Permission denied');
    }

    const channel = await this.channelQueryService.getChannelById(dto.channelId);

    let mentions = dto.mentions ?? [];
    if (mentions.length === 0 && dto.content.includes('@')) {
      mentions = this.parseMentionsFromContent(dto.content, channel);
    }

    const messageId = this.generateMessageId();
    const msgShortId = messageId.split('-')[2] || 'unknown'; // 使用随机部分而不是时间戳
    const now = new Date();

    const message = MessageEntity.create({
      messageId,
      msgShortId,
      channelId: dto.channelId,
      channelName: channel.name,
      senderId: dto.senderId,
      senderName: dto.senderId,
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

    await this.messageRepository.save(message, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.created',
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

    return message;
  }

  async updateMessage(dto: UpdateMessageDTO): Promise<MessageEntity> {
      const context = getServerContext();
    this.logger.info('Updating message', { messageId: dto.messageId, serverId: context.serverId });

    const message = await this.getMessageById(dto.messageId);

    if (message.senderId !== dto.editorId) {
      throw new UnauthorizedMessageEditError(dto.messageId, dto.editorId);
    }

    const updatedMessage = message.updateContent(dto.content, dto.editorId);

    await this.messageRepository.update(updatedMessage, context.serverId);

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

    this.logger.info('Message updated successfully', { messageId: dto.messageId });

    return updatedMessage;
  }

  async deleteMessage(dto: DeleteMessageDTO): Promise<MessageEntity> {
      const context = getServerContext();
    this.logger.info('Deleting message', { messageId: dto.messageId, serverId: context.serverId });

    const message = await this.getMessageById(dto.messageId);

    if (message.senderId !== dto.deletedBy) {
      throw new UnauthorizedMessageDeletionError(dto.messageId, dto.deletedBy);
    }

    const deletedMessage = message.markAsDeleted();

    await this.messageRepository.update(deletedMessage, context.serverId);

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

    return deletedMessage;
  }

  private async getMessageById(messageId: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }
    return message;
  }

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
}
