/**
 * ChannelService - Channel 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Channel
 * - 管理 Channel 成员
 * - 管理 Channel 消息
 * - 协调 Channel 生命周期
 *
 * 依赖：
 * - IChannelRepository: Channel 数据访问
 * - IMessageRepository: Message 数据访问
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { ChannelEntity, ChannelType, ChannelStatus } from '../../../domain/models/channel/channel.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import {
  IChannelRepository,
  IMessageRepository,
  IEventBus,
  ILogger,
  DomainEvent,
  IChannelQueryService,
} from '../../interfaces';


import { ChannelMessagingService, ChannelSendMessageDTO } from './channel-messaging.service';
import { ChannelNotFoundError, ChannelNotArchivedError } from './channel.errors';

export interface CreateChannelDTO {
  readonly name: string;
  readonly description?: string;
  readonly type: ChannelType;
  readonly projectId?: string;
  readonly createdBy: string;
  readonly memberIds?: readonly string[];
}

export interface UpdateChannelDTO {
  readonly name?: string;
  readonly description?: string;
}

export interface AddMemberDTO {
  readonly channelId: string;
  readonly memberId: string;
  readonly memberType?: 'human' | 'agent';
}

export interface RemoveMemberDTO {
  readonly channelId: string;
  readonly memberId: string;
}


export class ChannelService implements IChannelQueryService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly messagingService: ChannelMessagingService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}
  async createChannel(dto: CreateChannelDTO): Promise<ChannelEntity> {
    this.logger.info('Creating new channel', { name: dto.name, type: dto.type });

    // 生成 Channel ID
    const channelId = this.generateChannelId();
    const now = new Date();

    // 将 memberIds 转换为 ChannelMember 对象
    const members = (dto.memberIds || []).map(memberId => ({
      memberId,
      memberType: 'human' as const,
      role: memberId === dto.createdBy ? ('owner' as const) : ('member' as const),
      joinedAt: now,
    }));

    // 创建 Channel 实体
    const channel = ChannelEntity.create({
      channelId,
      name: dto.name,
      displayName: dto.name,
      description: dto.description,
      type: dto.type,
      status: 'active',
      projectId: dto.projectId,
      members,
      agentPool: [],
      taskPool: [],
      conversationPool: [],
      communicationRules: {
        allowMentions: true,
        allowThreads: true,
        allowAttachments: true,
        maxMessageLength: 10000,
      },
      workspace: {
        root: `/workspace/${channelId}`,
        sharedFiles: `/workspace/${channelId}/shared`,
        attachments: `/workspace/${channelId}/attachments`,
      },
      meta: {
        messageCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: {
          id: dto.createdBy,
          type: 'human',
        },
      },
    });

    // 保存到数据库
    await this.channelRepository.save(channel);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.created',
      aggregateId: channel.channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId: channel.channelId,
        name: channel.name,
        type: channel.type,
        projectId: dto.projectId,
        createdBy: dto.createdBy,
      },
    });

    this.logger.info('Channel created successfully', { channelId: channel.channelId });

    return channel;
  }

  /**
   * 根据 ID 获取 Channel
   */
  async getChannelById(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      throw new ChannelNotFoundError(channelId);
    }
    return channel;
  }

  async canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      return { allowed: false, reason: 'Channel not found' };
    }
    const recentCount = await this.messageRepository.countRecentByChannelAndSender(channelId, senderId, 1);
    return channel.canSendMessage(senderId, recentCount);
  }

  /**
   * 根据 Project ID 获取所有 Channels
   */
  async getChannelsByProject(projectId: string): Promise<ChannelEntity[]> {
    return await this.channelRepository.findByProject(projectId);
  }

  async getAllChannels(): Promise<ChannelEntity[]> {
    return await this.channelRepository.findAll();
  }

  /**
   * 根据类型获取 Channels
   */
  async getChannelsByType(type: ChannelType): Promise<ChannelEntity[]> {
    return await this.channelRepository.findByType(type);
  }

  /**
   * 根据状态获取 Channels
   */
  async getChannelsByStatus(status: ChannelStatus): Promise<ChannelEntity[]> {
    // TODO: Implement status filtering - for now return all channels
    const allChannels = await this.channelRepository.findAll();
    return allChannels.filter(channel => channel.status === status);
  }

  /**
   * 更新 Channel
   */
  async updateChannel(channelId: string, dto: UpdateChannelDTO): Promise<ChannelEntity> {
    this.logger.info('Updating channel', { channelId });

    // 获取现有 Channel
    const channel = await this.getChannelById(channelId);

    // 创建更新后的 Channel（不可变更新）
    const json = channel.toJSON();
    const updatedProps = {
      channelId: json.channel_id,
      name: dto.name !== undefined ? dto.name : json.name,
      displayName: dto.name !== undefined ? dto.name : json.display_name,
      description: dto.description !== undefined ? dto.description : json.description,
      icon: json.icon,
      type: json.type,
      status: json.status,
      parentChannelId: json.parent_channel_id,
      projectId: json.project_id,
      members: json.members.map(m => ({
        memberId: m.member_id,
        memberType: m.member_type,
        role: m.role,
        joinedAt: new Date(m.joined_at),
      })),
      agentPool: json.agent_pool,
      taskPool: json.task_pool,
      conversationPool: json.conversation_pool.map(c => ({
        conversationId: c.conversation_id,
        agentId: c.agent_id,
        status: c.status,
        messageCount: c.message_count,
      })),
      communicationRules: {
        allowMentions: json.communication_rules.allow_mentions,
        allowThreads: json.communication_rules.allow_threads,
        allowAttachments: json.communication_rules.allow_attachments,
        maxMessageLength: json.communication_rules.max_message_length,
        maxMembers: json.communication_rules.max_members,
        rateLimit: json.communication_rules.rate_limit ? {
          messagesPerMinute: json.communication_rules.rate_limit.messages_per_minute,
          enabled: json.communication_rules.rate_limit.enabled,
        } : undefined,
      },
      workspace: {
        root: json.workspace.root,
        sharedFiles: json.workspace.shared_files,
        attachments: json.workspace.attachments,
      },
      meta: {
        tags: json.meta.tags,
        category: json.meta.category,
        messageCount: json.meta.message_count,
        createdAt: new Date(json.meta.created_at),
        updatedAt: new Date(),
        createdBy: json.meta.created_by,
      },
    };

    const updatedChannel = ChannelEntity.create(updatedProps);

    // 保存更新
    await this.channelRepository.update(updatedChannel);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.updated',
      aggregateId: channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: {
        channelId,
        changes: dto,
      },
    });

    this.logger.info('Channel updated successfully', { channelId });

    return updatedChannel;
  }

  /**
   * 添加成员到 Channel
   */
  async addMember(dto: AddMemberDTO): Promise<ChannelEntity> {
    this.logger.info('Adding member to channel', { ...dto });

    // 获取 Channel
    const channel = await this.getChannelById(dto.channelId);

    // 检查成员是否已在 Channel 中
    if (channel.hasMember(dto.memberId)) {
      this.logger.warn('Member already in channel', { ...dto });
      return channel;
    }

    // 添加成员（Domain 层业务规则）
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

    // 保存更新
    await this.channelRepository.update(updatedChannel);

    // 发布事件
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

  /**
   * 从 Channel 移除成员
   */
  async removeMember(dto: RemoveMemberDTO): Promise<ChannelEntity> {
    this.logger.info('Removing member from channel', { ...dto });

    // 获取 Channel
    const channel = await this.getChannelById(dto.channelId);

    // 检查成员是否在 Channel 中
    if (!channel.hasMember(dto.memberId)) {
      this.logger.warn('Member not in channel', { ...dto });
      return channel;
    }

    // 移除成员（Domain 层业务规则）
    const updatedChannel = channel.removeMember(dto.memberId);

    // 保存更新
    await this.channelRepository.update(updatedChannel);

    // 发布事件
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

  /**
   * 发送消息到 Channel
   */

  // --- Delegation to ChannelMessagingService ---

  async sendMessage(dto: ChannelSendMessageDTO): Promise<MessageEntity> { return this.messagingService.sendMessage(dto); }
  async getChannelMessages(channelId: string, limit?: number): Promise<MessageEntity[]> { return this.messagingService.getChannelMessages(channelId, limit); }
  async getThreadMessages(threadId: string, limit?: number): Promise<MessageEntity[]> { return this.messagingService.getThreadMessages(threadId, limit); }

  async archiveChannel(channelId: string): Promise<ChannelEntity> {
    this.logger.info('Archiving channel', { channelId });

    // 获取 Channel
    const channel = await this.getChannelById(channelId);

    // 归档（Domain 层业务规则）
    const archivedChannel = channel.archive();

    // 保存更新
    await this.channelRepository.update(archivedChannel);

    // 发布事件
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

  /**
   * 激活 Channel
   */
  async activateChannel(channelId: string): Promise<ChannelEntity> {
    this.logger.info('Activating channel', { channelId });

    // 获取 Channel
    const channel = await this.getChannelById(channelId);

    // 激活（Domain 层业务规则）
    const activatedChannel = channel.activate();

    // 保存更新
    await this.channelRepository.update(activatedChannel);

    // 发布事件
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

  /**
   * 删除 Channel
   */
  async deleteChannel(channelId: string): Promise<void> {
    this.logger.info('Deleting channel', { channelId });

    // 获取 Channel
    const channel = await this.getChannelById(channelId);

    // 检查状态（只能删除已归档的 Channel）
    if (channel.status !== 'archived') {
      throw new ChannelNotArchivedError(channelId);
    }

    // 删除
    await this.channelRepository.delete(channelId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'channel.deleted',
      aggregateId: channelId,
      aggregateType: 'Channel',
      occurredAt: new Date(),
      payload: { channelId },
    });

    this.logger.info('Channel deleted successfully', { channelId });
  }


  // --- Private helpers ---

  private generateChannelId(): string {
    return `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

// --- Application Layer Errors ---
