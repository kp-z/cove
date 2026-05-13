import { MessageEntity } from '../../../01-domain/models/message/message.entity';
import { IChannelRepository, IMessageRepository, IEventBus, ILogger, DomainEvent } from '../../interfaces';
import { ChannelNotFoundError, ChannelNotActiveError, MemberNotInChannelError } from './channel.errors';

export interface SendMessageDTO {
  readonly channelId: string;
  readonly content: string;
  readonly senderId: string;
  readonly threadId?: string;
  readonly attachments?: readonly string[];
}

export class ChannelMessagingService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async sendMessage(dto: SendMessageDTO): Promise<MessageEntity> {
    this.logger.info('Sending message to channel', { channelId: dto.channelId });
    const channel = await this.channelRepository.findById(dto.channelId);
    if (!channel) throw new ChannelNotFoundError(dto.channelId);
    if (channel.status !== 'active') throw new ChannelNotActiveError(dto.channelId);
    if (!channel.memberIds.includes(dto.senderId)) {
      throw new MemberNotInChannelError(dto.senderId, dto.channelId);
    }

    const messageId = `message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const message = MessageEntity.create({
      messageId,
      msgShortId: messageId.split('-')[1].substring(0, 8),
      channelId: dto.channelId,
      channelName: channel.name,
      senderId: dto.senderId,
      senderName: dto.senderId,
      senderType: 'human',
      content: dto.content,
      contentType: 'text',
      contentFormat: 'plain',
      threadId: dto.threadId,
      isThreadRoot: !dto.threadId,
      attachments: [],
      mentions: [],
      references: [],
      reactions: [],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      meta: { client: 'server', isPinned: false, isImportant: false },
    });

    await this.messageRepository.save(message);
    await this.publishEvent({
      eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      eventType: 'message.sent',
      aggregateId: messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: { messageId, channelId: dto.channelId, senderId: dto.senderId, threadId: dto.threadId },
    });
    return message;
  }

  async getChannelMessages(channelId: string, limit?: number): Promise<MessageEntity[]> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) throw new ChannelNotFoundError(channelId);
    return this.messageRepository.findByChannel(channelId, limit);
  }

  async getThreadMessages(threadId: string, limit?: number): Promise<MessageEntity[]> {
    return this.messageRepository.findByThread(threadId);
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType, aggregateId: event.aggregateId,
      });
    }
  }
}
