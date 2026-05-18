/**
 * MemberService - 频道成员管理业务逻辑
 *
 * 职责：
 * - 管理频道成员的加入和退出
 * - 成员角色和权限管理
 * - 成员状态管理
 * - 成员统计更新
 */

import {
  MemberNotFoundError,
  MemberNotFoundInChannelError,
  MemberAlreadyInChannelError,
  ChannelNotFoundForMemberError,
  UserNotFoundForMemberError,
} from './member.errors';

import { MemberEntity, MemberRole } from '../../../domain/models/member/member.entity';
import {
  IMemberRepository,
  IChannelRepository,
  IUserRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { ServerContext } from '../../context/server-context';

export interface JoinChannelDTO {
  readonly channelId: string;
  readonly userId: string;
  readonly userType?: 'human' | 'agent';
  readonly role?: MemberRole;
  readonly invitedBy?: { id: string; type: 'human' | 'agent' };
}

export interface UpdateMemberRoleDTO {
  readonly memberId: string;
  readonly role: MemberRole;
}

export interface UpdateNotificationDTO {
  readonly memberId: string;
  readonly enabled?: boolean;
  readonly mentionOnly?: boolean;
  readonly muteUntil?: Date;
}

export class MemberService {
  constructor(
    private readonly memberRepository: IMemberRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly userRepository: IUserRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async joinChannel(dto: JoinChannelDTO, context: ServerContext): Promise<MemberEntity> {
    this.logger.info('User joining channel', { channelId: dto.channelId, userId: dto.userId, serverId: context.serverId });

    const channelExists = await this.channelRepository.exists(dto.channelId);
    if (!channelExists) {
      throw new ChannelNotFoundForMemberError(dto.channelId);
    }

    const userExists = await this.userRepository.exists(dto.userId);
    if (!userExists) {
      throw new UserNotFoundForMemberError(dto.userId);
    }

    const existingMember = await this.memberRepository.findByChannelAndUser(dto.channelId, dto.userId);
    if (existingMember && !existingMember.hasLeft()) {
      throw new MemberAlreadyInChannelError(dto.userId, dto.channelId);
    }

    const now = new Date();
    const memberId = this.generateMemberId();

    const member = MemberEntity.create({
      memberId,
      channelId: dto.channelId,
      userId: dto.userId,
      userType: dto.userType || 'human',
      role: dto.role || 'member',
      permissions: this.getDefaultPermissions(dto.role || 'member'),
      status: 'active',
      onlineStatus: 'offline',
      joinedAt: now,
      lastActiveAt: now,
      statistics: {
        messageCount: 0,
        reactionCount: 0,
        mentionCount: 0,
        threadCount: 0,
      },
      notificationSettings: {
        enabled: true,
        mentionOnly: false,
      },
      meta: {
        invitedBy: dto.invitedBy,
      },
    });

    await this.memberRepository.save(member, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'member.joined',
      aggregateId: memberId,
      aggregateType: 'Member',
      occurredAt: now,
      payload: {
        memberId,
        channelId: dto.channelId,
        userId: dto.userId,
        role: member.role,
      },
    });

    this.logger.info('User joined channel successfully', { memberId, channelId: dto.channelId });
    return member;
  }

  async leaveChannel(channelId: string, userId: string, context: ServerContext): Promise<MemberEntity> {
    this.logger.info('User leaving channel', { channelId, userId, serverId: context.serverId });

    const member = await this.findByChannelAndUser(channelId, userId);
    const updatedMember = member.leave();

    await this.memberRepository.update(updatedMember, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'member.left',
      aggregateId: member.memberId,
      aggregateType: 'Member',
      occurredAt: new Date(),
      payload: {
        memberId: member.memberId,
        channelId,
        userId,
      },
    });

    this.logger.info('User left channel successfully', { memberId: member.memberId });
    return updatedMember;
  }

  async getMemberById(memberId: string): Promise<MemberEntity> {
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw new MemberNotFoundError(memberId);
    }
    return member;
  }

  async getChannelMembers(channelId: string): Promise<MemberEntity[]> {
    return await this.memberRepository.findByChannel(channelId);
  }

  async getUserChannels(userId: string): Promise<MemberEntity[]> {
    return await this.memberRepository.findByUser(userId);
  }

  async updateMemberRole(dto: UpdateMemberRoleDTO, context: ServerContext): Promise<MemberEntity> {
    this.logger.info('Updating member role', { memberId: dto.memberId, role: dto.role, serverId: context.serverId });

    let member = await this.getMemberById(dto.memberId);
    member = member.updateRole(dto.role);

    await this.memberRepository.update(member, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'member.role_changed',
      aggregateId: dto.memberId,
      aggregateType: 'Member',
      occurredAt: new Date(),
      payload: {
        memberId: dto.memberId,
        channelId: member.channelId,
        userId: member.userId,
        role: dto.role,
      },
    });

    this.logger.info('Member role updated successfully', { memberId: dto.memberId });
    return member;
  }

  async banMember(channelId: string, userId: string, context: ServerContext): Promise<MemberEntity> {
    this.logger.info('Banning member', { channelId, userId, serverId: context.serverId });

    const member = await this.findByChannelAndUser(channelId, userId);
    const bannedMember = member.ban();

    await this.memberRepository.update(bannedMember, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'member.banned',
      aggregateId: member.memberId,
      aggregateType: 'Member',
      occurredAt: new Date(),
      payload: {
        memberId: member.memberId,
        channelId,
        userId,
      },
    });

    this.logger.info('Member banned successfully', { memberId: member.memberId });
    return bannedMember;
  }

  async unbanMember(channelId: string, userId: string, context: ServerContext): Promise<MemberEntity> {
    this.logger.info('Unbanning member', { channelId, userId, serverId: context.serverId });

    const member = await this.findByChannelAndUser(channelId, userId);
    const unbannedMember = member.unban();

    await this.memberRepository.update(unbannedMember, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'member.unbanned',
      aggregateId: member.memberId,
      aggregateType: 'Member',
      occurredAt: new Date(),
      payload: {
        memberId: member.memberId,
        channelId,
        userId,
      },
    });

    this.logger.info('Member unbanned successfully', { memberId: member.memberId });
    return unbannedMember;
  }

  async updateNotificationSettings(dto: UpdateNotificationDTO, context: ServerContext): Promise<MemberEntity> {
    let member = await this.getMemberById(dto.memberId);

    if (dto.muteUntil) {
      member = member.mute(dto.muteUntil);
    } else if (dto.enabled !== undefined || dto.mentionOnly !== undefined) {
      member = member.updateNotificationSettings({
        enabled: dto.enabled ?? member.notificationSettings.enabled,
        mentionOnly: dto.mentionOnly ?? member.notificationSettings.mentionOnly,
      });
    }

    await this.memberRepository.update(member, context.serverId);
    return member;
  }

  async recordActivity(memberId: string, context: ServerContext): Promise<MemberEntity> {
    let member = await this.getMemberById(memberId);
    member = member.updateLastActive();

    await this.memberRepository.update(member, context.serverId);
    return member;
  }

  private async findByChannelAndUser(channelId: string, userId: string): Promise<MemberEntity> {
    const member = await this.memberRepository.findByChannelAndUser(channelId, userId);
    if (!member) {
      throw new MemberNotFoundInChannelError(userId, channelId);
    }
    return member;
  }

  private getDefaultPermissions(role: MemberRole): readonly string[] {
    switch (role) {
      case 'owner':
        return ['read', 'write', 'manage_members', 'manage_channel', 'delete'];
      case 'admin':
        return ['read', 'write', 'manage_members'];
      case 'member':
        return ['read', 'write'];
      case 'guest':
        return ['read'];
    }
  }

  private generateMemberId(): string {
    return `member-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

