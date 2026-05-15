/**
 * ChannelQueryService - Channel 查询操作
 *
 * 职责：
 * - 根据 ID 查询 Channel
 * - 根据 Project 查询 Channels
 * - 根据类型/状态查询 Channels
 * - 权限检查
 */

import { ChannelEntity, ChannelType, ChannelStatus } from '../../../domain/models/channel/channel.entity';
import {
  IChannelRepository,
  IMessageRepository,
} from '../../interfaces';
import { ChannelNotFoundError } from './channel.errors';

export class ChannelQueryService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async getChannelById(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      throw new ChannelNotFoundError(channelId);
    }
    return channel;
  }

  async canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }> {
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) {
      return { allowed: false, reason: 'Channel not found' };
    }
    const recentCount = await this.messageRepository.countRecentByChannelAndSender(channelId, senderId, 1);
    return channel.canSendMessage(senderId, recentCount);
  }

  async getChannelsByProject(projectId: string): Promise<ChannelEntity[]> {
    return await this.channelRepository.findByProject(projectId);
  }

  async getAllChannels(): Promise<ChannelEntity[]> {
    return await this.channelRepository.findAll();
  }

  async getChannelsByType(type: ChannelType): Promise<ChannelEntity[]> {
    return await this.channelRepository.findByType(type);
  }

  async getChannelsByStatus(status: ChannelStatus): Promise<ChannelEntity[]> {
    const allChannels = await this.channelRepository.findAll();
    return allChannels.filter(channel => channel.status === status);
  }
}
