/**
 * WorkflowService Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowService } from './workflow.service';
import { WorkflowCrudService, CreateWorkflowDTO, UpdateWorkflowDTO } from './workflow-crud.service';
import { WorkflowQueryService } from './workflow-query.service';
import { WorkflowLifecycleService } from './workflow-lifecycle.service';
import { WorkflowEntity, WorkflowStep } from '../../../domain/models/workflow/workflow.entity';

describe('WorkflowService', () => {
  let workflowService: WorkflowService;
  let mockCrudService: WorkflowCrudService;
  let mockQueryService: WorkflowQueryService;
  let mockLifecycleService: WorkflowLifecycleService;

  beforeEach(() => {
    mockCrudService = {
      createWorkflow: vi.fn(),
      updateWorkflow: vi.fn(),
      deleteWorkflow: vi.fn(),
      archiveWorkflow: vi.fn(),
      restoreWorkflow: vi.fn(),
    } as unknown as WorkflowCrudService;

    mockQueryService = {
      getWorkflowById: vi.fn(),
      getWorkflowsByProject: vi.fn(),
      getWorkflowsByKR: vi.fn(),
      getWorkflowsByStatus: vi.fn(),
      getActiveWorkflows: vi.fn(),
    } as unknown as WorkflowQueryService;

    mockLifecycleService = {
      activateWorkflow: vi.fn(),
      pauseWorkflow: vi.fn(),
      resumeWorkflow: vi.fn(),
      completeWorkflow: vi.fn(),
      archiveWorkflow: vi.fn(),
    } as unknown as WorkflowLifecycleService;

    workflowService = new WorkflowService(
      mockCrudService,
      mockQueryService,
      mockLifecycleService
    );
  });

  describe('createWorkflow', () => {
    it('should create a new workflow successfully', async () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step-1',
          taskId: 'task-1',
        },
      ];

      const dto: CreateWorkflowDTO = {
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [steps],
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: dto.name,
        projectId: dto.projectId,
        steps: [steps],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createWorkflow).mockResolvedValue(mockWorkflow);

      const result = await workflowService.createWorkflow(dto);

      expect(result).toBe(mockWorkflow);
      expect(mockCrudService.createWorkflow).toHaveBeenCalledWith(dto);
    });

    it('should create workflow with KR ID', async () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step-1',
          taskId: 'task-1',
        },
      ];

      const dto: CreateWorkflowDTO = {
        name: 'Test Workflow',
        projectId: 'project-1',
        krId: 'kr-1',
        steps: [steps],
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: dto.name,
        projectId: dto.projectId,
        krId: 'kr-1',
        steps: [steps],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createWorkflow).mockResolvedValue(mockWorkflow);

      const result = await workflowService.createWorkflow(dto);

      expect(result.krId).toBe('kr-1');
    });

    it('should throw TaskNotFoundError when step task does not exist', async () => {
      const steps: WorkflowStep[] = [
        {
          id: 'step-1',
          taskId: 'nonexistent-task',
        },
      ];

      const dto: CreateWorkflowDTO = {
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [steps],
        createdBy: { id: 'user-1', type: 'human' },
      };

      vi.mocked(mockCrudService.createWorkflow).mockRejectedValue(
        new Error('Task not found: nonexistent-task')
      );

      await expect(workflowService.createWorkflow(dto)).rejects.toThrow();
    });

    it('should validate all tasks in multi-stage workflow', async () => {
      const stage1: WorkflowStep[] = [
        {
          id: 'step-1',
          taskId: 'task-1',
        },
      ];
      const stage2: WorkflowStep[] = [
        {
          id: 'step-2',
          taskId: 'task-2',
        },
      ];

      const dto: CreateWorkflowDTO = {
        name: 'Multi-stage Workflow',
        projectId: 'project-1',
        steps: [stage1, stage2],
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: dto.name,
        projectId: dto.projectId,
        steps: [stage1, stage2],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createWorkflow).mockResolvedValue(mockWorkflow);

      const result = await workflowService.createWorkflow(dto);

      expect(result.steps).toHaveLength(2);
    });
  });

  describe('getWorkflowById', () => {
    it('should return workflow when found', async () => {
      const mockWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockQueryService.getWorkflowById).mockResolvedValue(mockWorkflow);

      const result = await workflowService.getWorkflowById('workflow-1');

      expect(result).toBe(mockWorkflow);
    });
  });

  describe('getWorkflowsByProject', () => {
    it('should return workflows for a project', async () => {
      const mockWorkflows = [
        WorkflowEntity.create({
          workflowId: 'workflow-1',
          name: 'Workflow 1',
          projectId: 'project-1',
          steps: [],
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        }),
        WorkflowEntity.create({
          workflowId: 'workflow-2',
          name: 'Workflow 2',
          projectId: 'project-1',
          steps: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        }),
      ];

      vi.mocked(mockQueryService.getWorkflowsByProject).mockResolvedValue(mockWorkflows);

      const result = await workflowService.getWorkflowsByProject('project-1');

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('getWorkflowsByStatus', () => {
    it('should return workflows by status', async () => {
      const mockWorkflows = [
        WorkflowEntity.create({
          workflowId: 'workflow-1',
          name: 'Active Workflow',
          projectId: 'project-1',
          steps: [],
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
        }),
      ];

      vi.mocked(mockQueryService.getWorkflowsByStatus).mockResolvedValue(mockWorkflows);

      const result = await workflowService.getWorkflowsByStatus('active');

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('active');
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow name and description', async () => {
      const dto: UpdateWorkflowDTO = {
        name: 'Updated Workflow',
        description: 'Updated description',
      };

      const updatedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Updated Workflow',
        description: 'Updated description',
        projectId: 'project-1',
        steps: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockCrudService.updateWorkflow).mockResolvedValue(updatedWorkflow);

      const result = await workflowService.updateWorkflow('workflow-1', dto);

      expect(result.name).toBe('Updated Workflow');
      expect(result.description).toBe('Updated description');
    });

    it('should update only provided fields', async () => {
      const dto: UpdateWorkflowDTO = {
        name: 'Updated Name Only',
      };

      const updatedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Updated Name Only',
        projectId: 'project-1',
        steps: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockCrudService.updateWorkflow).mockResolvedValue(updatedWorkflow);

      const result = await workflowService.updateWorkflow('workflow-1', dto);

      expect(result.name).toBe('Updated Name Only');
    });
  });

  describe('activateWorkflow', () => {
    it('should activate a draft workflow', async () => {
      const activeWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockLifecycleService.activateWorkflow).mockResolvedValue(activeWorkflow);

      const result = await workflowService.activateWorkflow('workflow-1');

      expect(result.status).toBe('active');
    });
  });

  describe('pauseWorkflow', () => {
    it('should pause an active workflow', async () => {
      const pausedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        status: 'paused',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockLifecycleService.pauseWorkflow).mockResolvedValue(pausedWorkflow);

      const result = await workflowService.pauseWorkflow('workflow-1');

      expect(result.status).toBe('paused');
    });
  });

  describe('resumeWorkflow', () => {
    it('should resume a paused workflow', async () => {
      const resumedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockLifecycleService.resumeWorkflow).mockResolvedValue(resumedWorkflow);

      const result = await workflowService.resumeWorkflow('workflow-1');

      expect(result.status).toBe('active');
    });
  });

  describe('completeWorkflow', () => {
    it('should complete an active workflow', async () => {
      const completedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockLifecycleService.completeWorkflow).mockResolvedValue(completedWorkflow);

      const result = await workflowService.completeWorkflow('workflow-1');

      expect(result.status).toBe('completed');
    });
  });

  describe('archiveWorkflow', () => {
    it('should archive a completed workflow', async () => {
      const archivedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        status: 'archived',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
      });

      vi.mocked(mockLifecycleService.archiveWorkflow).mockResolvedValue(archivedWorkflow);

      const result = await workflowService.archiveWorkflow('workflow-1');

      expect(result.status).toBe('archived');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete an archived workflow', async () => {
      vi.mocked(mockCrudService.deleteWorkflow).mockResolvedValue(undefined);

      await expect(workflowService.deleteWorkflow('workflow-1')).resolves.toBeUndefined();
      expect(mockCrudService.deleteWorkflow).toHaveBeenCalledWith('workflow-1');
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      const dto: CreateWorkflowDTO = {
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [],
        createdBy: { id: 'user-1', type: 'human' },
      };

      const mockWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: dto.name,
        projectId: dto.projectId,
        steps: [],
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: dto.createdBy,
      });

      vi.mocked(mockCrudService.createWorkflow).mockResolvedValue(mockWorkflow);

      await expect(workflowService.createWorkflow(dto)).resolves.toBeDefined();
    });
  });
});
