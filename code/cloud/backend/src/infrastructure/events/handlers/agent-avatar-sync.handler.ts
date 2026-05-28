/**
 * Agent Avatar Sync 事件处理器
 *
 * 职责：监听 agent.updated 事件，自动同步 DM Channel 头像
 *
 * 设计优点：
 * 1. 事件驱动，低耦合
 * 2. 错误隔离，不影响 Agent 更新流程
 * 3. 支持一个 Agent 对应多个 DM Channels（多个用户）
 * 4. 并行更新多个 channels，提升性能
 */

import { DomainEvent } from '../../../application/interfaces/event-bus.interface';
import { IAgentRepository } from '../../../application/interfaces/repositories/agent.repository.interface';
import { IChannelRepository } from '../../../application/interfaces/repositories/channel.repository.interface';
import { ChannelQueryService } from '../../../application/services/channel/channel-query.service';
import { ILogger } from '../../../application/interfaces';
import { Avatar } from '../../../domain/types/avatar.types';

export class AgentAvatarSyncHandler {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly channelQueryService: ChannelQueryService,
    private readonly channelRepository: IChannelRepository,
    private readonly logger: ILogger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType !== 'agent.updated') return;

    const { agentId, realmId } = event.payload as {
      agentId: string;
      realmId?: string;
      changes: any;
    };

    // 如果 payload 中没有 realmId，记录警告并跳过
    if (!realmId) {
      this.logger.warn('[AgentAvatarSyncHandler] Missing realmId in event payload', { agentId });
      return;
    }

    try {
      // 1. 获取 Agent 实体以获取最新头像
      const agent = await this.agentRepository.findById(agentId, realmId);
      if (!agent) {
        this.logger.warn('[AgentAvatarSyncHandler] Agent not found', { agentId });
        return;
      }

      // 2. 检查 Agent 是否有头像（头像在 persona.avatar 中）
      const avatar = agent.persona?.avatar;
      if (!avatar) {
        this.logger.debug('[AgentAvatarSyncHandler] Agent has no avatar, skipping sync', { agentId });
        return;
      }

      // 3. 查找所有关联的 DM Channels
      const allChannels = await this.channelQueryService.getAllChannels();
      const dmChannels = allChannels.filter(channel => channel.isDMWithAgent(agentId));

      if (dmChannels.length === 0) {
        this.logger.debug('[AgentAvatarSyncHandler] No DM channels found for agent', { agentId });
        return;
      }

      this.logger.info('[AgentAvatarSyncHandler] Syncing avatar to DM channels', {
        agentId,
        channelCount: dmChannels.length,
        avatar: { url: avatar.url, type: avatar.type },
      });

      // 4. 并行更新所有 DM Channels
      const updatePromises = dmChannels.map(channel =>
        this.updateChannelAvatar(channel.channelId, channel.realmId, avatar)
      );

      const results = await Promise.allSettled(updatePromises);

      // 5. 统计结果
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        this.logger.warn('[AgentAvatarSyncHandler] Some channels failed to update', {
          agentId,
          succeeded,
          failed,
          errors: results
            .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
            .map(r => r.reason),
        });
      } else {
        this.logger.info('[AgentAvatarSyncHandler] Avatar synced successfully', {
          agentId,
          channelCount: succeeded,
        });
      }
    } catch (error) {
      this.logger.error('[AgentAvatarSyncHandler] Failed to sync avatar', error as Error, { agentId });
    }
  }

  private async updateChannelAvatar(
    channelId: string,
    realmId: string,
    avatar: Avatar
  ): Promise<void> {
    try {
      const channel = await this.channelRepository.findById(channelId, realmId);
      if (!channel) {
        this.logger.warn('[AgentAvatarSyncHandler] Channel not found during update', { channelId });
        return;
      }

      // 检查头像是否已经是最新的（可选优化）
      if (
        channel.avatar?.url === avatar.url &&
        channel.avatar?.type === avatar.type
      ) {
        this.logger.debug('[AgentAvatarSyncHandler] Channel avatar already up-to-date', { channelId });
        return;
      }

      // 使用 ChannelEntity.create 创建新实体（immutable update）
      const updatedChannel = channel.updateAvatar(avatar);

      await this.channelRepository.update(updatedChannel, realmId);

      this.logger.debug('[AgentAvatarSyncHandler] Channel avatar updated', {
        channelId,
        avatar: { url: avatar.url, type: avatar.type },
      });
    } catch (error) {
      this.logger.error('[AgentAvatarSyncHandler] Failed to update channel avatar', error as Error, {
        channelId,
      });
      throw error;
    }
  }
}
