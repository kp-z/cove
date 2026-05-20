"use strict";
/**
 * ChannelService - Channel 管理业务逻辑（协调器）
 *
 * 职责：
 * - 协调各个子服务
 * - 提供统一的 Channel 管理接口
 * - 实现 IChannelQueryService 接口
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelService = void 0;
class ChannelService {
    crudService;
    queryService;
    memberService;
    lifecycleService;
    messagingService;
    constructor(crudService, queryService, memberService, lifecycleService, messagingService) {
        this.crudService = crudService;
        this.queryService = queryService;
        this.memberService = memberService;
        this.lifecycleService = lifecycleService;
        this.messagingService = messagingService;
    }
    async createChannel(dto) {
        return this.crudService.createChannel(dto);
    }
    async getChannelById(channelId) {
        return this.queryService.getChannelById(channelId);
    }
    async canSendMessage(channelId, senderId) {
        return this.queryService.canSendMessage(channelId, senderId);
    }
    async getChannelsByProject(projectId) {
        return this.queryService.getChannelsByProject(projectId);
    }
    async getAllChannels() {
        return this.queryService.getAllChannels();
    }
    async getChannelsByType(type) {
        return this.queryService.getChannelsByType(type);
    }
    async getChannelsByStatus(status) {
        return this.queryService.getChannelsByStatus(status);
    }
    async updateChannel(channelId, dto) {
        return this.crudService.updateChannel(channelId, dto);
    }
    async addMember(dto) {
        return this.memberService.addMember(dto);
    }
    async removeMember(dto) {
        return this.memberService.removeMember(dto);
    }
    async sendMessage(dto) {
        return this.messagingService.sendMessage(dto);
    }
    async getChannelMessages(channelId, limit) {
        return this.messagingService.getChannelMessages(channelId, limit);
    }
    async getThreadMessages(threadId, limit) {
        return this.messagingService.getThreadMessages(threadId, limit);
    }
    async archiveChannel(channelId) {
        return this.lifecycleService.archiveChannel(channelId);
    }
    async activateChannel(channelId) {
        return this.lifecycleService.activateChannel(channelId);
    }
    async deleteChannel(channelId) {
        return this.crudService.deleteChannel(channelId);
    }
}
exports.ChannelService = ChannelService;
