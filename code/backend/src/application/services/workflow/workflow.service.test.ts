import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowService, CreateWorkflowDTO, UpdateWorkflowDTO, WorkflowNotFoundError, WorkflowNotArchivedError } from './workflow.service';
import { WorkflowEntity, WorkflowStatus, WorkflowStep } from '../../../domain/models/workflow/workflow.entity';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { ActorRef } from '../../../domain/models/value-objects';
import {
  IWorkflowRepository,
  ITaskRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';
import { TaskNotFoundError } from '../task/task.errors';

describe('WorkflowService', () => {
  let workflowService: WorkflowService;
  let mockWorkflowRepository: IWorkflowRepository;
  let mockTaskRepository: ITaskRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockWorkflowRepository = {
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
      findByProject: vi.fn(),
      findByKR: vi.fn(),
      findByStatus: vi.fn(),
      findActive: vi.fn(),
    } as unknown as IWorkflowRepository;

    mockTaskRepository = {
      findById: vi.fn(),
    } as unknown as ITaskRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    workflowService = new WorkflowService(
      mockWorkflowRepository,
      mockTaskRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('createWorkflow', () => {
    it('should create a new workflow successfully', async () => {
      const mockTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);

      const steps: WorkflowStep[][] = [
        [{ id: 'step-1', taskId: 'task-1', name: 'Step 1' }],
      ];

      const dto: CreateWorkflowDTO = {
        name: 'Test Workflow',
        description: 'Test Description',
        projectId: 'project-1',
        steps,
        createdBy: 'user-1',
      };

      const result = await workflowService.createWorkflow(dto);

      expect(result).toBeInstanceOf(WorkflowEntity);
      expect(result.name).toBe(dto.name);
      expect(result.description).toBe(dto.description);
      expect(result.status).toBe('draft');
      expect(mockWorkflowRepository.save).toHaveBeenCalledWith(expect.any(WorkflowEntity));
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.created',
          aggregateType: 'Workflow',
        })
      );
    });

    it('should create workflow with KR ID', async () => {
      const mockTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);

      const dto: CreateWorkflowDTO = {
        name: 'KR Workflow',
        projectId: 'project-1',
        krId: 'kr-123',
        steps: [[{ id: 'step-1', taskId: 'task-1', name: 'Step 1' }]],
        createdBy: 'user-1',
      };

      const result = await workflowService.createWorkflow(dto);

      expect(result.krId).toBe('kr-123');
    });

    it('should throw TaskNotFoundError when step task does not exist', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      const dto: CreateWorkflowDTO = {
        name: 'Invalid Workflow',
        projectId: 'project-1',
        steps: [[{ taskId: 'nonexistent', name: 'Step 1' }]],
        createdBy: 'user-1',
      };

      await expect(workflowService.createWorkflow(dto)).rejects.toThrow(TaskNotFoundError);
    });

    it('should validate all tasks in multi-stage workflow', async () => {
      const mockTask1 = TaskEntity.create({
        taskId: 'task-1',
        title: 'Task 1',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      const mockTask2 = TaskEntity.create({
        taskId: 'task-2',
        title: 'Task 2',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById)
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2);

      const dto: CreateWorkflowDTO = {
        name: 'Multi-stage Workflow',
        projectId: 'project-1',
        steps: [
          [{ id: 'step-1', taskId: 'task-1', name: 'Stage 1 Step 1' }],
          [{ id: 'step-2', taskId: 'task-2', name: 'Stage 2 Step 1' }],
        ],
        createdBy: 'user-1',
      };

      await workflowService.createWorkflow(dto);

      expect(mockTaskRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWorkflowById', () => {
    it('should return workflow when found', async () => {
      const mockWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'draft',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(mockWorkflow);

      const result = await workflowService.getWorkflowById('workflow-1');

      expect(result).toBe(mockWorkflow);
      expect(mockWorkflowRepository.findById).toHaveBeenCalledWith('workflow-1');
    });

    it('should throw WorkflowNotFoundError when workflow not found', async () => {
      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(null);

      await expect(workflowService.getWorkflowById('nonexistent')).rejects.toThrow(
        WorkflowNotFoundError
      );
    });
  });

  describe('getWorkflowsByProject', () => {
    it('should return workflows for a project', async () => {
      const mockWorkflows = [
        WorkflowEntity.create({
          workflowId: 'workflow-1',
          name: 'Workflow 1',
          projectId: 'project-1',
          status: 'draft',
          steps: [],
          triggers: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
          meta: { tags: [] },
        }),
      ];

      vi.mocked(mockWorkflowRepository.findByProject).mockResolvedValue(mockWorkflows);

      const result = await workflowService.getWorkflowsByProject('project-1');

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
          status: 'active',
          steps: [],
          triggers: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { id: 'user-1', type: 'human' },
          meta: { tags: [] },
        }),
      ];

      vi.mocked(mockWorkflowRepository.findByStatus).mockResolvedValue(mockWorkflows);

      const result = await workflowService.getWorkflowsByStatus('active');

      expect(result).toEqual(mockWorkflows);
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow name and description', async () => {
      const existingWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Old Name',
        description: 'Old Description',
        projectId: 'project-1',
        status: 'draft',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(existingWorkflow);

      const dto: UpdateWorkflowDTO = {
        name: 'New Name',
        description: 'New Description',
      };

      const result = await workflowService.updateWorkflow('workflow-1', dto);

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New Description');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.updated',
        })
      );
    });

    it('should update only provided fields', async () => {
      const existingWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Old Name',
        description: 'Old Description',
        projectId: 'project-1',
        status: 'draft',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(existingWorkflow);

      const result = await workflowService.updateWorkflow('workflow-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('Old Description');
    });
  });

  describe('activateWorkflow', () => {
    it('should activate a draft workflow', async () => {
      const draftWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'draft',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(draftWorkflow);

      const result = await workflowService.activateWorkflow('workflow-1');

      expect(result.status).toBe('active');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.activated',
        })
      );
    });
  });

  describe('pauseWorkflow', () => {
    it('should pause an active workflow', async () => {
      const activeWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'active',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(activeWorkflow);

      const result = await workflowService.pauseWorkflow('workflow-1');

      expect(result.status).toBe('paused');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.paused',
        })
      );
    });
  });

  describe('resumeWorkflow', () => {
    it('should resume a paused workflow', async () => {
      const pausedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'paused',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(pausedWorkflow);

      const result = await workflowService.resumeWorkflow('workflow-1');

      expect(result.status).toBe('active');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.resumed',
        })
      );
    });
  });

  describe('completeWorkflow', () => {
    it('should complete an active workflow', async () => {
      const activeWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'active',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(activeWorkflow);

      const result = await workflowService.completeWorkflow('workflow-1');

      expect(result.status).toBe('completed');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.completed',
        })
      );
    });
  });

  describe('archiveWorkflow', () => {
    it('should archive a completed workflow', async () => {
      const completedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'completed',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(completedWorkflow);

      const result = await workflowService.archiveWorkflow('workflow-1');

      expect(result.status).toBe('archived');
      expect(mockWorkflowRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.archived',
        })
      );
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete an archived workflow', async () => {
      const archivedWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'archived',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(archivedWorkflow);

      await workflowService.deleteWorkflow('workflow-1');

      expect(mockWorkflowRepository.delete).toHaveBeenCalledWith('workflow-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'workflow.deleted',
        })
      );
    });

    it('should throw WorkflowNotArchivedError when deleting non-archived workflow', async () => {
      const activeWorkflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        name: 'Test Workflow',
        projectId: 'project-1',
        status: 'active',
        steps: [],
        triggers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'user-1', type: 'human' },
        meta: { tags: [] },
      });

      vi.mocked(mockWorkflowRepository.findById).mockResolvedValue(activeWorkflow);

      await expect(workflowService.deleteWorkflow('workflow-1')).rejects.toThrow(
        WorkflowNotArchivedError
      );
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      const mockTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      const dto: CreateWorkflowDTO = {
        name: 'Test Workflow',
        projectId: 'project-1',
        steps: [[{ id: 'step-1', taskId: 'task-1', name: 'Step 1' }]],
        createdBy: 'user-1',
      };

      await expect(workflowService.createWorkflow(dto)).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'workflow.created',
        })
      );
    });
  });
});
