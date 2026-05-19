import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { taskRouter } from './task.router';
import { TaskService } from '../../../application/services/task/task.service';
import { TaskNotFoundError } from '../../../application/services/task/task.errors';

describe('taskRouter - Additional Coverage', () => {
  let mockTaskService: TaskService;
  let mockContext: any;

  let router: ReturnType<typeof taskRouter>;

  beforeEach(() => {
    mockTaskService = {
      createTask: vi.fn(),
      getTasksByProject: vi.fn(),
      getTasksByChannel: vi.fn(),
      getTasksByStatus: vi.fn(),
      getTasksByPriority: vi.fn(),
      getTaskById: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      convertMessageToTask: vi.fn(),
      claimTask: vi.fn(),
      unclaimTask: vi.fn(),
      updateTaskStatus: vi.fn(),
    } as unknown as TaskService;


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

    router = taskRouter(mockTaskService);
  });

  describe('create - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.createTask).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.create({
          projectId: 'project-1',
          title: 'Test Task',
          taskType: 'single_agent',
          priority: 'P1',
          channelId: 'channel-1',
          createdBy: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
        expect(err.message).toBe('Database error');
      }
    });
  });

  describe('list - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR when getTasksByProject fails', async () => {
      vi.mocked(mockTaskService.getTasksByProject).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ projectId: 'project-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR when getTasksByChannel fails', async () => {
      vi.mocked(mockTaskService.getTasksByChannel).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ channelId: 'channel-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR when getTasksByStatus fails', async () => {
      vi.mocked(mockTaskService.getTasksByStatus).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ status: 'todo' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR when getTasksByPriority fails', async () => {
      vi.mocked(mockTaskService.getTasksByPriority).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.list({ priority: 'P0' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should return empty list when no filters provided', async () => {
      const caller = router.createCaller(mockContext);
      const result = await caller.list({});

      expect(result.tasks).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getById - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.getTaskById).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.getById({ taskId: 'task-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('update - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.updateTask).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.update({
          taskId: 'task-1',
          data: { title: 'Updated' },
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('delete - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.deleteTask).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.delete({ taskId: 'task-1' });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('convertMessageToTask - additional error cases', () => {
    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.convertMessageToTask).mockRejectedValue(
        new Error('Database error')
      );

      const caller = router.createCaller(mockContext);

      try {
        await caller.convertMessageToTask({
          messageId: 'msg-1',
          title: 'Task from message',
          createdBy: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('claim - additional error cases', () => {
    it('should throw NOT_FOUND when task not found', async () => {
      const error = new TaskNotFoundError('task-1');
      error.name = 'TaskNotFoundError';
      vi.mocked(mockTaskService.claimTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.claim({
          taskId: 'nonexistent',
          assigneeId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.claimTask).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.claim({
          taskId: 'task-1',
          assigneeId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('unclaim - additional error cases', () => {
    it('should throw NOT_FOUND when task not found', async () => {
      const error = new TaskNotFoundError('task-1');
      error.name = 'TaskNotFoundError';
      vi.mocked(mockTaskService.unclaimTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.unclaim({
          taskId: 'nonexistent',
          userId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.unclaimTask).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.unclaim({
          taskId: 'task-1',
          userId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });

  describe('updateStatus - additional error cases', () => {
    it('should throw NOT_FOUND when task not found', async () => {
      const error = new TaskNotFoundError('task-1');
      error.name = 'TaskNotFoundError';
      vi.mocked(mockTaskService.updateTaskStatus).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      try {
        await caller.updateStatus({
          taskId: 'nonexistent',
          status: 'in_progress',
          actorId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('NOT_FOUND');
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for unknown errors', async () => {
      vi.mocked(mockTaskService.updateTaskStatus).mockRejectedValue(new Error('Database error'));

      const caller = router.createCaller(mockContext);

      try {
        await caller.updateStatus({
          taskId: 'task-1',
          status: 'in_progress',
          actorId: 'user-1',
        });
        expect.fail('Should have thrown an error');
      } catch (err: any) {
        expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });
  });
});
