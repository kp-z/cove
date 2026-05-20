"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelMessagingService = void 0;
const message_entity_1 = require("../../../domain/models/message/message.entity");
const channel_errors_1 = require("./channel.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class ChannelMessagingService {
    channelRepository;
    messageRepository;
    eventBus;
    logger;
    constructor(channelRepository, messageRepository, eventBus, logger) {
        this.channelRepository = channelRepository;
        this.messageRepository = messageRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async sendMessage(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Sending message to channel', { channelId: dto.channelId });
        const channel = await this.channelRepository.findById(dto.channelId);
        if (!channel)
            throw new channel_errors_1.ChannelNotFoundError(dto.channelId);
        if (channel.status !== 'active')
            throw new channel_errors_1.ChannelNotActiveError(dto.channelId);
        if (!channel.memberIds.includes(dto.senderId)) {
            throw new channel_errors_1.MemberNotInChannelError(dto.senderId, dto.channelId);
        }
        const messageId = `message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const msgShortId = messageId.split('-')[1]?.substring(0, 8) || 'unknown';
        const message = message_entity_1.MessageEntity.create({
            messageId,
            msgShortId,
            channelId: dto.channelId,
            channelName: channel.name,
            senderId: dto.senderId,
            senderName: dto.senderId,
            senderType: 'human',
            content: dto.content,
            contentType: 'text',
            contentFormat: 'plain',
            threadId: dto.threadId,
            isThreadRoot: !dto.threadId,
            attachments: [],
            mentions: [],
            references: [],
            reactions: [],
            status: 'sent',
            isEdited: false,
            editHistory: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            meta: { client: 'server', isPinned: false, isImportant: false },
        });
        await this.messageRepository.save(message, context.realmId);
        await this.publishEvent({
            eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            eventType: 'message.sent',
            aggregateId: messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload: { messageId, channelId: dto.channelId, senderId: dto.senderId, threadId: dto.threadId },
        });
        return message;
    }
    async getChannelMessages(channelId, limit) {
        const channel = await this.channelRepository.findById(channelId);
        if (!channel)
            throw new channel_errors_1.ChannelNotFoundError(channelId);
        return this.messageRepository.findByChannel(channelId, limit);
    }
    async getThreadMessages(threadId, _limit) {
        return this.messageRepository.findByThread(threadId);
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.eventType, aggregateId: event.aggregateId,
            });
        }
    }
}
exports.ChannelMessagingService = ChannelMessagingService;
