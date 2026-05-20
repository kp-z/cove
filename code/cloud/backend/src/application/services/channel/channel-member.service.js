"use strict";
/**
 * ChannelMemberService - Channel 成员管理
 *
 * 职责：
 * - 添加成员
 * - 移除成员
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelMemberService = void 0;
const channel_errors_1 = require("./channel.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class ChannelMemberService {
    channelRepository;
    eventBus;
    logger;
    constructor(channelRepository, eventBus, logger) {
        this.channelRepository = channelRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async addMember(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Adding member to channel', { ...dto, realmId: context.realmId });
        const channel = await this.getChannelById(dto.channelId);
        if (channel.hasMember(dto.memberId)) {
            this.logger.warn('Member already in channel', { ...dto });
            return channel;
        }
        const isAgent = dto.memberType === 'agent' || dto.memberId.startsWith('agent-');
        const newMember = {
            memberId: dto.memberId,
            memberType: isAgent ? 'agent' : 'human',
            role: 'member',
            joinedAt: new Date(),
        };
        let updatedChannel = channel.addMember(newMember);
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
            },
        });
        this.logger.info('Member added to channel successfully', { ...dto });
        return updatedChannel;
    }
    async removeMember(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Removing member from channel', { ...dto, realmId: context.realmId });
        const channel = await this.getChannelById(dto.channelId);
        if (!channel.hasMember(dto.memberId)) {
            this.logger.warn('Member not in channel', { ...dto });
            return channel;
        }
        const updatedChannel = channel.removeMember(dto.memberId);
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
            },
        });
        this.logger.info('Member removed from channel successfully', { ...dto });
        return updatedChannel;
    }
    async getChannelById(channelId) {
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) {
            throw new channel_errors_1.ChannelNotFoundError(channelId);
        }
        return channel;
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
exports.ChannelMemberService = ChannelMemberService;
