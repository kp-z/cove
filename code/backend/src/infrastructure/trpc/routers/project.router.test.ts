import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { projectRouter } from './project.router';
import { ProjectService } from '../../../application/services/project/project.service';
import { ProjectEntity } from '../../../domain/models/project/project.entity';

describe('projectRouter', () => {
  let mockProjectService: ProjectService;
  let mockContext: any;

  let router: ReturnType<typeof projectRouter>;

  beforeEach(() => {
    mockProjectService = {
      createProject: vi.fn(),
      getAllProjects: vi.fn(),
      getProjectById: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
    } as unknown as ProjectService;


    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      req: {} as IncomingMessage,
      res: {
        setHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn(),
      } as unknown as ServerResponse,
    };

    router = projectRouter(mockProjectService);
  });

  describe('create', () => {
    it('should create project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-1',
        status: 'active',
        visibility: 'private',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectService.createProject).mockResolvedValue(project);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-1',
      });

      expect(result).toHaveProperty('project_id', 'proj-1');
      expect(result).toHaveProperty('name', 'Test Project');
      expect(result).toHaveProperty('description', 'Test Description');
    });

    it('should throw CONFLICT when project already exists', async () => {
      const error = new Error('Project already exists');
      vi.mocked(mockProjectService.createProject).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.create({
          name: 'Existing Project',
          ownerId: 'user-1',
        })
      ).rejects.toThrow('Project already exists');
    });

    it('should throw INTERNAL_SERVER_ERROR on other errors', async () => {
      const error = new Error('Database error');
      vi.mocked(mockProjectService.createProject).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.create({
          name: 'Test Project',
          ownerId: 'user-1',
        })
      ).rejects.toThrow('Database error');
    });
  });

  describe('list', () => {
    it('should list all projects', async () => {
      const projects = [
        ProjectEntity.create({
          projectId: 'proj-1',
          name: 'Project 1',
          ownerId: 'user-1',
          status: 'active',
          visibility: 'public',
          createdAt: new Date(),
        }),
        ProjectEntity.create({
          projectId: 'proj-2',
          name: 'Project 2',
          ownerId: 'user-2',
          status: 'active',
          visibility: 'private',
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockProjectService.getAllProjects).mockResolvedValue(projects);

      const caller = router.createCaller(mockContext);
      const result = await caller.list();

      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.projects[0]).toHaveProperty('name', 'Project 1');
    });

    it('should return empty list when no projects', async () => {
      vi.mocked(mockProjectService.getAllProjects).mockResolvedValue([]);

      const caller = router.createCaller(mockContext);
      const result = await caller.list();

      expect(result.projects).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getById', () => {
    it('should get project by id', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Test Project',
        ownerId: 'user-1',
        status: 'active',
        visibility: 'private',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectService.getProjectById).mockResolvedValue(project);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ projectId: 'proj-1' });

      expect(result).toHaveProperty('project_id', 'proj-1');
      expect(result).toHaveProperty('name', 'Test Project');
    });

    it('should throw NOT_FOUND when project not found', async () => {
      const error = new Error('Project not found');
      vi.mocked(mockProjectService.getProjectById).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getById({ projectId: 'nonexistent' })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const project = ProjectEntity.create({
        projectId: 'proj-1',
        name: 'Updated Project',
        description: 'Updated Description',
        ownerId: 'user-1',
        status: 'active',
        visibility: 'private',
        createdAt: new Date(),
      });

      vi.mocked(mockProjectService.updateProject).mockResolvedValue(project);

      const caller = router.createCaller(mockContext);
      const result = await caller.update({
        projectId: 'proj-1',
        data: {
          name: 'Updated Project',
          description: 'Updated Description',
        },
      });

      expect(result).toHaveProperty('name', 'Updated Project');
      expect(result).toHaveProperty('description', 'Updated Description');
    });

    it('should throw NOT_FOUND when project not found', async () => {
      const error = new Error('Project not found');
      vi.mocked(mockProjectService.updateProject).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.update({
          projectId: 'nonexistent',
          data: { name: 'New Name' },
        })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      vi.mocked(mockProjectService.deleteProject).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ projectId: 'proj-1' });

      expect(result).toEqual({ projectId: 'proj-1', deleted: true });
      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('proj-1');
    });

    it('should throw NOT_FOUND when project not found', async () => {
      const error = new Error('Project not found');
      vi.mocked(mockProjectService.deleteProject).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.delete({ projectId: 'nonexistent' })
      ).rejects.toThrow('Project not found');
    });
  });
});
