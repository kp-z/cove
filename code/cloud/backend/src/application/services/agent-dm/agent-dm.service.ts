/**
 * AgentDM Service - 专门处理 Agent 与 DM Channel 的关联
 *
 * 职责：
 * 1. 为 Agent 自动创建 DM Channel
 * 2. 查询 Agent 的 DM Channel
 * 3. 确保 Agent-DM 关联的一致性
 *
 * 设计原则：
 * - 高内聚：只处理 Agent-DM 关联逻辑
 * - 低耦合：通过依赖注入使用其他服务
 * - 幂等性：ensureAgentDMChannel 可安全重复调用
 */

import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { AgentQueryService } from '../agent/agent-query.service';
import { ChannelCrudService } from '../channel/channel-crud.service';
import { ChannelQueryService } from '../channel/channel-query.service';
import { ILogger } from '../../interfaces';

export class AgentDMService {
  constructor(
    private readonly agentQueryService: AgentQueryService,
    private readonly channelCrudService: ChannelCrudService,
    private readonly channelQueryService: ChannelQueryService,
    private readonly logger: ILogger
  ) {}

  /**
   * 为 Agent 创建 DM Channel（幂等）
   *
   * @param params - 创建参数
   * @returns 已存在或新创建的 DM Channel
   */
  async ensureAgentDMChannel(params: {
    agentId: string;
    userId: string;
    realmId: string;
  }): Promise<ChannelEntity> {
    const { agentId, userId, realmId } = params;

    this.logger.info('[AgentDM] Ensuring DM channel', { agentId, userId, realmId });

    // 1. Get agent details to construct channel name
    const agent = await this.agentQueryService.getAgentById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Extract avatar directly from agent entity (not from persona)
    const avatar = agent.avatar ? {
      url: agent.avatar.url,
      type: agent.avatar.type,
    } : undefined;

    const channelName = agent.displayName || agent.name;

    // 2. Try to find existing channel by agent ID (more reliable than name lookup)
    let existingChannel = await this.channelQueryService.getAgentDMChannel(agentId, userId);

    // Fallback: try name-based lookup for backward compatibility
    if (!existingChannel) {
      existingChannel = await this.channelQueryService.findByRealmAndName(realmId, channelName);
    }

    if (existingChannel) {
      this.logger.info('[AgentDM] DM channel already exists', { channelId: existingChannel.channelId });
      return existingChannel;
    }

    // 3. Try to create the channel
    try {
      this.logger.info('[AgentDM] Creating new DM channel', {
        agentId,
        userId,
        channelName,
      });

      const channel = await this.channelCrudService.createChannel({
        name: channelName,
        type: 'dm',
        createdBy: userId,
        memberIds: [userId],
        agentIds: [agentId],
        avatar: avatar,
      });

      this.logger.info('[AgentDM] DM channel created successfully', { channelId: channel.channelId });
      return channel;
    } catch (error: any) {
      // 4. If unique constraint violation (P2002), another request created it
      if (error.code === 'P2002' || error.message?.includes('Unique constraint')) {
        this.logger.info('[AgentDM] Channel was created by concurrent request, fetching it', {
          agentId,
          userId,
          channelName,
        });

        // Retry the lookup - the channel should exist now
        const channel = await this.channelQueryService.findByRealmAndName(realmId, channelName);
        if (channel) {
          return channel;
        }

        // This should never happen, but handle it gracefully
        throw new Error(`Failed to find channel after concurrent creation: ${channelName}`);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * 获取 Agent 的 DM Channel（如果不存在则返回 null）
   *
   * @param params - 查询参数
   * @returns DM Channel 或 null
   */
  async getAgentDMChannel(params: {
    agentId: string;
    userId: string;
  }): Promise<ChannelEntity | null> {
    this.logger.info('[AgentDM] Getting DM channel', params);
    return this.channelQueryService.getAgentDMChannel(params.agentId, params.userId);
  }
}
