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
import { getServerContext } from '../../context/server-context-store';

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

export class ChannelCrudService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createChannel(dto: CreateChannelDTO): Promise<ChannelEntity> {
      const context = getServerContext();
    this.logger.info('Creating new channel', { name: dto.name, type: dto.type, serverId: context.serverId });

    const channelId = this.generateChannelId();
    const now = new Date();

    const members = (dto.memberIds || []).map(memberId => ({
      memberId,
      memberType: 'human' as const,
      role: memberId === dto.createdBy ? ('owner' as const) : ('member' as const),
      joinedAt: now,
    }));

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

    await this.channelRepository.save(channel, context.serverId);

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
      const context = getServerContext();
    this.logger.info('Updating channel', { channelId, serverId: context.serverId });

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

    await this.channelRepository.update(updatedChannel, context.serverId);

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
