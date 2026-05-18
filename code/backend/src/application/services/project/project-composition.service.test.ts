import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectCompositionService } from './project-composition.service';
import { ProjectEntity } from '../../../domain/models/project/project.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { ProjectNotFoundError, ProjectNotArchivedError } from './project.service';
import { AgentNotFoundError } from '../agent/agent.errors';
import { ChannelNotFoundError } from '../channel/channel.errors';
import {
  IProjectRepository,
  IAgentRepository,
  IChannelRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

describe('ProjectCompositionService', () => {
  let service: ProjectCompositionService;
  let mockProjectRepository: IProjectRepository;
  let mockAgentRepository: IAgentRepository;
  let mockChannelRepository: IChannelRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'test-user-id');

    mockProjectRepository = {
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByStatus: vi.fn(),
    } as unknown as IProjectRepository;

    mockAgentRepository = {
      findById: vi.fn(),
    } as unknown as IAgentRepository;

    mockChannelRepository = {
      findById: vi.fn(),
    } as unknown as IChannelRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    service = new ProjectCompositionService(
      mockProjectRepository,
      mockAgentRepository,
      mockChannelRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('addAgentToProject', () => {
    it('should add agent to project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      const agent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'Test Agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['proj-1'],
        createdBy: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(agent);

      const result = await runWithContext(testContext, async () => {
        return await service.addAgentToProject({
          projectId: 'proj-1',
          agentId: 'agent-1',
        });
      });

      expect(result.agentIds).toContain('agent-1');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.agent_added',
        })
      );
    });

    it('should return project unchanged if agent already exists', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: ['agent-1'],
        channelIds: [],
        createdAt: new Date(),
      });

      const agent = AgentEntity.create({
        agentId: 'agent-1',
        name: 'Test Agent',
        displayName: 'Test Agent',
        scope: 'project' as const,
        projectIds: ['proj-1'],
        createdBy: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(agent);

      const result = await runWithContext(testContext, async () => {
        return await service.addAgentToProject({
          projectId: 'proj-1',
          agentId: 'agent-1',
        });
      });

      expect(result).toBe(project);
      expect(mockProjectRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return await service.addAgentToProject({ projectId: 'nonexistent', agentId: 'agent-1' });
        })
      ).rejects.toThrow(ProjectNotFoundError);
    });

    it('should throw AgentNotFoundError when agent not found', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return await service.addAgentToProject({ projectId: 'proj-1', agentId: 'nonexistent' });
        })
      ).rejects.toThrow(AgentNotFoundError);
    });
  });

  describe('removeAgentFromProject', () => {
    it('should remove agent from project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: ['agent-1'],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await runWithContext(testContext, async () => {
        return await service.removeAgentFromProject({
          projectId: 'proj-1',
          agentId: 'agent-1',
        });
      });

      expect(result.agentIds).not.toContain('agent-1');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.agent_removed',
        })
      );
    });

    it('should return project unchanged if agent not in project', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await runWithContext(testContext, async () => {
        return await service.removeAgentFromProject({
          projectId: 'proj-1',
          agentId: 'agent-1',
        });
      });

      expect(result).toBe(project);
      expect(mockProjectRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('addChannelToProject', () => {
    it('should add channel to project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      const result = await runWithContext(testContext, async () => {
        return await service.addChannelToProject({
          projectId: 'proj-1',
          channelId: 'channel-1',
        });
      });

      expect(result.channelIds).toContain('channel-1');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.channel_added',
        })
      );
    });

    it('should return project unchanged if channel already exists', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: ['channel-1'],
        createdAt: new Date(),
      });

      const channel = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Test Channel',
        type: 'public',
        status: 'active',
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(channel);

      const result = await runWithContext(testContext, async () => {
        return await service.addChannelToProject({
          projectId: 'proj-1',
          channelId: 'channel-1',
        });
      });

      expect(result).toBe(project);
      expect(mockProjectRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ChannelNotFoundError when channel not found', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockChannelRepository.findById).mockResolvedValue(null);

      await expect(
        service.addChannelToProject({ projectId: 'proj-1', channelId: 'nonexistent' })
      ).rejects.toThrow(ChannelNotFoundError);
    });
  });

  describe('removeChannelFromProject', () => {
    it('should remove channel from project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: ['channel-1'],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await service.removeChannelFromProject({
        projectId: 'proj-1',
        channelId: 'channel-1',
      });

      expect(result.channelIds).not.toContain('channel-1');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.channel_removed',
        })
      );
    });

    it('should return project unchanged if channel not in project', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await service.removeChannelFromProject({
        projectId: 'proj-1',
        channelId: 'channel-1',
      });

      expect(result).toBe(project);
      expect(mockProjectRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('archiveProject', () => {
    it('should archive project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await service.archiveProject('proj-1');

      expect(result.status).toBe('archived');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.archived',
        })
      );
    });
  });

  describe('activateProject', () => {
    it('should activate project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'archived',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      const result = await service.activateProject('proj-1');

      expect(result.status).toBe('active');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.activated',
        })
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete archived project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'archived',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      await service.deleteProject('proj-1');

      expect(mockProjectRepository.delete).toHaveBeenCalledWith('proj-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.deleted',
        })
      );
    });

    it('should throw ProjectNotArchivedError when deleting active project', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);

      await expect(service.deleteProject('proj-1')).rejects.toThrow(
        ProjectNotArchivedError
      );
    });
  });

  describe('getProjectAgents', () => {
    it('should return all agents in project', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: ['agent-1', 'agent-2'],
        channelIds: [],
        createdAt: new Date(),
      });

      const agent1 = AgentEntity.create({
        agentId: 'agent-1',
        name: 'Agent 1',
        displayName: 'Agent 1',
        scope: 'project' as const,
        projectIds: ['proj-1'],
        createdBy: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      const agent2 = AgentEntity.create({
        agentId: 'agent-2',
        name: 'Agent 2',
        displayName: 'Agent 2',
        scope: 'project' as const,
        projectIds: ['proj-1'],
        createdBy: 'user-1',
        status: 'active',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockAgentRepository.findById)
        .mockResolvedValueOnce(agent1)
        .mockResolvedValueOnce(agent2);

      const result = await service.getProjectAgents('proj-1');

      expect(result).toHaveLength(2);
      expect(result).toContain(agent1);
      expect(result).toContain(agent2);
    });
  });

  describe('getProjectChannels', () => {
    it('should return all channels in project', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: ['channel-1', 'channel-2'],
        createdAt: new Date(),
      });

      const channel1 = ChannelEntity.create({
        channelId: 'channel-1',
        name: 'Channel 1',
        type: 'public',
        status: 'active',
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      const channel2 = ChannelEntity.create({
        channelId: 'channel-2',
        name: 'Channel 2',
        type: 'public',
        status: 'active',
        members: [],
        createdBy: 'user-1',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockChannelRepository.findById)
        .mockResolvedValueOnce(channel1)
        .mockResolvedValueOnce(channel2);

      const result = await service.getProjectChannels('proj-1');

      expect(result).toHaveLength(2);
      expect(result).toContain(channel1);
      expect(result).toContain(channel2);
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        displayName: 'Test Project',
        description: 'Test',
        visibility: 'private',
        status: 'active',
        agentIds: [],
        channelIds: [],
        createdAt: new Date(),
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(project);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      const result = await service.archiveProject('proj-1');

      expect(result.status).toBe('archived');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'project.archived',
        })
      );
    });
  });
});
