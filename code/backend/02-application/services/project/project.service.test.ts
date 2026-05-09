import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../../../03-infrastructure/database/repositories/project.repository';

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any;
    projectService = new ProjectService(mockRepository);
  });

  it('should create a new project', async () => {
    const projectData = {
      name: 'New Project',
      description: 'A test project',
      ownerId: 'user-123',
    };

    mockRepository.create.mockResolvedValue({
      id: 'project-123',
      ...projectData,
      status: 'active',
      createdAt: new Date(),
    });

    const project = await projectService.createProject(projectData);
    expect(project.id).toBe('project-123');
    expect(project.name).toBe('New Project');
    expect(mockRepository.create).toHaveBeenCalledWith(projectData);
  });

  it('should add member to project', async () => {
    const projectId = 'project-123';
    const userId = 'user-456';
    const role = 'developer';

    mockRepository.findById.mockResolvedValue({
      id: projectId,
      name: 'Test Project',
      ownerId: 'user-123',
      members: [],
      status: 'active',
      createdAt: new Date(),
    });

    await projectService.addMember(projectId, userId, role);
    expect(mockRepository.update).toHaveBeenCalled();
  });

  it('should throw error when project not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(
      projectService.addMember('invalid-id', 'user-456', 'developer')
    ).rejects.toThrow('Project not found');
  });
});
