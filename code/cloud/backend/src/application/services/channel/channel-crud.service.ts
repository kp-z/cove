/**
 * ChannelCrudService - Channel CRUD 操作
 *
 * 职责：
 * - 创建 Channel
 * - 更新 Channel
 * - 删除 Channel
 */

import { ChannelEntity, ChannelType } from '../../../domain/models/channel/channel.entity';
import {
  IChannelRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { ChannelNotFoundError, ChannelNotArchivedError } from './channel.errors';
import { getRealmContext } from '../../context/realm-context-store';

export interface CreateChannelDTO {
  readonly name: string;
  readonly description?: string;
  readonly type: ChannelType;
  readonly projectId?: string;
  readonly createdBy: string;
  readonly memberIds?: readonly string[];
  readonly agentIds?: readonly string[]; // 用于 DM channel 创建
}

export interface UpdateChannelDTO {
  readonly name?: string;
  readonly description?: string;
}

export class ChannelCrudService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createChannel(dto: CreateChannelDTO): Promise<ChannelEntity> {
    const context = getRealmContext();
    this.logger.info('Creating new channel', { name: dto.name, type: dto.type, realmId: context.realmId });

    const channelId = this.generateChannelId();

    // DM channel 使用领域工厂方法
    if (dto.type === 'dm') {
      return this.createDMChannel(dto, channelId, context.realmId);
    }

    // 普通 channel 创建逻辑
    return this.createRegularChannel(dto, channelId, context.realmId);
  }

  private async createDMChannel(dto: CreateChannelDTO, channelId: string, realmId: string): Promise<ChannelEntity> {
    // 验证 DM channel 规则
    const allMemberIds = [...(dto.memberIds || []), ...(dto.agentIds || [])];

    if (allMemberIds.length !== 2) {
      throw new Error(`DM channel must have exactly 2 members, got ${allMemberIds.length}`);
    }

    if (!dto.agentIds || dto.agentIds.length !== 1) {
      throw new Error('DM channel must have exactly 1 agent');
    }

    const agentId = dto.agentIds[0]!; // Non-null assertion: we just checked length === 1
    const userId = allMemberIds.find(id => id !== agentId);

    if (!userId) {
      throw new Error('DM channel must have 1 user');
    }

    // 使用领域工厂方法创建 DM channel
    const channel = ChannelEntity.createDMChannel({
      channelId,
      agentId,
      userId,
      createdBy: {
        id: dto.createdBy,
        type: 'human',
      },
      name: dto.name,
      description: dto.description,
    });

    await this.channelRepository.save(channel, realmId);

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
      },
    });

    this.logger.info('DM channel created successfully', { channelId: channel.channelId });
    return channel;
  }

  private async createRegularChannel(dto: CreateChannelDTO, channelId: string, realmId: string): Promise<ChannelEntity> {
    const now = new Date();

    // Auto-detect member type based on ID prefix
    const members = (dto.memberIds || []).map(memberId => ({
      memberId,
      memberType: this.detectMemberType(memberId),
      role: memberId === dto.createdBy ? ('owner' as const) : ('member' as const),
      joinedAt: now,
    }));

    // Extract agent IDs for agentPool
    const agentIds = members
      .filter(m => m.memberType === 'agent')
      .map(m => m.memberId);

    const channel = ChannelEntity.create({
      channelId,
      name: dto.name,
      displayName: dto.name,
      description: dto.description,
      type: dto.type,
      status: 'active',
      projectId: dto.projectId,
      members,
      agentPool: agentIds,
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

    await this.channelRepository.save(channel, realmId);

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

  async updateChannel(channelId: string, dto: UpdateChannelDTO): Promise<ChannelEntity> {
      const context = getRealmContext();
    this.logger.info('Updating channel', { channelId, realmId: context.realmId });

    const channel = await this.getChannelById(channelId);

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

    await this.channelRepository.update(updatedChannel, context.realmId);

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

  async deleteChannel(channelId: string): Promise<void> {
    this.logger.info('Deleting channel', { channelId });

    const channel = await this.getChannelById(channelId);

    if (channel.status !== 'archived') {
      throw new ChannelNotArchivedError(channelId);
    }

    await this.channelRepository.delete(channelId);

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

  private async getChannelById(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      throw new ChannelNotFoundError(channelId);
    }
    return channel;
  }

  private generateChannelId(): string {
    return `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Detect member type based on ID prefix
   * - IDs starting with 'agent-' are agents
   * - All others are humans
   */
  private detectMemberType(memberId: string): 'human' | 'agent' {
    return memberId.startsWith('agent-') ? 'agent' : 'human';
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
