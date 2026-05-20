"use strict";
/**
 * MessageCrudService - Message CRUD 操作
 *
 * 职责：
 * - 创建消息（发送）
 * - 更新消息内容
 * - 删除消息
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageCrudService = void 0;
const message_entity_1 = require("../../../domain/models/message/message.entity");
const message_errors_1 = require("./message.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class MessageCrudService {
    messageRepository;
    channelQueryService;
    eventBus;
    logger;
    constructor(messageRepository, channelQueryService, eventBus, logger) {
        this.messageRepository = messageRepository;
        this.channelQueryService = channelQueryService;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async sendMessage(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Sending message', { channelId: dto.channelId, senderId: dto.senderId, realmId: context.realmId });
        const result = await this.channelQueryService.canSendMessage(dto.channelId, dto.senderId);
        if (!result.allowed) {
            throw new message_errors_1.SendMessageDeniedError(dto.senderId, dto.channelId, result.reason ?? 'Permission denied');
        }
        const channel = await this.channelQueryService.getChannelById(dto.channelId);
        let mentions = dto.mentions ?? [];
        if (mentions.length === 0 && dto.content.includes('@')) {
            mentions = this.parseMentionsFromContent(dto.content, channel);
        }
        const messageId = this.generateMessageId();
        const msgShortId = messageId.split('-')[2] || 'unknown'; // 使用随机部分而不是时间戳
        const now = new Date();
        const message = message_entity_1.MessageEntity.create({
            messageId,
            msgShortId,
            channelId: dto.channelId,
            channelName: channel.name,
            senderId: dto.senderId,
            senderName: dto.senderId,
            senderType: dto.senderType,
            content: dto.content,
            contentType: 'text',
            contentFormat: 'plain',
            threadId: dto.threadId,
            isThreadRoot: !dto.threadId,
            attachments: [],
            mentions,
            references: [],
            reactions: [],
            status: 'sent',
            isEdited: false,
            editHistory: [],
            createdAt: now,
            updatedAt: now,
            meta: {
                client: 'server',
                isPinned: false,
                isImportant: false,
            },
        });
        await this.messageRepository.save(message, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'message.created',
            aggregateId: messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload: {
                messageId,
                channelId: dto.channelId,
                senderId: dto.senderId,
                senderType: dto.senderType,
                threadId: dto.threadId,
                mentions: dto.mentions,
            },
        });
        this.logger.info('Message sent successfully', { messageId });
        return message;
    }
    async updateMessage(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating message', { messageId: dto.messageId, realmId: context.realmId });
        const message = await this.getMessageById(dto.messageId);
        if (message.senderId !== dto.editorId) {
            throw new message_errors_1.UnauthorizedMessageEditError(dto.messageId, dto.editorId);
        }
        const updatedMessage = message.updateContent(dto.content, dto.editorId);
        await this.messageRepository.update(updatedMessage, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'message.updated',
            aggregateId: dto.messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload: {
                messageId: dto.messageId,
                content: dto.content,
            },
        });
        this.logger.info('Message updated successfully', { messageId: dto.messageId });
        return updatedMessage;
    }
    async deleteMessage(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Deleting message', { messageId: dto.messageId, realmId: context.realmId });
        const message = await this.getMessageById(dto.messageId);
        if (message.senderId !== dto.deletedBy) {
            throw new message_errors_1.UnauthorizedMessageDeletionError(dto.messageId, dto.deletedBy);
        }
        const deletedMessage = message.markAsDeleted();
        await this.messageRepository.update(deletedMessage, context.realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'message.deleted',
            aggregateId: dto.messageId,
            aggregateType: 'Message',
            occurredAt: new Date(),
            payload: {
                messageId: dto.messageId,
                deletedBy: dto.deletedBy,
            },
        });
        this.logger.info('Message deleted successfully', { messageId: dto.messageId });
        return deletedMessage;
    }
    async getMessageById(messageId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            throw new message_errors_1.MessageNotFoundError(messageId);
        }
        return message;
    }
    parseMentionsFromContent(content, channel) {
        const mentions = [];
        const seen = new Set();
        const pattern = /@(\S+)/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const name = match[1]?.toLowerCase();
            if (!name)
                continue;
            for (const agentId of channel.agentPool) {
                if (seen.has(agentId))
                    continue;
                if (agentId.toLowerCase().includes(name) || name.includes('agent') || name.includes('cove')) {
                    mentions.push({ mentionType: 'agent', mentionId: agentId });
                    seen.add(agentId);
                }
            }
            for (const member of channel.members) {
                if (member.memberType !== 'human' || seen.has(member.memberId))
                    continue;
                if (member.memberId.toLowerCase() === name) {
                    mentions.push({ mentionType: 'user', mentionId: member.memberId });
                    seen.add(member.memberId);
                }
            }
        }
        return mentions;
    }
    generateMessageId() {
        return `message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
exports.MessageCrudService = MessageCrudService;
