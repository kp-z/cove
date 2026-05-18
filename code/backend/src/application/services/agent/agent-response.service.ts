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
    this.logger.info('Handling incoming message', {
      messageId: message.messageId,
      channelId: message.channelId,
    });

    const channel = await this.channelRepository.findById(message.channelId);
    if (!channel) return;

    const agentIds = channel.agentPool;
    if (agentIds.length === 0) return;

    for (const agentId of agentIds) {
      try {
        const agent = await this.agentRepository.findById(agentId);
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
      if (!this.configStore) {
        return this.generateMockResponse(agent, message);
      }

      const runtime = await this.configStore.getRuntime(agent.agentId);

      // New adapter system: check if adapter_id is present
      if (runtime.adapter_id && this.adapterService) {
        this.logger.info('Using new adapter system', {
          agentId: agent.agentId,
          adapterId: runtime.adapter_id
        });

        const persona = await this.configStore.getPersona(agent.agentId);
        const systemPrompt = this.buildSystemPrompt(persona);
        const history = await this.buildConversationHistory(message, channel);

        const factory = new LlmAdapterFactory(this.adapterService);
        // Use agent's createdBy as actorId, with skipPermissionCheck=true for internal agent operations
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
        this.logger.warn('Agent has no api_key configured, using mock', { agentId: agent.agentId });
        return this.generateMockResponse(agent, message);
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
    const responseContent = await this.generateAgentResponse(agent, originalMessage, channel);

    const responseMessage = MessageEntity.create({
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

    await this.messageRepository.save(responseMessage);

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

  private generateMockResponse(agent: AgentEntity, message: MessageEntity): string {
    const displayName = agent.displayName ?? agent.name;
    const responses = [
      `Hi! I'm ${displayName}. I received your message: "${message.content.substring(0, 50)}..."`,
      `Thanks for reaching out! As ${displayName}, I'm here to help.`,
      `Hello! ${displayName} here. I understand you said: "${message.content.substring(0, 50)}..."`,
      `Got it! I'm ${displayName} and I'm processing your request.`,
    ];
    const index = Math.floor(Math.random() * responses.length);
    return responses[index] ?? responses[0]!;
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
