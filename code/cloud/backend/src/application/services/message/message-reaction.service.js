"use strict";
/**
 * MessageReactionService - Message 反应管理
 *
 * 职责：
 * - 添加反应
 * - 移除反应
 * - 查询反应
 * - 反应统计
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageReactionService = void 0;
const message_errors_1 = require("./message.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class MessageReactionService {
    messageRepository;
    eventBus;
    logger;
    constructor(messageRepository, eventBus, logger) {
        this.messageRepository = messageRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async addReaction(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Adding reaction to message', { ...dto, realmId: context.realmId });
        const message = await this.getMessageById(dto.messageId);
        const updatedMessage = message.addReaction(dto.emoji, dto.userId);
        await this.messageRepository.update(updatedMessage, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'message.reaction_added',
            aggregateId: dto.messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload: {
                messageId: dto.messageId,
                userId: dto.userId,
                emoji: dto.emoji,
            },
        });
        this.logger.info('Reaction added successfully', { ...dto });
        return updatedMessage;
    }
    async removeReaction(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Removing reaction from message', { ...dto, realmId: context.realmId });
        const message = await this.getMessageById(dto.messageId);
        const updatedMessage = message.removeReaction(dto.emoji, dto.userId);
        await this.messageRepository.update(updatedMessage, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'message.reaction_removed',
            aggregateId: dto.messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload: {
                messageId: dto.messageId,
                userId: dto.userId,
                emoji: dto.emoji,
            },
        });
        this.logger.info('Reaction removed successfully', { ...dto });
        return updatedMessage;
    }
    async getMessageReactions(messageId) {
        const message = await this.getMessageById(messageId);
        return message.reactions;
    }
    async getReactionStats(messageId) {
        const message = await this.getMessageById(messageId);
        const stats = new Map();
        for (const reaction of message.reactions) {
            const count = stats.get(reaction.emoji) || 0;
            stats.set(reaction.emoji, count + 1);
        }
        return stats;
    }
    async getMessageById(messageId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            throw new message_errors_1.MessageNotFoundError(messageId);
        }
        return message;
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
exports.MessageReactionService = MessageReactionService;
