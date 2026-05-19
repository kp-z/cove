import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentResponseService } from './agent-response.service';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

// Test helper functions
function createTestAgent(overrides: Partial<any> = {}): AgentEntity {
  const defaults = {
    agentId: 'agent-123',
    name: 'test-agent',
    displayName: 'Test Agent',
    status: 'idle' as const,
    scope: 'project' as const,
        projectIds: ['project-1'],
    createdBy: 'user-123',
    createdAt: new Date(),
  };
  return AgentEntity.create({ ...defaults, ...overrides });
}

function createTestMessage(overrides: Partial<any> = {}): MessageEntity {
  const defaults = {
    messageId: 'msg-123',
    msgShortId: 'msg123',
    senderId: 'user-1',
    senderType: 'human' as const,
    senderName: 'Test User',
    channelId: 'channel-1',
    channelName: 'test-channel',
    threadId: null,
    isThreadRoot: false,
    content: 'Hello',
    contentType: 'text' as const,
    contentFormat: 'markdown' as const,
    attachments: [],
    mentions: [],
    references: [],
    status: 'sent' as const,
    isEdited: false,
    editHistory: [],
    reactions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    meta: { client: 'web', isPinned: false, isImportant: false },
  };
  return MessageEntity.create({ ...defaults, ...overrides });
}

function createTestChannel(overrides: Partial<any> = {}): ChannelEntity {
  const defaults = {
    channelId: 'channel-1',
    name: 'test-channel',
    displayName: 'Test Channel',
    description: 'Test channel',
    type: 'public' as const,
    status: 'active' as const,
    projectId: 'project-1',
    agentPool: [],
    members: [],
    taskPool: [],
    conversationPool: [],
    workspace: {
      root: '/workspace/channel-1',
      sharedFiles: '/workspace/channel-1/shared',
      attachments: '/workspace/channel-1/attachments',
    },
    communicationRules: {
      allowMentions: true,
      allowThreads: true,
      allowAttachments: true,
      maxMessageLength: 10000,
    },
    meta: {
      tags: [],
      category: 'general',
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'user-1', type: 'human' as const },
    },
  };
  return ChannelEntity.create({ ...defaults, ...overrides });
}

describe('AgentResponseService', () => {
  let service: AgentResponseService;
  let mockAgentRepository: any;
  let mockMessageRepository: any;
  let mockChannelRepository: any;
  let mockEventBus: any;
  let mockLogger: any;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'test-user-id');
    mockAgentRepository = {
      findById: vi.fn(),
      findByStatus: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    } as any;

    mockMessageRepository = {
      save: vi.fn(),
      findById: vi.fn(),
    } as any;

    mockChannelRepository = {
      findById: vi.fn(),
    } as any;

    mockEventBus = {
      publish: vi.fn(),
      publishBatch: vi.fn(),
      subscribe: vi.fn(),
      subscribeMany: vi.fn(),
      unsubscribe: vi.fn(),
      clear: vi.fn(),
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
      setLevel: vi.fn(),
    } as any;

    service = new AgentResponseService(
      mockAgentRepository,
      mockMessageRepository,
      mockChannelRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('handleIncomingMessage', () => {
    it('should handle message when channel has agents', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-123',
        msgShortId: 'msg123',
        senderId: 'user-1',
        senderType: 'human',
        senderName: 'Test User',
        channelId: 'channel-1',
        channelName: 'test-channel',
        threadId: null,
        isThreadRoot: false,
        content: 'Hello @agent',
        contentType: 'text',
        contentFormat: 'markdown',
        attachments: [],
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1', mentionName: 'TestAgent' }],
        references: [],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'test-channel',
        displayName: 'Test Channel',
        description: 'Test channel',
        type: 'public',
        status: 'active' as const,
        projectId: 'project-1',
        agentPool: ['agent-1'],
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { isArchived: false },
      });

      const agent = createTestAgent({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'TestAgent',
        description: 'Test agent',
        type: 'assistant',
        status: 'active',
        capabilities: ['chat'],
        config: {},
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      mockChannelRepository.findById.mockResolvedValue(channel);
      mockAgentRepository.findById.mockResolvedValue(agent);
      mockMessageRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      await runWithContext(testContext, async () => {
        await service.handleIncomingMessage(message);
      });

      expect(mockChannelRepository.findById).toHaveBeenCalledWith('channel-1');
      expect(mockAgentRepository.findById).toHaveBeenCalledWith('agent-1');
      expect(mockMessageRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should skip when channel not found', async () => {
      const message = createTestMessage({
        channelId: 'channel-1',
      });

      mockChannelRepository.findById.mockResolvedValue(null);

      await runWithContext(testContext, async () => {
        await service.handleIncomingMessage(message);
      });

      expect(mockChannelRepository.findById).toHaveBeenCalledWith('channel-1');
      expect(mockAgentRepository.findById).not.toHaveBeenCalled();
    });

    it('should skip when channel has no agents', async () => {
      const message = createTestMessage({
        channelId: 'channel-1',
      });

      const channel = createTestChannel({
        channelId: 'channel-1',
        agentPool: [],
      });

      mockChannelRepository.findById.mockResolvedValue(channel);

      await runWithContext(testContext, async () => {
        await service.handleIncomingMessage(message);
      });

      expect(mockChannelRepository.findById).toHaveBeenCalledWith('channel-1');
      expect(mockAgentRepository.findById).not.toHaveBeenCalled();
    });

    it('should continue processing other agents when one fails', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-123',
        msgShortId: 'msg123',
        senderId: 'user-1',
        senderType: 'human',
        senderName: 'Test User',
        channelId: 'channel-1',
        channelName: 'test-channel',
        threadId: null,
        isThreadRoot: false,
        content: 'Hello @agent1 @agent2',
        contentType: 'text',
        contentFormat: 'markdown',
        attachments: [],
        mentions: [
          { mentionType: 'agent', mentionId: 'agent-1', mentionName: 'Agent1' },
          { mentionType: 'agent', mentionId: 'agent-2', mentionName: 'Agent2' },
        ],
        references: [],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'test-channel',
        displayName: 'Test Channel',
        description: 'Test channel',
        type: 'public',
        status: 'active' as const,
        projectId: 'project-1',
        agentPool: ['agent-1', 'agent-2'],
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { isArchived: false },
      });

      const agent1 = createTestAgent({
        agentId: 'agent-1',
        name: 'agent1',
        displayName: 'Agent1',
        description: 'Agent 1',
        type: 'assistant',
        status: 'active',
        capabilities: ['chat'],
        config: {},
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      const agent2 = createTestAgent({
        agentId: 'agent-2',
        name: 'agent2',
        displayName: 'Agent2',
        description: 'Agent 2',
        type: 'assistant',
        status: 'active',
        capabilities: ['chat'],
        config: {},
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      mockChannelRepository.findById.mockResolvedValue(channel);
      mockAgentRepository.findById
        .mockResolvedValueOnce(agent1)
        .mockResolvedValueOnce(agent2);
      mockMessageRepository.save
        .mockRejectedValueOnce(new Error('Save failed'))
        .mockResolvedValueOnce(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      await runWithContext(testContext, async () => {
        await service.handleIncomingMessage(message);
      });

      expect(mockAgentRepository.findById).toHaveBeenCalledTimes(2);
      expect(mockMessageRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('shouldAgentRespond', () => {
    it('should return true when agent is mentioned', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', status: 'active' });
      const message = createTestMessage({
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1', mentionName: 'Agent' }],
        status: 'sent',
      });
      const channel = createTestChannel();

      const result = await runWithContext(testContext, async () => {
        return await service.shouldAgentRespond(agent, message, channel);
      });

      expect(result).toBe(true);
    });

    it('should return false when agent is not active or idle', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', status: 'disabled' });
      const message = createTestMessage({ status: 'sent' });
      const channel = createTestChannel();

      const result = await runWithContext(testContext, async () => {
        return await service.shouldAgentRespond(agent, message, channel);
      });

      expect(result).toBe(false);
    });

    it('should return false when message is from the agent itself', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', status: 'active' });
      const message = createTestMessage({
        senderId: 'agent-1',
        status: 'sent',
      });
      const channel = createTestChannel();

      const result = await runWithContext(testContext, async () => {
        return await service.shouldAgentRespond(agent, message, channel);
      });

      expect(result).toBe(false);
    });

    it('should return false when message status is not sent', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', status: 'active' });
      const message = createTestMessage({ status: 'deleted' });
      const channel = createTestChannel();

      const result = await runWithContext(testContext, async () => {
        return await service.shouldAgentRespond(agent, message, channel);
      });

      expect(result).toBe(false);
    });

    it('should return true for DM channel with agent as member', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', status: 'active' });
      const message = createTestMessage({ status: 'sent' });
      const channel = createTestChannel({
        type: 'dm',
        members: [
          { memberId: 'agent-1', memberType: 'agent', role: 'member', joinedAt: new Date() },
          { memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() },
        ],
      });

      const result = await runWithContext(testContext, async () => {
        return await service.shouldAgentRespond(agent, message, channel);
      });

      expect(result).toBe(true);
    });

    it('should return false for DM channel without agent as member', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', status: 'active' });
      const message = createTestMessage({ status: 'sent' });
      const channel = createTestChannel({
        type: 'dm',
        members: [
          { memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() },
          { memberId: 'user-2', memberType: 'human', role: 'member', joinedAt: new Date() },
        ],
      });

      const result = await runWithContext(testContext, async () => {
        return await service.shouldAgentRespond(agent, message, channel);
      });

      expect(result).toBe(false);
    });
  });

  describe('generateAgentResponse', () => {
    it('should generate mock response when no config store', async () => {
      const agent = createTestAgent({ agentId: 'agent-1', displayName: 'TestAgent' });
      const message = createTestMessage({ content: 'Hello agent' });
      const channel = createTestChannel();

      const response = await runWithContext(testContext, async () => {
        return await service.generateAgentResponse(agent, message, channel);
      });

      expect(response).toContain('TestAgent');
      expect(typeof response).toBe('string');
    });

    it('should generate mock response when agent has no api_key', async () => {
      const mockConfigStore = {
        getRuntime: vi.fn().mockResolvedValue({
          api: { provider: 'anthropic' },
          model: { max_tokens: 1000 },
        }),
        getPersona: vi.fn(),
      };

      const serviceWithConfig = new AgentResponseService(
        mockAgentRepository,
        mockMessageRepository,
        mockChannelRepository,
        mockEventBus,
        mockLogger,
        mockConfigStore as any
      );

      const agent = createTestAgent({ agentId: 'agent-1', displayName: 'TestAgent' });
      const message = createTestMessage({ content: 'Hello' });
      const channel = createTestChannel();

      const response = await serviceWithConfig.generateAgentResponse(agent, message, channel);

      expect(response).toContain('TestAgent');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Agent has no api_key configured, using mock',
        expect.any(Object)
      );
    });
  });

  describe('EventBus integration', () => {
    it('should publish event when message is sent', async () => {
      const message = MessageEntity.create({
        messageId: 'msg-123',
        msgShortId: 'msg123',
        senderId: 'user-1',
        senderType: 'human',
        senderName: 'Test User',
        channelId: 'channel-1',
        channelName: 'test-channel',
        threadId: null,
        isThreadRoot: false,
        content: 'Hello @agent',
        contentType: 'text',
        contentFormat: 'markdown',
        attachments: [],
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1', mentionName: 'TestAgent' }],
        references: [],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'test-channel',
        displayName: 'Test Channel',
        description: 'Test channel',
        type: 'public',
        status: 'active' as const,
        projectId: 'project-1',
        agentPool: ['agent-1'],
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { isArchived: false },
      });

      const agent = createTestAgent({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'TestAgent',
        description: 'Test agent',
        type: 'assistant',
        status: 'active',
        capabilities: ['chat'],
        config: {},
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      mockChannelRepository.findById.mockResolvedValue(channel);
      mockAgentRepository.findById.mockResolvedValue(agent);
      mockMessageRepository.save.mockResolvedValue(undefined);
      mockEventBus.publish.mockResolvedValue(undefined);

      await runWithContext(testContext, async () => {
        await service.handleIncomingMessage(message);
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'message.sent',
          aggregateType: 'Message',
        })
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'agent.response_generated',
          aggregateType: 'Agent',
        })
      );
    });
  });
});
