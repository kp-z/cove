/**
 * ChannelMemberService - Channel 成员管理
 *
 * 职责：
 * - 添加成员
 * - 移除成员
 */

import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IChannelRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { ChannelNotFoundError } from './channel.errors';

export interface AddMemberDTO {
  readonly channelId: string;
  readonly memberId: string;
  readonly memberType?: 'human' | 'agent';
}

export interface RemoveMemberDTO {
  readonly channelId: string;
  readonly memberId: string;
}

export class ChannelMemberService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async addMember(dto: AddMemberDTO): Promise<ChannelEntity> {
    this.logger.info('Adding member to channel', { ...dto });

    const channel = await this.getChannelById(dto.channelId);

    if (channel.hasMember(dto.memberId)) {
      this.logger.warn('Member already in channel', { ...dto });
      return channel;
    }

    const isAgent = dto.memberType === 'agent' || dto.memberId.startsWith('agent-');
    const newMember = {
      memberId: dto.memberId,
      memberType: isAgent ? 'agent' as const : 'human' as const,
      role: 'member' as const,
      joinedAt: new Date(),
    };
    let updatedChannel = channel.addMember(newMember);

    if (isAgent && !updatedChannel.hasAgent(dto.memberId)) {
      updatedChannel = updatedChannel.addAgent(dto.memberId);
    }

    await this.channelRepository.update(updatedChannel);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.member_added',
      aggregateId: dto.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: dto.channelId,
        memberId: dto.memberId,
      },
    });

    this.logger.info('Member added to channel successfully', { ...dto });

    return updatedChannel;
  }

  async removeMember(dto: RemoveMemberDTO): Promise<ChannelEntity> {
    this.logger.info('Removing member from channel', { ...dto });

    const channel = await this.getChannelById(dto.channelId);

    if (!channel.hasMember(dto.memberId)) {
      this.logger.warn('Member not in channel', { ...dto });
      return channel;
    }

    const updatedChannel = channel.removeMember(dto.memberId);

    await this.channelRepository.update(updatedChannel);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.member_removed',
      aggregateId: dto.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: dto.channelId,
        memberId: dto.memberId,
      },
    });

    this.logger.info('Member removed from channel successfully', { ...dto });

    return updatedChannel;
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
