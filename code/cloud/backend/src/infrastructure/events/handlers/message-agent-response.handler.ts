/**
 * Message Agent Response Handler
 *
 * 职责：监听 message.created 事件，触发 Agent 自动响应
 *
 * 设计优点：
 * 1. 独立的事件处理器，职责单一
 * 2. 完整的 Agent 响应判断逻辑（@mention, DM, auto-response）
 * 3. 支持多个 Agent 在同一 channel
 * 4. 易于测试和维护
 */

import { DomainEvent } from '../../../application/interfaces/event-bus.interface';
import { IAgentRepository } from '../../../application/interfaces/repositories/agent.repository.interface';
import { IChannelRepository } from '../../../application/interfaces/repositories/channel.repository.interface';
import { IMessageRepository } from '../../../application/interfaces/repositories/message.repository.interface';
import { IEventBus } from '../../../application/interfaces/event-bus.interface';
import { ILogger } from '../../../application/interfaces/logger.interface';
import { IMessageOrchestrator } from '../../../domain/message-orchestrator/message-orchestrator.interface';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';

export class MessageAgentResponseHandler {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly messageOrchestrator: IMessageOrchestrator,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    if (event.eventType !== 'message.created') return;

    // 跳过 agent 消息，防止无限循环
    if (event.payload.senderType === 'agent') return;

    const realmId = (event.payload as any).realmId;
    const channelId = (event.payload as any).channelId;
    const messageId = event.payload.messageId as string;

    if (!realmId || !channelId) {
      this.logger.warn('message.created event missing realmId or channelId', { messageId });
      return;
    }

    try {
      // 1. 获取完整的消息内容
      const message = await this.messageRepository.findById(messageId, realmId);
      if (!message) {
        this.logger.warn('Message not found in database', { messageId });
        return;
      }

      // 2. 获取 channel 信息
      const channel = await this.channelRepository.findById(channelId, realmId);
      if (!channel || channel.agentPool.length === 0) {
        return;
      }

      // 3. 选择应该响应的 agents
      const respondingAgents = await this.selectRespondingAgents(message, channel);

      // 4. 并行触发所有 agents 的响应（性能优化）
      await Promise.all(
        respondingAgents.map((agent) =>
          this.triggerAgentResponse(message, channel, agent)
        )
      );
    } catch (error) {
      this.logger.error('Failed to handle message for agent response', error as Error, {
        messageId,
        channelId,
      });
    }
  }

  private async selectRespondingAgents(
    message: MessageEntity,
    channel: ChannelEntity
  ): Promise<AgentEntity[]> {
    // 并行查询所有 agents（性能优化）
    const agentPromises = channel.agentPool.map(agentId =>
      this.agentRepository.findById(agentId, channel.realmId)
    );

    const agents = await Promise.all(agentPromises);

    // 过滤掉不存在的 agents
    const validAgents = agents.filter((agent): agent is AgentEntity => {
      if (!agent) {
        this.logger.warn('Agent not found in pool', {
          channelId: channel.channelId
        });
        return false;
      }
      return true;
    });

    // 并行判断所有 agents 是否应该响应
    const shouldRespondPromises = validAgents.map(async (agent) => ({
      agent,
      shouldRespond: await this.shouldAgentRespond(agent, message, channel),
    }));

    const results = await Promise.all(shouldRespondPromises);

    // 返回应该响应的 agents
    return results
      .filter((result) => result.shouldRespond)
      .map((result) => result.agent);
  }

  private async shouldAgentRespond(
    agent: AgentEntity,
    message: MessageEntity,
    channel: ChannelEntity
  ): Promise<boolean> {
    // 1. Agent 状态检查
    if (agent.status !== 'active' && agent.status !== 'idle') {
      this.logger.debug('Agent not active or idle', {
        agentId: agent.agentId,
        status: agent.status,
      });
      return false;
    }

    // 2. 避免 agent 回复自己
    if (message.senderId === agent.agentId) {
      return false;
    }

    // 3. 消息状态检查
    if (message.status !== 'sent') {
      this.logger.debug('Message not sent', {
        messageId: message.messageId,
        status: message.status,
      });
      return false;
    }

    // 4. @mention 检查 - 优先级最高
    const isMentioned = message.mentions.some(
      (m) => m.mentionType === 'agent' && m.mentionId === agent.agentId
    );
    if (isMentioned) {
      this.logger.info('Agent mentioned in message', {
        agentId: agent.agentId,
        messageId: message.messageId,
      });
      return true;
    }

    // 5. DM channel 检查
    if (channel.type === 'dm') {
      const isDmWithAgent = channel.members.some(
        (m) => m.memberId === agent.agentId && m.memberType === 'agent'
      );
      if (isDmWithAgent) {
        this.logger.info('Agent in DM channel', {
          agentId: agent.agentId,
          channelId: channel.channelId,
        });
        return true;
      }
    }

    // 6. 其他 channel 类型不自动响应
    // 只有被 @mention 或在 DM channel 中才会响应
    // 如果需要在 public/private channel 中自动响应，应该通过 @mention
    this.logger.debug('Agent not triggered - no mention and not DM', {
      agentId: agent.agentId,
      channelId: channel.channelId,
      channelType: channel.type,
    });
    return false;
  }

  private async triggerAgentResponse(
    message: MessageEntity,
    channel: ChannelEntity,
    agent: AgentEntity
  ): Promise<void> {
    const agentName = agent.displayName || agent.name || 'Agent';

    try {
      // 1. 立即发布接收确认事件（前端可以立即显示"Agent 正在思考..."）
      await this.eventBus.publish({
        eventId: this.generateEventId(),
        eventType: 'agent.response.accepted',
        aggregateId: message.messageId,
        aggregateType: 'Message',
        occurredAt: new Date(),
        payload: {
          messageId: message.messageId,
          channelId: channel.channelId,
          agentId: agent.agentId,
          agentName,
          estimatedDuration: 10, // 预估 10 秒
        },
      });

      this.logger.info('Agent response accepted', {
        messageId: message.messageId,
        agentId: agent.agentId,
        agentName,
      });

      // 2. 异步入队处理（不阻塞，通过 MessageOrchestrator 路由到 Local Device）
      await this.messageOrchestrator.enqueue({
        messageId: message.messageId,
        channelId: `${channel.realmId}:${channel.channelId}`,
        content: message.content,
        priority: 0,
        metadata: {
          agentId: agent.agentId,
          agentName,
        },
      });

      this.logger.info('Agent response enqueued', {
        messageId: message.messageId,
        agentId: agent.agentId,
      });
    } catch (error) {
      this.logger.error('Failed to trigger agent response', error as Error, {
        messageId: message.messageId,
        agentId: agent.agentId,
      });
    }
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
