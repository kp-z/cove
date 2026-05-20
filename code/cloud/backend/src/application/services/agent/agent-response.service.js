"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentResponseService = void 0;
const message_entity_1 = require("../../../domain/models/message/message.entity");
const llm_adapter_factory_1 = require("../../../infrastructure/adapters/llm/llm-adapter-factory");
const agent_errors_1 = require("./agent.errors");
const llm_adapter_factory_2 = require("../../../infrastructure/adapters/llm/llm-adapter-factory");
const realm_context_store_1 = require("../../context/realm-context-store");
class AgentResponseService {
    agentRepository;
    messageRepository;
    channelRepository;
    eventBus;
    logger;
    configStore;
    adapterService;
    constructor(agentRepository, messageRepository, channelRepository, eventBus, logger, configStore, adapterService) {
        this.agentRepository = agentRepository;
        this.messageRepository = messageRepository;
        this.channelRepository = channelRepository;
        this.eventBus = eventBus;
        this.logger = logger;
        this.configStore = configStore;
        this.adapterService = adapterService;
    }
    async handleIncomingMessage(message) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Handling incoming message', {
            messageId: message.messageId,
            channelId: message.channelId,
            realmId: context.realmId,
        });
        const channel = await this.channelRepository.findById(message.channelId);
        if (!channel)
            return;
        const agentIds = channel.agentPool;
        if (agentIds.length === 0)
            return;
        for (const agentId of agentIds) {
            try {
                const agent = await this.agentRepository.findById(agentId);
                if (!agent)
                    continue;
                const shouldRespond = await this.shouldAgentRespond(agent, message, channel);
                if (!shouldRespond)
                    continue;
                await this.generateAndSendResponse(agent, message, channel);
            }
            catch (error) {
                this.logger.error('Error handling message for agent', error, {
                    agentId, messageId: message.messageId,
                });
            }
        }
    }
    async shouldAgentRespond(agent, message, channel) {
        if (agent.status !== 'active' && agent.status !== 'idle')
            return false;
        if (message.senderId === agent.agentId)
            return false;
        if (message.status !== 'sent')
            return false;
        const isMentioned = message.mentions.some((m) => m.mentionType === 'agent' && m.mentionId === agent.agentId);
        if (isMentioned)
            return true;
        if (channel.type === 'dm') {
            const isDmWithAgent = channel.members.some((m) => m.memberId === agent.agentId && m.memberType === 'agent');
            if (isDmWithAgent)
                return true;
        }
        return false;
    }
    async generateAgentResponse(agent, message, channel) {
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
                const factory = new llm_adapter_factory_2.LlmAdapterFactory(this.adapterService);
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
            if (!runtime.api?.api_key) {
                this.logger.warn('Agent has no api_key configured, using mock', { agentId: agent.agentId });
                return this.generateMockResponse(agent, message);
            }
            const persona = await this.configStore.getPersona(agent.agentId);
            const systemPrompt = this.buildSystemPrompt(persona);
            const history = await this.buildConversationHistory(message, channel);
            const adapter = await (0, llm_adapter_factory_1.createLlmAdapterFromConfig)(runtime, this.adapterService);
            const response = await adapter.generateResponse({
                systemPrompt,
                messages: history,
                maxTokens: runtime.model?.max_tokens,
            });
            return response;
        }
        catch (error) {
            this.logger.error('Failed to generate agent response', error, {
                agentId: agent.agentId, messageId: message.messageId,
            });
            throw new agent_errors_1.AgentResponseGenerationError(agent.agentId, message.messageId);
        }
    }
    async generateAndSendResponse(agent, originalMessage, channel) {
        const context = (0, realm_context_store_1.getRealmContext)();
        const responseContent = await this.generateAgentResponse(agent, originalMessage, channel);
        const responseMessage = message_entity_1.MessageEntity.create({
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
    buildSystemPrompt(persona) {
        const name = persona.name || 'Assistant';
        const title = persona.title || 'AI Assistant';
        const desc = persona.description || '';
        const lang = persona.language_style?.preferred_language || 'zh-CN';
        const verbosity = persona.language_style?.verbosity || 'concise';
        return `You are ${name}, a ${title}. ${desc}
Respond in ${lang}. Be ${verbosity}. Be helpful and professional.`;
    }
    async buildConversationHistory(message, _channel) {
        const threadId = message.threadId || message.messageId;
        const threadMessages = await this.messageRepository.findByThread(threadId);
        const history = [];
        for (const msg of threadMessages) {
            if (msg.status === 'deleted')
                continue;
            history.push({
                role: msg.senderType === 'agent' ? 'assistant' : 'user',
                content: msg.content,
            });
        }
        history.push({ role: 'user', content: message.content });
        return history;
    }
    generateMockResponse(agent, message) {
        const displayName = agent.displayName ?? agent.name;
        const responses = [
            `Hi! I'm ${displayName}. I received your message: "${message.content.substring(0, 50)}..."`,
            `Thanks for reaching out! As ${displayName}, I'm here to help.`,
            `Hello! ${displayName} here. I understand you said: "${message.content.substring(0, 50)}..."`,
            `Got it! I'm ${displayName} and I'm processing your request.`,
        ];
        const index = Math.floor(Math.random() * responses.length);
        return responses[index] ?? responses[0];
    }
    generateMessageId() {
        return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateShortId() {
        return Math.random().toString(36).substring(2, 10);
    }
    generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.eventType, aggregateId: event.aggregateId,
            });
        }
    }
}
exports.AgentResponseService = AgentResponseService;
