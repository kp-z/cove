/**
 * ChannelLifecycleService - Channel 生命周期管理
 *
 * 职责：
 * - 归档 Channel
 * - 激活 Channel
 */

import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IChannelRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { ChannelNotFoundError } from './channel.errors';
import { ServerContext } from '../../context/server-context';

export class ChannelLifecycleService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async archiveChannel(channelId: string, context: ServerContext): Promise<ChannelEntity> {
    this.logger.info('Archiving channel', { channelId, serverId: context.serverId });

    const channel = await this.getChannelById(channelId);

    const archivedChannel = channel.archive();

    await this.channelRepository.update(archivedChannel, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.archived',
      aggregateId: channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: { channelId },
    });

    this.logger.info('Channel archived successfully', { channelId });

    return archivedChannel;
  }

  async activateChannel(channelId: string, context: ServerContext): Promise<ChannelEntity> {
    this.logger.info('Activating channel', { channelId, serverId: context.serverId });

    const channel = await this.getChannelById(channelId);

    const activatedChannel = channel.activate();

    await this.channelRepository.update(activatedChannel, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.activated',
      aggregateId: channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: { channelId },
    });

    this.logger.info('Channel activated successfully', { channelId });

    return activatedChannel;
  }

  private async getChannelById(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      throw new ChannelNotFoundError(channelId);
    }
    return channel;
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
