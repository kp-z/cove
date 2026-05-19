/**
 * AgentService 单元测试 - Response功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentService } from './agent.service';
import { AgentCrudService } from './agent-crud.service';
import { AgentQueryService } from './agent-query.service';
import { AgentConfigService } from './agent-config.service';
import { AgentTaskService } from './agent-task.service';
import { AgentResponseService } from './agent-response.service';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';

describe('AgentService', () => {
  let agentService: AgentService;
  let mockCrudService: AgentCrudService;
  let mockQueryService: AgentQueryService;
  let mockConfigService: AgentConfigService;
  let mockTaskService: AgentTaskService;
  let mockResponseService: AgentResponseService;

  beforeEach(() => {
    mockCrudService = {
      createAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
    } as unknown as AgentCrudService;

    mockQueryService = {
      getAgentById: vi.fn(),
      getAgentDetail: vi.fn(),
      listAgents: vi.fn(),
      getAgentsByStatus: vi.fn(),
      getAvailableAgents: vi.fn(),
    } as unknown as AgentQueryService;

    mockConfigService = {
      updateRuntime: vi.fn(),
      updatePersona: vi.fn(),
      updateSkills: vi.fn(),
      updateTools: vi.fn(),
      updateTriggers: vi.fn(),
    } as unknown as AgentConfigService;

    mockTaskService = {
      assignTask: vi.fn(),
    } as unknown as AgentTaskService;

    mockResponseService = {
      shouldAgentRespond: vi.fn(),
      generateAgentResponse: vi.fn(),
    } as unknown as AgentResponseService;

    agentService = new AgentService(
      mockCrudService,
      mockQueryService,
      mockConfigService,
      mockTaskService,
      mockResponseService
    );
  });

  describe('shouldAgentRespond', () => {
    it('should return false when agent is not active or idle', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'error',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectIds: ['project-1'],
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(false);
    });

    it('should return false when message is from the agent itself', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'agent-1',
        senderType: 'agent',
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectIds: ['project-1'],
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(false);
    });

    it('should return false when message status is not sent', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'deleted',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectIds: ['project-1'],
        status: 'active',
        members: [],
        agentPool: [],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(false);
    });

    it('should return true when agent is mentioned', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@test-agent Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1' }],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectIds: ['project-1'],
        status: 'active',
        members: [],
        agentPool: ['agent-1'],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(true);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(true);
    });

    it('should return true in DM channel with agent', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'dm-user-1-agent-1',
        type: 'dm',
        projectIds: ['project-1'],
        status: 'active',
        members: [
          { memberId: 'user-1', memberType: 'human', role: 'member', joinedAt: new Date() },
          { memberId: 'agent-1', memberType: 'agent', role: 'member', joinedAt: new Date() }
        ],
        agentPool: ['agent-1'],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(true);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(true);
    });

    it('should return false in public channel without mention', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectIds: ['project-1'],
        status: 'active',
        members: [],
        agentPool: ['agent-1'],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(false);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(false);
    });

    it('should return true when agent status is idle and mentioned', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'idle',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: '@test-agent Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [{ mentionType: 'agent', mentionId: 'agent-1' }],
        reactions: [],
      });

      const mockChannel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'general',
        type: 'public',
        projectIds: ['project-1'],
        status: 'active',
        members: [],
        agentPool: ['agent-1'],
        createdAt: new Date(),
        createdBy: 'user-1',
        meta: { tags: [] },
      });

      vi.mocked(mockResponseService.shouldAgentRespond).mockResolvedValue(true);

      const result = await agentService.shouldAgentRespond(mockAgent, mockMessage, mockChannel);

      expect(result).toBe(true);
    });
  });

  describe('generateAgentResponse', () => {
    it('should generate mock response', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Hello',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockResponseService.generateAgentResponse).mockResolvedValue(
        'Hello! I am Test Agent.'
      );

      const result = await agentService.generateAgentResponse(mockAgent, mockMessage);

      expect(result).toBe('Hello! I am Test Agent.');
    });

    it('should include agent display name in response', async () => {
      const mockAgent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'test-agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['project-1'],
        projectIds: ['project-1'],
        status: 'active',
        createdAt: new Date(),
        createdBy: 'user-1',
      });

      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        content: 'Who are you?',
        contentType: 'text',
        contentFormat: 'plain',
        status: 'sent',
        createdAt: new Date(),
        mentions: [],
        reactions: [],
      });

      vi.mocked(mockResponseService.generateAgentResponse).mockResolvedValue(
        'I am Test Agent, your AI assistant.'
      );

      const result = await agentService.generateAgentResponse(mockAgent, mockMessage);

      expect(result).toContain('Test Agent');
    });
  });
});
