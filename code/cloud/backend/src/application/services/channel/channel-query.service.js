"use strict";
/**
 * ChannelQueryService - Channel 查询操作
 *
 * 职责：
 * - 根据 ID 查询 Channel
 * - 根据 Project 查询 Channels
 * - 根据类型/状态查询 Channels
 * - 权限检查
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelQueryService = void 0;
const channel_errors_1 = require("./channel.errors");
class ChannelQueryService {
    channelRepository;
    messageRepository;
    constructor(channelRepository, messageRepository) {
        this.channelRepository = channelRepository;
        this.messageRepository = messageRepository;
    }
    async getChannelById(channelId) {
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) {
            throw new channel_errors_1.ChannelNotFoundError(channelId);
        }
        return channel;
    }
    async canSendMessage(channelId, senderId) {
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) {
            return { allowed: false, reason: 'Channel not found' };
        }
        const recentCount = await this.messageRepository.countRecentByChannelAndSender(channelId, senderId, 1);
        return channel.canSendMessage(senderId, recentCount);
    }
    async getChannelsByProject(projectId) {
        return await this.channelRepository.findByProject(projectId);
    }
    async getAllChannels() {
        return await this.channelRepository.findAll();
    }
    async getChannelsByType(type) {
        return await this.channelRepository.findByType(type);
    }
    async getChannelsByStatus(status) {
        const allChannels = await this.channelRepository.findAll();
        return allChannels.filter(channel => channel.status === status);
    }
}
exports.ChannelQueryService = ChannelQueryService;
