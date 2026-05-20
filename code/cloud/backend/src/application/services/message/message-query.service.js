"use strict";
/**
 * MessageQueryService - Message 查询操作
 *
 * 职责：
 * - 根据 ID 查询消息
 * - 根据 Channel 查询消息
 * - 根据 Thread 查询消息
 * - 根据 Sender 查询消息
 * - 搜索消息
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageQueryService = void 0;
const message_errors_1 = require("./message.errors");
class MessageQueryService {
    messageRepository;
    channelQueryService;
    constructor(messageRepository, channelQueryService) {
        this.messageRepository = messageRepository;
        this.channelQueryService = channelQueryService;
    }
    async getMessageById(messageId) {
        const message = await this.messageRepository.findById(messageId);
        if (!message) {
            throw new message_errors_1.MessageNotFoundError(messageId);
        }
        return message;
    }
    async getMessagesByChannel(channelId, limit, offset) {
        await this.channelQueryService.getChannelById(channelId);
        const messages = await this.messageRepository.findByChannel(channelId, limit, offset);
        return messages.filter(message => !message.threadId);
    }
    async getMessagesByChannelCursor(channelId, cursor, limit) {
        await this.channelQueryService.getChannelById(channelId);
        return this.messageRepository.findByChannelCursor(channelId, cursor, limit);
    }
    async getMessagesByThread(threadId, _limit) {
        return await this.messageRepository.findByThread(threadId);
    }
    async getMessagesBySender(senderId) {
        return await this.messageRepository.findBySender(senderId);
    }
    async searchMessages(query, channelId) {
        const messages = channelId
            ? await this.messageRepository.findByChannel(channelId)
            : [];
        return messages.filter(msg => msg.content.toLowerCase().includes(query.toLowerCase()));
    }
}
exports.MessageQueryService = MessageQueryService;
