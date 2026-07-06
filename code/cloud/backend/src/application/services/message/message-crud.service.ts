/**
 * MessageCrudService - Message CRUD 操作
 *
 * 职责：
 * - 创建消息（发送）
 * - 更新消息内容
 * - 删除消息
 */

import { MessageEntity, SenderType, MessageMention, AgentExecutionMetadata } from '../../../domain/models/message/message.entity';
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
import { getRealmContext } from '../../context/realm-context-store';
import { UserService } from '../user/user.service';

export interface SendMessageDTO {
  readonly channelId: string;
  readonly senderId: string;
  readonly senderType: SenderType;
  readonly content: string;
  readonly threadId?: string;
  readonly attachments?: readonly string[];
  readonly mentions?: readonly MessageMention[];
  readonly agentExecutionMetadata?: AgentExecutionMetadata;
  /**
   * 契约1：服务端权威消息 ID。
   * 若上游已预分配（如 agent 响应链在 accepted 阶段分配的 agentMessageId），
   * 则沿用之以保证占位/流式/落库三处 id 一致；不传则由服务端自动生成。
   */
  readonly messageId?: string;
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
    private readonly logger: ILogger,
    private readonly userService: UserService
  ) {}

  async sendMessage(dto: SendMessageDTO): Promise<MessageEntity> {
      const context = getRealmContext();
    this.logger.debug('Sending message', { channelId: dto.channelId, senderId: dto.senderId, realmId: context.realmId });

    const result = await this.channelQueryService.canSendMessage(dto.channelId, dto.senderId);
    if (!result.allowed) {
      throw new SendMessageDeniedError(dto.senderId, dto.channelId, result.reason ?? 'Permission denied');
    }

    const channel = await this.channelQueryService.getChannelById(dto.channelId);

    // 根据 senderType 查询发送者信息以获取 displayName
    let senderName = dto.senderId;
    try {
      if (dto.senderType === 'agent') {
        // 对于 agent，直接从数据库查询（避免循环依赖）
        const agent = await this.messageRepository.prisma.agent.findUnique({
          where: { id: dto.senderId }
        });
        senderName = agent?.displayName || agent?.name || dto.senderId;
      } else {
        // 对于 human 或其他类型，从 user service 获取
        const sender = await this.userService.getUserById(dto.senderId);
        senderName = sender.displayName || sender.username || sender.email || dto.senderId;
      }
    } catch (err) {
      // 如果查询失败，使用 senderId 作为 fallback
      this.logger.warn('Failed to get sender info, using senderId as name', { senderId: dto.senderId, error: err });
      senderName = dto.senderId;
    }

    let mentions = dto.mentions ?? [];
    if (mentions.length === 0 && dto.content.includes('@')) {
      mentions = this.parseMentionsFromContent(dto.content, channel);
    }

    // 契约1：幂等保护——若已用权威 id 落库（如 Local 重传 saveResponse），直接返回现有消息，避免重复气泡。
    if (dto.messageId) {
      const existing = await this.messageRepository.findById(dto.messageId, context.realmId);
      if (existing) {
        this.logger.info('Message already exists with authoritative id, returning existing (idempotent)', {
          messageId: dto.messageId,
          realmId: context.realmId,
        });
        return existing;
      }
    }

    const messageId = dto.messageId ?? this.generateMessageId();
    const msgShortId = messageId.split('-')[2] || 'unknown'; // 使用随机部分而不是时间戳
    const now = new Date();

    const message = MessageEntity.create({
      realmId: context.realmId,
      messageId,
      msgShortId,
      channelId: dto.channelId,
      channelName: channel.name,
      senderId: dto.senderId,
      senderName: senderName,
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
      agentExecutionMetadata: dto.agentExecutionMetadata,
      createdAt: now,
      updatedAt: now,
      meta: {
        client: 'server',
        isPinned: false,
        isImportant: false,
      },
    });

    await this.messageRepository.save(message, context.realmId);

    // 根因修复：此前仅 ChannelEntity.incrementMessageCount() 存在但从未被调用，
    // 导致 Channel 列表的"最近更新"角标（meta.updated_at）从不随消息发送刷新
    // （人类消息 message.send 与 Agent 消息 message.saveResponse 都经过这里，
    // 因此在此处统一调用即可覆盖两条路径）。失败仅记录日志，不影响消息发送本身。
    try {
      await this.channelQueryService.incrementMessageCount(dto.channelId);
    } catch (err) {
      this.logger.warn('Failed to update channel activity timestamp', {
        channelId: dto.channelId,
        error: (err as Error).message,
      });
    }

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
        realmId: context.realmId,
      },
    });

    this.logger.info('Message sent successfully', { messageId });

    return message;
  }

  async updateMessage(dto: UpdateMessageDTO): Promise<MessageEntity> {
      const context = getRealmContext();
    this.logger.debug('Updating message', { messageId: dto.messageId, realmId: context.realmId });

    const message = await this.getMessageById(dto.messageId);

    if (message.senderId !== dto.editorId) {
      throw new UnauthorizedMessageEditError(dto.messageId, dto.editorId);
    }

    const updatedMessage = message.updateContent(dto.content, dto.editorId);

    await this.messageRepository.update(updatedMessage, context.realmId);

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
      const context = getRealmContext();
    this.logger.debug('Deleting message', { messageId: dto.messageId, realmId: context.realmId });

    const message = await this.getMessageById(dto.messageId);

    if (message.senderId !== dto.deletedBy) {
      throw new UnauthorizedMessageDeletionError(dto.messageId, dto.deletedBy);
    }

    const deletedMessage = message.markAsDeleted();

    await this.messageRepository.update(deletedMessage, context.realmId);

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
    const message = await this.messageRepository.findById(messageId, getRealmContext().realmId);
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
