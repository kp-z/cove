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
import { getRealmContext } from '../../context/realm-context-store';

export class ChannelQueryService {
  constructor(
    private readonly channelRepository: IChannelRepository,
    private readonly messageRepository: IMessageRepository
  ) {}

  async getChannelById(channelId: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(channelId, getRealmContext().realmId);
    if (!channel) {
      throw new ChannelNotFoundError(channelId);
    }
    return channel;
  }

  async canSendMessage(channelId: string, senderId: string): Promise<{ allowed: boolean; reason?: string }> {
    const channel = await this.channelRepository.findById(channelId, getRealmContext().realmId);
    if (!channel) {
      return { allowed: false, reason: 'Channel not found' };
    }

    const recentCount = await this.messageRepository.countRecentByChannelAndSender(channelId, senderId, 1);
    const result = channel.canSendMessage(senderId, recentCount);

    return result;
  }

  async getChannelsByProject(projectId: string): Promise<ChannelEntity[]> {
    return await this.channelRepository.findByProject(projectId, getRealmContext().realmId);
  }

  async getAllChannels(): Promise<ChannelEntity[]> {
    return await this.channelRepository.findAll(getRealmContext().realmId);
  }

  async getChannelsByType(type: ChannelType): Promise<ChannelEntity[]> {
    return await this.channelRepository.findByType(type, getRealmContext().realmId);
  }

  async getChannelsByStatus(status: ChannelStatus): Promise<ChannelEntity[]> {
    const allChannels = await this.channelRepository.findAll(getRealmContext().realmId);
    return allChannels.filter(channel => channel.status === status);
  }

  async getChannelsByMember(memberId: string, realmId?: string): Promise<ChannelEntity[]> {
    const effectiveRealmId = realmId ?? getRealmContext().realmId;
    return await this.channelRepository.findByMember(memberId, effectiveRealmId);
  }

  async getAgentDMChannel(agentId: string, userId?: string): Promise<ChannelEntity | null> {
    return await this.channelRepository.findAgentDMChannel(agentId, getRealmContext().realmId, userId);
  }

  async findByRealmAndName(realmId: string, name: string): Promise<ChannelEntity | null> {
    return await this.channelRepository.findByRealmAndName(realmId, name);
  }

  /**
   * 消息发送后刷新 Channel 活跃时间戳（meta.updated_at）与消息计数。
   * 复用 ChannelEntity.incrementMessageCount()（immutable update），
   * 人类消息（message.send）与 Agent 消息（message.saveResponse）
   * 均经由 MessageCrudService.sendMessage 调用到此，保证两条路径行为一致。
   * @param channelId - Channel ID
   */
  async incrementMessageCount(channelId: string): Promise<void> {
    const realmId = getRealmContext().realmId;
    const channel = await this.channelRepository.findById(channelId, realmId);
    if (!channel) {
      throw new ChannelNotFoundError(channelId);
    }
    await this.channelRepository.update(channel.incrementMessageCount(), realmId);
  }
}
