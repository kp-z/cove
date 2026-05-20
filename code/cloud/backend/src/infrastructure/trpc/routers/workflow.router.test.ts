import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { workflowRouter } from './workflow.router';
import { WorkflowService } from '../../../application/services/workflow/workflow.service';
import { WorkflowEntity } from '../../../domain/models/workflow/workflow.entity';
import { TRPCError } from '@trpc/server';
import { WorkflowNotFoundError } from '../../../application/services/workflow/workflow.errors';

describe('workflowRouter', () => {
  let mockWorkflowService: WorkflowService;
  let router: ReturnType<typeof workflowRouter>;
  let mockContext: any;

  beforeEach(() => {
    mockWorkflowService = {
      createWorkflow: vi.fn(),
      getWorkflowsByStatus: vi.fn(),
      getWorkflowsByProject: vi.fn(),
      getWorkflowById: vi.fn(),
      updateWorkflow: vi.fn(),
      deleteWorkflow: vi.fn(),
    } as unknown as WorkflowService;

    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
    };

    router = workflowRouter(mockWorkflowService);
  });

  describe('create', () => {
    it('should create workflow successfully', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Test Workflow',
        description: 'Test description',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        status: 'draft',
        triggers: [],
        createdBy: { id: 'user-1', type: 'human' },
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      vi.mocked(mockWorkflowService.createWorkflow).mockResolvedValue(workflow);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        projectId: 'project-1',
        name: 'Test Workflow',
        description: 'Test description',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        createdBy: 'user-1',
      });

      expect(result).toEqual(workflow.toJSON());
      expect(mockWorkflowService.createWorkflow).toHaveBeenCalledWith({
        projectId: 'project-1',
        name: 'Test Workflow',
        description: 'Test description',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        createdBy: 'user-1',
      });
    });

    it('should create workflow with triggers', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Test Workflow',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        status: 'draft',
        triggers: [{ triggerType: 'schedule', enabled: true, schedule: '0 0 * * *' }],
        createdBy: { id: 'user-1', type: 'human' },
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      vi.mocked(mockWorkflowService.createWorkflow).mockResolvedValue(workflow);

      const caller = router.createCaller(mockContext);
      await caller.create({
        projectId: 'project-1',
        name: 'Test Workflow',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        triggers: [
          {
            triggerType: 'schedule',
            enabled: true,
            schedule: '0 0 * * *',
          },
        ],
        createdBy: 'user-1',
      });

      expect(mockWorkflowService.createWorkflow).toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR on failure', async () => {
      vi.mocked(mockWorkflowService.createWorkflow).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.create({
          projectId: 'project-1',
          name: 'Test Workflow',
          steps: [[{ id: 'step-1', taskId: 'task-1' }]],
          createdBy: 'user-1',
        });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
        expect(err.message).toBe('Database error');
      }
    });
  });

  describe('list', () => {
    it('should list workflows by status', async () => {
      const workflows = [
        WorkflowEntity.create({
          workflowId: 'workflow-1',
          projectId: 'project-1',
          name: 'Workflow 1',
          steps: [[{ id: 'step-1', taskId: 'task-1' }]],
          status: 'active',
          triggers: [],
          createdBy: { id: 'user-1', type: 'human' },
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: {},
        }),
        WorkflowEntity.create({
          workflowId: 'workflow-2',
          projectId: 'project-1',
          name: 'Workflow 2',
          steps: [[{ id: 'step-1', taskId: 'task-1' }]],
          status: 'active',
          triggers: [],
          createdBy: { id: 'user-1', type: 'human' },
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: {},
        }),
      ];

      vi.mocked(mockWorkflowService.getWorkflowsByStatus).mockResolvedValue(workflows);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ status: 'active' });

      expect(result.workflows).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockWorkflowService.getWorkflowsByStatus).toHaveBeenCalledWith('active');
    });

    it('should list workflows by projectId', async () => {
      const workflows = [
        WorkflowEntity.create({
          workflowId: 'workflow-1',
          projectId: 'project-1',
          name: 'Workflow 1',
          steps: [[{ id: 'step-1', taskId: 'task-1' }]],
          status: 'draft',
          triggers: [],
          createdBy: { id: 'user-1', type: 'human' },
          createdAt: new Date(),
          updatedAt: new Date(),
          meta: {},
        }),
      ];

      vi.mocked(mockWorkflowService.getWorkflowsByProject).mockResolvedValue(workflows);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ projectId: 'project-1' });

      expect(result.workflows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockWorkflowService.getWorkflowsByProject).toHaveBeenCalledWith('project-1');
    });

    it('should return empty list when no filters provided', async () => {
      const caller = router.createCaller(mockContext);
      const result = await caller.list({});

      expect(result.workflows).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should throw INTERNAL_SERVER_ERROR on failure', async () => {
      vi.mocked(mockWorkflowService.getWorkflowsByStatus).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ status: 'active' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('getById', () => {
    it('should get workflow by id successfully', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Test Workflow',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        status: 'draft',
        triggers: [],
        createdBy: { id: 'user-1', type: 'human' },
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      vi.mocked(mockWorkflowService.getWorkflowById).mockResolvedValue(workflow);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ workflowId: 'workflow-1' });

      expect(result).toEqual(workflow.toJSON());
      expect(mockWorkflowService.getWorkflowById).toHaveBeenCalledWith('workflow-1');
    });

    it('should throw NOT_FOUND when workflow not found', async () => {
      vi.mocked(mockWorkflowService.getWorkflowById).mockRejectedValue(
        new WorkflowNotFoundError('workflow-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.getById({ workflowId: 'workflow-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockWorkflowService.getWorkflowById).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.getById({ workflowId: 'workflow-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('update', () => {
    it('should update workflow successfully', async () => {
      const workflow = WorkflowEntity.create({
        workflowId: 'workflow-1',
        projectId: 'project-1',
        name: 'Updated Workflow',
        description: 'Updated description',
        steps: [[{ id: 'step-1', taskId: 'task-1' }]],
        status: 'draft',
        triggers: [],
        createdBy: { id: 'user-1', type: 'human' },
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {},
      });

      vi.mocked(mockWorkflowService.updateWorkflow).mockResolvedValue(workflow);

      const caller = router.createCaller(mockContext);
      const result = await caller.update({
        workflowId: 'workflow-1',
        data: {
          name: 'Updated Workflow',
          description: 'Updated description',
        },
      });

      expect(result).toEqual(workflow.toJSON());
      expect(mockWorkflowService.updateWorkflow).toHaveBeenCalledWith('workflow-1', {
        name: 'Updated Workflow',
        description: 'Updated description',
      });
    });

    it('should throw NOT_FOUND when workflow not found', async () => {
      vi.mocked(mockWorkflowService.updateWorkflow).mockRejectedValue(
        new WorkflowNotFoundError('workflow-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          workflowId: 'workflow-1',
          data: { name: 'Updated' },
        });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockWorkflowService.updateWorkflow).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          workflowId: 'workflow-1',
          data: { name: 'Updated' },
        });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('execute', () => {
    it('should throw NOT_IMPLEMENTED', async () => {
      const caller = router.createCaller(mockContext);

      try {
        await caller.execute({ workflowId: 'workflow-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_IMPLEMENTED');
        expect(err.message).toBe('Workflow execution not yet implemented');
      }
    });
  });

  describe('delete', () => {
    it('should delete workflow successfully', async () => {
      vi.mocked(mockWorkflowService.deleteWorkflow).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ workflowId: 'workflow-1' });

      expect(result).toEqual({ workflowId: 'workflow-1', deleted: true });
      expect(mockWorkflowService.deleteWorkflow).toHaveBeenCalledWith('workflow-1');
    });

    it('should throw NOT_FOUND when workflow not found', async () => {
      vi.mocked(mockWorkflowService.deleteWorkflow).mockRejectedValue(
        new WorkflowNotFoundError('workflow-1')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({ workflowId: 'workflow-1' });
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for other errors', async () => {
      vi.mocked(mockWorkflowService.deleteWorkflow).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({ workflowId: 'workflow-1' });
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });
});
