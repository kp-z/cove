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
import { getRealmContext } from '../../context/realm-context-store';

export interface AddMemberDTO {
  readonly channelId: string;
  readonly memberId: string;
  readonly memberType?: 'human' | 'agent';
  readonly operatorId: string;
}

export interface RemoveMemberDTO {
  readonly channelId: string;
  readonly memberId: string;
  readonly operatorId: string;
}

export interface UpdateMemberRoleDTO {
  readonly channelId: string;
  readonly memberId: string;
  readonly newRole: 'owner' | 'admin' | 'member';
  readonly operatorId: string;
}

export interface TransferOwnershipDTO {
  readonly channelId: string;
  readonly newOwnerId: string;
  readonly currentOwnerId: string;
}

export class ChannelMemberService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async addMember(dto: AddMemberDTO): Promise<ChannelEntity> {
    const context = getRealmContext();
    this.logger.info('Adding member to channel', { ...dto, realmId: context.realmId });

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

    // 使用带权限检查的方法
    let updatedChannel = channel.addMemberWithPermission(dto.operatorId, newMember);

    if (isAgent && !updatedChannel.hasAgent(dto.memberId)) {
      updatedChannel = updatedChannel.addAgent(dto.memberId);
    }

    await this.channelRepository.update(updatedChannel, context.realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.member_added',
      aggregateId: dto.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: dto.channelId,
        memberId: dto.memberId,
        operatorId: dto.operatorId,
      },
    });

    this.logger.info('Member added to channel successfully', { ...dto });

    return updatedChannel;
  }

  async removeMember(dto: RemoveMemberDTO): Promise<ChannelEntity> {
    const context = getRealmContext();
    this.logger.info('Removing member from channel', { ...dto, realmId: context.realmId });

    const channel = await this.getChannelById(dto.channelId);

    if (!channel.hasMember(dto.memberId)) {
      this.logger.warn('Member not in channel', { ...dto });
      return channel;
    }

    // 使用带权限检查的方法
    const updatedChannel = channel.removeMemberWithPermission(dto.operatorId, dto.memberId);

    await this.channelRepository.update(updatedChannel, context.realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.member_removed',
      aggregateId: dto.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: dto.channelId,
        memberId: dto.memberId,
        operatorId: dto.operatorId,
      },
    });

    this.logger.info('Member removed from channel successfully', { ...dto });

    return updatedChannel;
  }

  /**
   * 更新成员角色
   */
  async updateMemberRole(dto: UpdateMemberRoleDTO): Promise<ChannelEntity> {
    const context = getRealmContext();
    this.logger.info('Updating member role', { ...dto, realmId: context.realmId });

    const channel = await this.getChannelById(dto.channelId);

    // 使用带权限检查的方法
    const updatedChannel = channel.updateMemberRoleWithPermission(
      dto.operatorId,
      dto.memberId,
      dto.newRole
    );

    await this.channelRepository.update(updatedChannel, context.realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.member_role_updated',
      aggregateId: dto.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: dto.channelId,
        memberId: dto.memberId,
        newRole: dto.newRole,
        operatorId: dto.operatorId,
      },
    });

    this.logger.info('Member role updated successfully', { ...dto });

    return updatedChannel;
  }

  /**
   * 转让 ownership
   */
  async transferOwnership(dto: TransferOwnershipDTO): Promise<ChannelEntity> {
    const context = getRealmContext();
    this.logger.info('Transferring ownership', { ...dto, realmId: context.realmId });

    const channel = await this.getChannelById(dto.channelId);

    // 使用 Entity 的转让方法
    const updatedChannel = channel.transferOwnership(dto.currentOwnerId, dto.newOwnerId);

    await this.channelRepository.update(updatedChannel, context.realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.ownership_transferred',
      aggregateId: dto.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: dto.channelId,
        fromOwnerId: dto.currentOwnerId,
        toOwnerId: dto.newOwnerId,
      },
    });

    this.logger.info('Ownership transferred successfully', { ...dto });

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
