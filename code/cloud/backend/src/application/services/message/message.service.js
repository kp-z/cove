"use strict";
/**
 * MessageService - Message 管理业务逻辑（协调器）
 *
 * 职责：
 * - 协调各个子服务
 * - 提供统一的消息管理接口
 *
 * 依赖：
 * - MessageCrudService: CRUD 操作
 * - MessageQueryService: 查询操作
 * - MessageReactionService: 反应管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
class MessageService {
    crudService;
    queryService;
    reactionService;
    constructor(crudService, queryService, reactionService) {
        this.crudService = crudService;
        this.queryService = queryService;
        this.reactionService = reactionService;
    }
    async sendMessage(dto) {
        return this.crudService.sendMessage(dto);
    }
    async getMessageById(messageId) {
        return this.queryService.getMessageById(messageId);
    }
    async getMessagesByChannel(channelId, limit, offset) {
        return this.queryService.getMessagesByChannel(channelId, limit, offset);
    }
    async getMessagesByChannelCursor(channelId, cursor, limit) {
        return this.queryService.getMessagesByChannelCursor(channelId, cursor, limit);
    }
    async getMessagesByThread(threadId, limit) {
        return this.queryService.getMessagesByThread(threadId, limit);
    }
    async getMessagesBySender(senderId) {
        return this.queryService.getMessagesBySender(senderId);
    }
    async updateMessage(dto) {
        return this.crudService.updateMessage(dto);
    }
    async deleteMessage(dto) {
        return this.crudService.deleteMessage(dto);
    }
    async addReaction(dto) {
        return this.reactionService.addReaction(dto);
    }
    async removeReaction(dto) {
        return this.reactionService.removeReaction(dto);
    }
    async getMessageReactions(messageId) {
        return this.reactionService.getMessageReactions(messageId);
    }
    async getReactionStats(messageId) {
        return this.reactionService.getReactionStats(messageId);
    }
    async searchMessages(query, channelId) {
        return this.queryService.searchMessages(query, channelId);
    }
}
exports.MessageService = MessageService;
