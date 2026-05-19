/**
 * MessageReactionService - Message 反应管理
 *
 * 职责：
 * - 添加反应
 * - 移除反应
 * - 查询反应
 * - 反应统计
 */

import { MessageEntity } from '../../../domain/models/message/message.entity';
import { MessageReaction } from '../../../domain/models/message/message.types';
import {
  IMessageRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { MessageNotFoundError } from './message.errors';
import { getServerContext } from '../../context/server-context-store';

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

export class MessageReactionService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async addReaction(dto: AddReactionDTO): Promise<MessageEntity> {
      const context = getServerContext();
    this.logger.info('Adding reaction to message', { ...dto, serverId: context.serverId });

    const message = await this.getMessageById(dto.messageId);

    const updatedMessage = message.addReaction(dto.emoji, dto.userId);

    await this.messageRepository.update(updatedMessage, context.serverId);

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

  async removeReaction(dto: RemoveReactionDTO): Promise<MessageEntity> {
      const context = getServerContext();
    this.logger.info('Removing reaction from message', { ...dto, serverId: context.serverId });

    const message = await this.getMessageById(dto.messageId);

    const updatedMessage = message.removeReaction(dto.emoji, dto.userId);

    await this.messageRepository.update(updatedMessage, context.serverId);

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

  async getMessageReactions(messageId: string): Promise<readonly MessageReaction[]> {
    const message = await this.getMessageById(messageId);
    return message.reactions;
  }

  async getReactionStats(messageId: string): Promise<Map<string, number>> {
    const message = await this.getMessageById(messageId);

    const stats = new Map<string, number>();
    for (const reaction of message.reactions) {
      const count = stats.get(reaction.emoji) || 0;
      stats.set(reaction.emoji, count + 1);
    }

    return stats;
  }

  private async getMessageById(messageId: string): Promise<MessageEntity> {
    const message = await this.messageRepository.findById(messageId);
    if (!message) {
      throw new MessageNotFoundError(messageId);
    }
    return message;
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
