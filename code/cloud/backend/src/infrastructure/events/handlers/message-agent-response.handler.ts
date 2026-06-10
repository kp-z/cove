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

    // 5. agentPool 自动响应（对齐 commit 653e869）
    // 设计决策：凡是被加入 channel.agentPool 的 agent，在该 channel 内的任意
    // 用户消息都应自动响应，不再限制 channel 类型（public/private/dm 一致）。
    // selectRespondingAgents 已保证只有 agentPool 中的 agent 会进入本方法，
    // 这里显式校验一次，保证语义清晰且对未来调用方安全。
    if (channel.agentPool.includes(agent.agentId)) {
      this.logger.info('Agent in channel agentPool - auto responding', {
        agentId: agent.agentId,
        channelId: channel.channelId,
        channelType: channel.type,
      });
      return true;
    }

    // 6. 不在 agentPool 且未被 @mention，不响应
    this.logger.debug('Agent not triggered - not mentioned and not in agentPool', {
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

    // 契约1：服务端权威消息 ID。
    // 在此处预分配 agent 回复消息的最终 ID，并贯穿前端占位、Local 流式、最终落库。
    // 这样占位消息 id 与最终持久化消息 id 完全一致，前端无需任何模糊匹配/重连。
    const agentMessageId = this.generateMessageId();

    try {
      // 1. 立即发布接收确认事件（前端据此创建 id=agentMessageId 的占位消息）
      // 约定：所有 agent.response.* 事件的 payload.messageId 都等于 agentMessageId。
      // channelId 统一使用裸 channelId（不带 realm 前缀），与订阅过滤保持一致。
      await this.eventBus.publish({
        eventId: this.generateEventId(),
        eventType: 'agent.response.accepted',
        aggregateId: agentMessageId,
        aggregateType: 'Message',
        occurredAt: new Date(),
        payload: {
          messageId: agentMessageId,
          inReplyTo: message.messageId, // 触发本次响应的用户消息 id
          channelId: channel.channelId,
          agentId: agent.agentId,
          agentName,
          estimatedDuration: 10, // 预估 10 秒
        },
      });

      this.logger.info('Agent response accepted', {
        agentMessageId,
        inReplyTo: message.messageId,
        agentId: agent.agentId,
        agentName,
      });

      // 2. 异步入队处理（不阻塞，通过 MessageOrchestrator 路由到 Local Device）
      // task.messageId 仍为用户消息 id（用于上下文/历史语义），
      // 而 agentMessageId 通过 metadata 贯穿到 Local，用于流式回报与最终落库。
      await this.messageOrchestrator.enqueue({
        messageId: message.messageId,
        channelId: `${channel.realmId}:${channel.channelId}`,
        content: message.content,
        priority: 0,
        metadata: {
          agentId: agent.agentId,
          agentName,
          agentMessageId,
          userMessageId: message.messageId,
        },
      });

      this.logger.info('Agent response enqueued', {
        agentMessageId,
        userMessageId: message.messageId,
        agentId: agent.agentId,
      });
    } catch (error) {
      this.logger.error('Failed to trigger agent response', error as Error, {
        agentMessageId,
        userMessageId: message.messageId,
        agentId: agent.agentId,
      });
    }
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * 生成 agent 回复消息的权威 ID。
   * 格式与 MessageCrudService.generateMessageId 对齐（msg-时间戳-随机串），
   * 以便 saveResponse 落库时沿用同一 id。
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
