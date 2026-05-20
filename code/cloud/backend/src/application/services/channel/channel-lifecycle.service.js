"use strict";
/**
 * ChannelLifecycleService - Channel 生命周期管理
 *
 * 职责：
 * - 归档 Channel
 * - 激活 Channel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelLifecycleService = void 0;
const channel_errors_1 = require("./channel.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class ChannelLifecycleService {
    channelRepository;
    eventBus;
    logger;
    constructor(channelRepository, eventBus, logger) {
        this.channelRepository = channelRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async archiveChannel(channelId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Archiving channel', { channelId, realmId: context.realmId });
        const channel = await this.getChannelById(channelId);
        const archivedChannel = channel.archive();
        await this.channelRepository.update(archivedChannel, context.realmId);
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
    async activateChannel(channelId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Activating channel', { channelId, realmId: context.realmId });
        const channel = await this.getChannelById(channelId);
        const activatedChannel = channel.activate();
        await this.channelRepository.update(activatedChannel, context.realmId);
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
exports.ChannelLifecycleService = ChannelLifecycleService;
