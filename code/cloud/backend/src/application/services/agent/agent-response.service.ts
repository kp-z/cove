import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IAgentRepository,
  IMessageRepository,
  IChannelRepository,
  IEventBus,
  ILogger,
  DomainEvent,
  IAgentConfigStore,
} from '../../interfaces';
import { createLlmAdapterFromConfig } from '../../../infrastructure/adapters/llm/llm-adapter-factory';
import type { ChatMessage } from '../../../infrastructure/adapters/llm/index';
import { AgentResponseGenerationError } from './agent.errors';
import { AdapterService } from '../adapter/adapter.service';
import { LlmAdapterFactory } from '../../../infrastructure/adapters/llm/llm-adapter-factory';
import { getRealmContext } from '../../context/realm-context-store';

export class AgentResponseService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly configStore?: IAgentConfigStore,
    private readonly adapterService?: AdapterService,
  ) {}

  async handleIncomingMessage(message: MessageEntity): Promise<void> {
      const context = getRealmContext();
    this.logger.info('Handling incoming message', {
      messageId: message.messageId,
      channelId: message.channelId,
      realmId: context.realmId,
    });

    const channel = await this.channelRepository.findById(message.channelId, getRealmContext().realmId);
    if (!channel) return;

    const agentIds = channel.agentPool;
    if (agentIds.length === 0) return;

    for (const agentId of agentIds) {
      try {
        const agent = await this.agentRepository.findById(agentId, getRealmContext().realmId);
        if (!agent) continue;

        const shouldRespond = await this.shouldAgentRespond(agent, message, channel);
        if (!shouldRespond) continue;

        await this.generateAndSendResponse(agent, message, channel);
      } catch (error) {
        this.logger.error('Error handling message for agent', error as Error, {
          agentId, messageId: message.messageId,
        });
      }
    }
  }

  async shouldAgentRespond(
    agent: AgentEntity,
    message: MessageEntity,
    channel: ChannelEntity
  ): Promise<boolean> {
    if (agent.status !== 'active' && agent.status !== 'idle') return false;
    if (message.senderId === agent.agentId) return false;
    if (message.status !== 'sent') return false;

    const isMentioned = message.mentions.some(
      (m) => m.mentionType === 'agent' && m.mentionId === agent.agentId
    );
    if (isMentioned) return true;

    if (channel.type === 'dm') {
      const isDmWithAgent = channel.members.some(
        (m) => m.memberId === agent.agentId && m.memberType === 'agent'
      );
      if (isDmWithAgent) return true;
    }

    return false;
  }

  async generateAgentResponse(
    agent: AgentEntity,
    message: MessageEntity,
    channel: ChannelEntity
  ): Promise<string> {
    this.logger.info('Generating agent response', {
      agentId: agent.agentId, messageId: message.messageId,
    });

    try {
      // Priority 1: Use database runtimeConfig (for API-created agents)
      if (agent.runtimeConfig?.adapter_id && this.adapterService) {
        this.logger.info('Using database runtimeConfig with adapter', {
          agentId: agent.agentId,
          adapterId: agent.runtimeConfig.adapter_id
        });

        const systemPrompt = this.getSystemPromptFromAgent(agent);
        const history = await this.buildConversationHistory(message, channel);

        const factory = new LlmAdapterFactory(this.adapterService);
        const adapter = await factory.createById(agent.runtimeConfig.adapter_id, agent.createdBy);

        const response = await adapter.generateResponse({
          systemPrompt,
          messages: history,
        });

        return response;
      }

      // Priority 2: Use configStore (for file-based agents)
      if (!this.configStore) {
        this.logger.warn('No configStore available, using mock response', {
          agentId: agent.agentId,
          agentName: agent.name,
        });
        return `Mock response from ${agent.displayName}: I received your message "${message.content}"`;
      }

      const runtime = await this.configStore.getRuntime(agent.agentId);

      // New adapter system: check if adapter_id is present
      if (runtime.adapter_id && this.adapterService) {
        this.logger.info('Using configStore adapter system', {
          agentId: agent.agentId,
          adapterId: runtime.adapter_id
        });

        const persona = await this.configStore.getPersona(agent.agentId);
        const systemPrompt = this.buildSystemPrompt(persona);
        const history = await this.buildConversationHistory(message, channel);

        const factory = new LlmAdapterFactory(this.adapterService);
        const adapter = await factory.createById(runtime.adapter_id, agent.createdBy);

        const response = await adapter.generateResponse({
          systemPrompt,
          messages: history,
        });

        return response;
      }

      // Legacy system: fall back to inline configuration
      this.logger.warn('Using legacy inline configuration (deprecated)', {
        agentId: agent.agentId
      });

      if (!(runtime.api as any)?.api_key) {
        this.logger.warn('Agent has no api_key configured, using mock', {
          agentId: agent.agentId,
          agentName: agent.name,
        });
        return `Mock response from ${agent.displayName}: I received your message "${message.content}"`;
      }

      const persona = await this.configStore.getPersona(agent.agentId);
      const systemPrompt = this.buildSystemPrompt(persona);
      const history = await this.buildConversationHistory(message, channel);

      const adapter = await createLlmAdapterFromConfig(runtime, this.adapterService);
      const response = await adapter.generateResponse({
        systemPrompt,
        messages: history,
        maxTokens: runtime.model?.max_tokens,
      });

      return response;
    } catch (error) {
      this.logger.error('Failed to generate agent response', error as Error, {
        agentId: agent.agentId, messageId: message.messageId,
      });
      throw new AgentResponseGenerationError(agent.agentId, message.messageId);
    }
  }

  private async generateAndSendResponse(
    agent: AgentEntity,
    originalMessage: MessageEntity,
    channel: ChannelEntity
  ): Promise<void> {
    const context = getRealmContext();
    const responseContent = await this.generateAgentResponse(agent, originalMessage, channel);

    const responseMessage = MessageEntity.create({
      realmId: context.realmId,
      messageId: this.generateMessageId(),
      msgShortId: this.generateShortId(),
      senderId: agent.agentId,
      senderType: 'agent',
      senderName: agent.displayName,
      channelId: channel.channelId,
      channelName: channel.name,
      threadId: originalMessage.threadId || originalMessage.messageId,
      isThreadRoot: false,
      content: responseContent,
      contentType: 'text',
      contentFormat: 'markdown',
      attachments: [],
      mentions: [],
      references: [{ refType: 'url', refId: originalMessage.messageId, refTitle: 'Reply to message' }],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      meta: { client: 'agent-runtime', isPinned: false, isImportant: false },
    });

    await this.messageRepository.save(responseMessage, context.realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'message.sent',
      aggregateId: responseMessage.messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId: responseMessage.messageId,
        channelId: channel.channelId,
        senderId: agent.agentId,
        senderType: 'agent',
        inReplyTo: originalMessage.messageId,
      },
    });

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.response_generated',
      aggregateId: agent.agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: {
        agentId: agent.agentId,
        messageId: responseMessage.messageId,
        originalMessageId: originalMessage.messageId,
        channelId: channel.channelId,
      },
    });
  }

  /**
   * Get system prompt from agent's database runtimeConfig
   */
  private getSystemPromptFromAgent(agent: AgentEntity): string {
    // Priority 1: Use overrides.systemPrompt from runtimeConfig
    const overridePrompt = agent.runtimeConfig?.overrides?.systemPrompt;
    if (overridePrompt && typeof overridePrompt === 'string') {
      return overridePrompt;
    }

    // Priority 2: Use persona instructions
    if (agent.persona?.instructions) {
      return agent.persona.instructions;
    }

    // Default prompt
    const displayName = agent.displayName || agent.name;
    return `You are ${displayName}, an AI assistant. Be helpful and professional.`;
  }

  private buildSystemPrompt(persona: any): string {
    const name = persona.name || 'Assistant';
    const title = persona.title || 'AI Assistant';
    const desc = persona.description || '';
    const lang = persona.language_style?.preferred_language || 'zh-CN';
    const verbosity = persona.language_style?.verbosity || 'concise';

    return `You are ${name}, a ${title}. ${desc}
Respond in ${lang}. Be ${verbosity}. Be helpful and professional.`;
  }

  private async buildConversationHistory(
    message: MessageEntity,
    _channel: ChannelEntity
  ): Promise<ChatMessage[]> {
    const threadId = message.threadId || message.messageId;
    const threadMessages = await this.messageRepository.findByThread(threadId);

    const history: ChatMessage[] = [];
    for (const msg of threadMessages) {
      if (msg.status === 'deleted') continue;
      history.push({
        role: msg.senderType === 'agent' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    history.push({ role: 'user', content: message.content });
    return history;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // --- Agent Execution Streaming Support ---

  /**
   * 发布流式更新事件
   * 用于实时推送 agent 执行过程中的增量更新
   *
   * @internal 为未来流式实现预留的方法
   * @param messageId - 消息 ID
   * @param eventType - 事件类型（thinking/tool_log/usage/status）
   * @param data - 事件数据
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async publishStreamingEvent(
    messageId: string,
    eventType: 'thinking' | 'tool_log' | 'usage' | 'status',
    data: Record<string, unknown>
  ): Promise<void> {
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: `message.streaming.${eventType}`,
      aggregateId: messageId,
      aggregateType: 'Message',
      occurredAt: new Date(),
      payload: {
        messageId,
        eventType,
        sequence: data.sequence,
        timestamp: new Date().toISOString(),
        data,
      },
    });
  }

  /**
   * 创建带执行元数据的消息
   * 用于流式响应场景，先创建消息再逐步更新内容
   *
   * @internal 为未来流式实现预留的方法
   * @param agent - Agent 实体
   * @param channel - Channel 实体
   * @param originalMessage - 原始消息
   * @param executionMode - 执行模式（API/CLI/SDK）
   * @returns 初始化了执行元数据的消息实体
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private createMessageWithMetadata(
    agent: AgentEntity,
    channel: ChannelEntity,
    originalMessage: MessageEntity,
    executionMode: 'API' | 'CLI' | 'SDK'
  ): MessageEntity {
    const message = MessageEntity.create({
      messageId: this.generateMessageId(),
      realmId: originalMessage.realmId,
      msgShortId: this.generateShortId(),
      senderId: agent.agentId,
      senderType: 'agent',
      senderName: agent.displayName,
      channelId: channel.channelId,
      channelName: channel.name,
      threadId: originalMessage.threadId || originalMessage.messageId,
      isThreadRoot: false,
      content: '_Generating response..._', // 占位符内容，后续通过流式更新替换
      contentType: 'text',
      contentFormat: 'markdown',
      attachments: [],
      mentions: [],
      references: [
        {
          refType: 'url',
          refId: originalMessage.messageId,
          refTitle: 'Reply to message',
        },
      ],
      status: 'sending', // 标记为发送中
      isEdited: false,
      editHistory: [],
      reactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      meta: {
        client: 'agent-runtime',
        isPinned: false,
        isImportant: false,
      },
    });

    // 初始化 agent 执行元数据
    return message.initAgentExecution(executionMode);
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType, aggregateId: event.aggregateId,
      });
    }
  }
}
