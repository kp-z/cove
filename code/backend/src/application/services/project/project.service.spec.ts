import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ProjectService,
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectNotFoundError,
  ProjectNotArchivedError,
} from './project.service';
import { ProjectEntity } from '../../../domain/models/project/project.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IProjectRepository,
  IAgentRepository,
  IChannelRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockProjectRepository: IProjectRepository;
  let mockAgentRepository: IAgentRepository;
  let mockChannelRepository: IChannelRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockProjectRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByOwner: vi.fn(),
      findByStatus: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockAgentRepository = {
      findById: vi.fn(),
    } as any;

    mockChannelRepository = {
      findById: vi.fn(),
    } as any;

    mockEventBus = {
      publish: vi.fn(),
    } as any;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as any;

    service = new ProjectService(
      mockProjectRepository,
      mockAgentRepository,
      mockChannelRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      const dto: CreateProjectDTO = {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-123',
        tags: ['tag1', 'tag2'],
      };

      const result = await service.createProject(dto);

      expect(result).toBeInstanceOf(ProjectEntity);
      expect(result.name).toBe(dto.name);
      expect(result.description).toBe(dto.description);
      expect(result.ownerId).toBe(dto.ownerId);
      expect(result.status).toBe('active');
      expect(mockProjectRepository.save).toHaveBeenCalledWith(result);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.created',
          aggregateType: 'Project',
        })
      );
    });

    it('should create project without optional fields', async () => {
      const dto: CreateProjectDTO = {
        name: 'Minimal Project',
        ownerId: 'user-123',
      };

      const result = await service.createProject(dto);

      expect(result.name).toBe(dto.name);
      expect(result.ownerId).toBe(dto.ownerId);
      expect(mockProjectRepository.save).toHaveBeenCalled();
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      const mockProject = createTestProject();
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      const result = await service.getProjectById('project-123');

      expect(result).toBe(mockProject);
      expect(mockProjectRepository.findById).toHaveBeenCalledWith('project-123');
    });

    it('should throw ProjectNotFoundError when project not found', async () => {
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(null);

      await expect(service.getProjectById('nonexistent')).rejects.toThrow(
        ProjectNotFoundError
      );
    });
  });

  describe('getAllProjects', () => {
    it('should return all projects', async () => {
      const mockProjects = [createTestProject(), createTestProject()];
      vi.mocked(mockProjectRepository.findAll).mockResolvedValue(mockProjects);

      const result = await service.getAllProjects();

      expect(result).toEqual(mockProjects);
      expect(mockProjectRepository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no projects exist', async () => {
      vi.mocked(mockProjectRepository.findAll).mockResolvedValue([]);

      const result = await service.getAllProjects();

      expect(result).toEqual([]);
    });
  });

  describe('getProjectsByOwner', () => {
    it('should return projects for specific owner', async () => {
      const mockProjects = [createTestProject({ ownerId: 'user-123' })];
      vi.mocked(mockProjectRepository.findByOwner).mockResolvedValue(mockProjects);

      const result = await service.getProjectsByOwner('user-123');

      expect(result).toEqual(mockProjects);
      expect(mockProjectRepository.findByOwner).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getProjectsByStatus', () => {
    it('should return projects with specific status', async () => {
      const mockProjects = [createTestProject({ status: 'active' })];
      vi.mocked(mockProjectRepository.findByStatus).mockResolvedValue(mockProjects);

      const result = await service.getProjectsByStatus('active');

      expect(result).toEqual(mockProjects);
      expect(mockProjectRepository.findByStatus).toHaveBeenCalledWith('active');
    });
  });

  describe('updateProject', () => {
    it('should update project name', async () => {
      const mockProject = createTestProject({ name: 'Old Name' });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      const dto: UpdateProjectDTO = { name: 'New Name' };
      const result = await service.updateProject('project-123', dto);

      expect(result.name).toBe('New Name');
      expect(mockProjectRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.updated',
        })
      );
    });

    it('should update project description', async () => {
      const mockProject = createTestProject({ description: 'Old Description' });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      const dto: UpdateProjectDTO = { description: 'New Description' };
      const result = await service.updateProject('project-123', dto);

      expect(result.description).toBe('New Description');
      expect(mockProjectRepository.update).toHaveBeenCalled();
    });

    it('should update multiple fields', async () => {
      const mockProject = createTestProject();
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      const dto: UpdateProjectDTO = {
        name: 'New Name',
        description: 'New Description',
      };
      const result = await service.updateProject('project-123', dto);

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New Description');
    });

    it('should throw error when project not found', async () => {
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(null);

      await expect(
        service.updateProject('nonexistent', { name: 'New Name' })
      ).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('archiveProject', () => {
    it('should archive project successfully', async () => {
      const mockProject = createTestProject({ status: 'active' });
      const archivedProject = createTestProject({ status: 'archived' });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);
      vi.spyOn(mockProject, 'archive').mockReturnValue(archivedProject);

      const result = await service.archiveProject('project-123');

      expect(result.status).toBe('archived');
      expect(mockProjectRepository.update).toHaveBeenCalledWith(archivedProject);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.archived',
        })
      );
    });

    it('should throw error when project not found', async () => {
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(null);

      await expect(service.archiveProject('nonexistent')).rejects.toThrow(
        ProjectNotFoundError
      );
    });
  });

  describe('activateProject', () => {
    it('should activate project successfully', async () => {
      const mockProject = createTestProject({ status: 'archived' });
      const activatedProject = createTestProject({ status: 'active' });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);
      vi.spyOn(mockProject, 'activate').mockReturnValue(activatedProject);

      const result = await service.activateProject('project-123');

      expect(result.status).toBe('active');
      expect(mockProjectRepository.update).toHaveBeenCalledWith(activatedProject);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.activated',
        })
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete archived project successfully', async () => {
      const mockProject = createTestProject({ status: 'archived' });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      await service.deleteProject('project-123');

      expect(mockProjectRepository.delete).toHaveBeenCalledWith('project-123');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'project.deleted',
        })
      );
    });

    it('should throw error when project is not archived', async () => {
      const mockProject = createTestProject({ status: 'active' });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      await expect(service.deleteProject('project-123')).rejects.toThrow(
        ProjectNotArchivedError
      );
    });

    it('should throw error when project not found', async () => {
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(null);

      await expect(service.deleteProject('nonexistent')).rejects.toThrow(
        ProjectNotFoundError
      );
    });
  });

  describe('getProjectAgents', () => {
    it('should return all agents in project', async () => {
      const mockAgent1 = createTestAgent('agent-1');
      const mockAgent2 = createTestAgent('agent-2');
      const mockProject = createTestProject({
        agentIds: ['agent-1', 'agent-2'],
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(mockAgentRepository.findById)
        .mockResolvedValueOnce(mockAgent1)
        .mockResolvedValueOnce(mockAgent2);

      const result = await service.getProjectAgents('project-123');

      expect(result).toHaveLength(2);
      expect(result).toContain(mockAgent1);
      expect(result).toContain(mockAgent2);
    });

    it('should skip agents that are not found', async () => {
      const mockAgent1 = createTestAgent('agent-1');
      const mockProject = createTestProject({
        agentIds: ['agent-1', 'agent-2'],
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(mockAgentRepository.findById)
        .mockResolvedValueOnce(mockAgent1)
        .mockResolvedValueOnce(null);

      const result = await service.getProjectAgents('project-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockAgent1);
    });

    it('should return empty array when project has no agents', async () => {
      const mockProject = createTestProject({ agentIds: [] });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      const result = await service.getProjectAgents('project-123');

      expect(result).toEqual([]);
    });
  });

  describe('getProjectChannels', () => {
    it('should return all channels in project', async () => {
      const mockChannel1 = createTestChannel('channel-1');
      const mockChannel2 = createTestChannel('channel-2');
      const mockProject = createTestProject({
        channelIds: ['channel-1', 'channel-2'],
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(mockChannelRepository.findById)
        .mockResolvedValueOnce(mockChannel1)
        .mockResolvedValueOnce(mockChannel2);

      const result = await service.getProjectChannels('project-123');

      expect(result).toHaveLength(2);
      expect(result).toContain(mockChannel1);
      expect(result).toContain(mockChannel2);
    });

    it('should skip channels that are not found', async () => {
      const mockChannel1 = createTestChannel('channel-1');
      const mockProject = createTestProject({
        channelIds: ['channel-1', 'channel-2'],
      });

      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);
      vi.mocked(mockChannelRepository.findById)
        .mockResolvedValueOnce(mockChannel1)
        .mockResolvedValueOnce(null);

      const result = await service.getProjectChannels('project-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockChannel1);
    });

    it('should return empty array when project has no channels', async () => {
      const mockProject = createTestProject({ channelIds: [] });
      vi.mocked(mockProjectRepository.findById).mockResolvedValue(mockProject);

      const result = await service.getProjectChannels('project-123');

      expect(result).toEqual([]);
    });
  });

  describe('event publishing error handling', () => {
    it('should not throw when event publishing fails', async () => {
      const dto: CreateProjectDTO = {
        name: 'Test Project',
        ownerId: 'user-123',
      };

      vi.mocked(mockEventBus.publish).mockRejectedValue(
        new Error('Event bus error')
      );

      await expect(service.createProject(dto)).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });
});

// --- Test Helpers ---

function createTestProject(overrides?: Partial<ProjectEntity>): ProjectEntity {
  const project = ProjectEntity.create({
    projectId: 'project-123',
    name: 'Test Project',
    displayName: 'Test Project',
    description: 'Test Description',
    ownerId: 'user-123',
    visibility: 'private',
    status: 'active',
    agentIds: [],
    channelIds: [],
    createdAt: new Date(),
    ...overrides,
  });

  // Add domain methods - avoid recursion by creating simple mock objects
  project.archive = vi.fn().mockReturnValue({
    ...project,
    status: 'archived',
  });
  project.activate = vi.fn().mockReturnValue({
    ...project,
    status: 'active',
  });

  return project;
}

function createTestAgent(agentId: string): AgentEntity {
  return AgentEntity.create({
    agentId,
    name: `Agent ${agentId}`,
    type: 'assistant',
    category: 'engineering',
    status: 'idle',
    capabilities: [],
    createdAt: new Date(),
  });
}

function createTestChannel(channelId: string): ChannelEntity {
  return ChannelEntity.create({
    channelId,
    name: `Channel ${channelId}`,
    type: 'public',
    status: 'active',
    members: [],
    createdAt: new Date(),
  });
}
