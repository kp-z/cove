"use strict";
/**
 * ChannelCrudService - Channel CRUD 操作
 *
 * 职责：
 * - 创建 Channel
 * - 更新 Channel
 * - 删除 Channel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelCrudService = void 0;
const channel_entity_1 = require("../../../domain/models/channel/channel.entity");
const channel_errors_1 = require("./channel.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class ChannelCrudService {
    channelRepository;
    eventBus;
    logger;
    constructor(channelRepository, eventBus, logger) {
        this.channelRepository = channelRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async createChannel(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Creating new channel', { name: dto.name, type: dto.type, realmId: context.realmId });
        const channelId = this.generateChannelId();
        const now = new Date();
        const members = (dto.memberIds || []).map(memberId => ({
            memberId,
            memberType: 'human',
            role: memberId === dto.createdBy ? 'owner' : 'member',
            joinedAt: now,
        }));
        const channel = channel_entity_1.ChannelEntity.create({
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
        await this.channelRepository.save(channel, context.realmId);
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
    async updateChannel(channelId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
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
        const updatedChannel = channel_entity_1.ChannelEntity.create(updatedProps);
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
    async deleteChannel(channelId) {
        this.logger.info('Deleting channel', { channelId });
        const channel = await this.getChannelById(channelId);
        if (channel.status !== 'archived') {
            throw new channel_errors_1.ChannelNotArchivedError(channelId);
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
    async getChannelById(channelId) {
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) {
            throw new channel_errors_1.ChannelNotFoundError(channelId);
        }
        return channel;
    }
    generateChannelId() {
        return `channel-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.eventType,
                aggregateId: event.aggregateId,
            });
        }
    }
}
exports.ChannelCrudService = ChannelCrudService;
