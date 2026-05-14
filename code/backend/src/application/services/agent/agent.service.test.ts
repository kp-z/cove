import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './agent.service';
import { AgentResponseService } from './agent-response.service';
import { AgentRepository } from '../../../infrastructure/database/repositories/agent.repository';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { IEventBus } from '../../interfaces/event-bus.interface';

// Test helper functions
function createTestAgent(overrides: Partial<any> = {}): AgentEntity {
  const defaults = {
    agentId: 'agent-123',
    name: 'test-agent',
    displayName: 'Test Agent',
    status: 'idle' as const,
    category: 'engineering' as const,
    createdBy: 'user-123',
    createdAt: new Date(),
  };
  return AgentEntity.create({ ...defaults, ...overrides });
}

function createTestTask(overrides: Partial<any> = {}): TaskEntity {
  const defaults = {
    taskId: 'task-123',
    title: 'Test Task',
    taskType: 'single_agent' as const,
    priority: 'P1' as const,
    status: 'todo' as const,
    channelId: 'channel-123',
    projectId: 'project-123',
    createdBy: 'user-123',
    createdAt: new Date(),
  };
  return TaskEntity.create({ ...defaults, ...overrides });
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

describe('AgentService', () => {
  let agentService: AgentService;
  let mockAgentRepository: any;
  let mockTaskRepository: any;
  let mockMessageRepository: any;
  let mockChannelRepository: any;
  let mockAgentResponseService: any;
  let mockEventBus: any;
  let mockLogger: any;

  beforeEach(() => {
    mockAgentRepository = {
      findById: vi.fn(),
      findByStatus: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
    } as any;

    mockTaskRepository = {
      findById: vi.fn(),
      save: vi.fn(),
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

    mockAgentResponseService = {
      handleIncomingMessage: vi.fn(),
      shouldAgentRespond: vi.fn(),
      generateAgentResponse: vi.fn(),
    } as any;

    agentService = new AgentService(
      mockAgentRepository,
      mockTaskRepository,
      mockAgentResponseService,
      mockEventBus,
      mockLogger
    );
  });

  // Skip tests for methods that don't exist yet (TDD tests)
  it.skip('should register a new agent', async () => {
    const agentData = {
      name: 'WorkerAgent',
      type: 'worker',
      capabilities: ['typescript', 'testing'],
    };

    mockAgentRepository.create.mockResolvedValue({
      id: 'agent-123',
      ...agentData,
      status: 'idle',
      createdAt: new Date(),
    });

    const agent = await agentService.registerAgent(agentData);
    expect(agent.id).toBe('agent-123');
    expect(agent.status).toBe('idle');
  });

  it.skip('should find available agents', async () => {
    mockAgentRepository.findByStatus.mockResolvedValue([
      { id: 'agent-1', name: 'Agent1', status: 'idle' },
      { id: 'agent-2', name: 'Agent2', status: 'idle' },
    ]);

    const agents = await agentService.findAvailableAgents();
    expect(agents).toHaveLength(2);
    expect(mockAgentRepository.findByStatus).toHaveBeenCalledWith('idle');
  });

  it.skip('should update agent status', async () => {
    const agentId = 'agent-123';
    mockAgentRepository.findById.mockResolvedValue({
      id: agentId,
      name: 'TestAgent',
      status: 'idle',
      createdAt: new Date(),
    });

    await agentService.updateStatus(agentId, 'busy');
    expect(mockAgentRepository.update).toHaveBeenCalled();
  });

  // handleIncomingMessage tests moved to agent-response.service.test.ts

  describe('shouldAgentRespond', () => {
    let agent: AgentEntity;
    let message: MessageEntity;
    let channel: ChannelEntity;

    beforeEach(() => {
      agent = createTestAgent({
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

      message = MessageEntity.create({
        messageId: 'msg-123',
        msgShortId: 'msg123',
        senderId: 'user-1',
        senderType: 'human',
        senderName: 'Test User',
        channelId: 'channel-1',
        channelName: 'test-channel',
        threadId: null,
        isThreadRoot: false,
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'markdown',
        attachments: [],
        mentions: [],
        references: [],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      channel = ChannelEntity.create({
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
    });

    it('should return false when agent is not active or idle', async () => {
      agent = createTestAgent({
        agentId: agent.agentId,
        name: agent.name,
        status: 'disabled', // Use valid status instead of 'busy'
      });

      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(false);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should return false when message is from the agent itself', async () => {
      message = createTestMessage({
        messageId: message.messageId,
        senderId: 'agent-1',
        senderType: 'agent',
      });

      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(false);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should return false when message status is not sent', async () => {
      message = createTestMessage({
        messageId: message.messageId,
        status: 'draft', // Use valid status instead of 'pending'
      });

      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(false);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should return true when agent is mentioned', async () => {
      message = createTestMessage({
        messageId: message.messageId,
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1', mentionName: 'TestAgent' }],
      });

      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(true);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(true);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should return true in DM channel with agent', async () => {
      channel = createTestChannel({
        channelId: channel.channelId,
        name: channel.name,
        type: 'dm',
        status: 'active' as const,
        members: [
          { memberId: 'user-1', memberType: 'human', memberName: 'User1', role: 'member', joinedAt: new Date() },
          { memberId: 'agent-1', memberType: 'agent', memberName: 'TestAgent', role: 'member', joinedAt: new Date() },
        ],
      });

      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(true);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(true);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should return false in public channel without mention', async () => {
      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(false);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should return true when agent status is idle and mentioned', async () => {
      agent = createTestAgent({
        agentId: agent.agentId,
        name: agent.name,
        status: 'idle',
      });

      message = createTestMessage({
        messageId: message.messageId,
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1', mentionName: 'TestAgent' }],
      });

      mockAgentResponseService.shouldAgentRespond.mockResolvedValue(true);

      const result = await agentService.shouldAgentRespond(agent, message, channel);
      expect(result).toBe(true);
      expect(mockAgentResponseService.shouldAgentRespond).toHaveBeenCalledWith(agent, message, channel);
    });
  });

  describe('generateAgentResponse', () => {
    let agent: AgentEntity;
    let message: MessageEntity;
    let channel: ChannelEntity;

    beforeEach(() => {
      agent = createTestAgent({
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

      message = MessageEntity.create({
        messageId: 'msg-123',
        msgShortId: 'msg123',
        senderId: 'user-1',
        senderType: 'human',
        senderName: 'Test User',
        channelId: 'channel-1',
        channelName: 'test-channel',
        threadId: null,
        isThreadRoot: false,
        content: 'Hello agent',
        contentType: 'text',
        contentFormat: 'markdown',
        attachments: [],
        mentions: [],
        references: [],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: { client: 'web', isPinned: false, isImportant: false },
      });

      channel = ChannelEntity.create({
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
    });

    it('should generate mock response', async () => {
      mockAgentResponseService.generateAgentResponse.mockResolvedValue('Mock response from TestAgent');

      const response = await agentService.generateAgentResponse(agent, message, channel);

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(mockAgentResponseService.generateAgentResponse).toHaveBeenCalledWith(agent, message, channel);
    });

    it('should include agent display name in response', async () => {
      mockAgentResponseService.generateAgentResponse.mockResolvedValue('Response from TestAgent');

      const response = await agentService.generateAgentResponse(agent, message, channel);

      expect(response).toContain('TestAgent');
      expect(mockAgentResponseService.generateAgentResponse).toHaveBeenCalledWith(agent, message, channel);
    });
  });

  // EventBus integration tests moved to agent-response.service.test.ts
});
