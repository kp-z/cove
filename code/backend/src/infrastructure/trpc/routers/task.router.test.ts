import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { taskRouter } from './task.router';
import { TaskService } from '../../../application/services/task/task.service';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { ActorRef } from '../../../domain/models/value-objects/actor-ref';
import { AssigneeRef } from '../../../domain/models/value-objects/assignee-ref';
import { TaskNotFoundError } from '../../../application/services/task/task.errors';
import { MessageNotFoundError } from '../../../application/services/message/message.errors';

describe('taskRouter', () => {
  let mockTaskService: TaskService;
  let mockContext: any;

  let router: ReturnType<typeof taskRouter>;

  beforeEach(() => {
    mockTaskService = {
      createTask: vi.fn(),
      getTaskById: vi.fn(),
      getTasksByProject: vi.fn(),
      getTasksByChannel: vi.fn(),
      getTasksByStatus: vi.fn(),
      getTasksByPriority: vi.fn(),
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

  describe('create', () => {
    it('should create task successfully', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Test Task',
        description: 'Test Description',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.createTask).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.create({
        projectId: 'proj-1',
        title: 'Test Task',
        description: 'Test Description',
        taskType: 'single_agent',
        priority: 'P1',
        channelId: 'channel-1',
        createdBy: 'user-1',
      });

      expect(result).toHaveProperty('task_id', 'task-1');
      expect(result).toHaveProperty('title', 'Test Task');
    });
  });

  describe('list', () => {
    it('should list tasks by project', async () => {
      const tasks = [
        TaskEntity.create({
          taskId: 'task-1',
          projectId: 'proj-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'todo',
          channelId: 'channel-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskService.getTasksByProject).mockResolvedValue(tasks);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ projectId: 'proj-1' });

      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockTaskService.getTasksByProject).toHaveBeenCalledWith('proj-1');
    });

    it('should list tasks by channel', async () => {
      const tasks = [
        TaskEntity.create({
          taskId: 'task-1',
          projectId: 'proj-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'todo',
          channelId: 'channel-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskService.getTasksByChannel).mockResolvedValue(tasks);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ channelId: 'channel-1' });

      expect(result.tasks).toHaveLength(1);
      expect(mockTaskService.getTasksByChannel).toHaveBeenCalledWith('channel-1');
    });

    it('should list tasks by status', async () => {
      const tasks = [
        TaskEntity.create({
          taskId: 'task-1',
          projectId: 'proj-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'in_progress',
          channelId: 'channel-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskService.getTasksByStatus).mockResolvedValue(tasks);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ status: 'in_progress' });

      expect(result.tasks).toHaveLength(1);
      expect(mockTaskService.getTasksByStatus).toHaveBeenCalledWith('in_progress');
    });

    it('should list tasks by priority', async () => {
      const tasks = [
        TaskEntity.create({
          taskId: 'task-1',
          projectId: 'proj-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P0',
          status: 'todo',
          channelId: 'channel-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskService.getTasksByPriority).mockResolvedValue(tasks);

      const caller = router.createCaller(mockContext);
      const result = await caller.list({ priority: 'P0' });

      expect(result.tasks).toHaveLength(1);
      expect(mockTaskService.getTasksByPriority).toHaveBeenCalledWith('P0');
    });
  });

  describe('getById', () => {
    it('should get task by id', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.getTaskById).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.getById({ taskId: 'task-1' });

      expect(result).toHaveProperty('task_id', 'task-1');
      expect(result).toHaveProperty('title', 'Test Task');
    });

    it('should throw NOT_FOUND when task not found', async () => {
      const error = new TaskNotFoundError('task-1');
      error.name = 'TaskNotFoundError';
      vi.mocked(mockTaskService.getTaskById).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.getById({ taskId: 'nonexistent' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('update', () => {
    it('should update task successfully', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Updated Task',
        description: 'Updated Description',
        taskType: 'single_agent',
        priority: 'P0',
        status: 'todo',
        channelId: 'channel-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.updateTask).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.update({
        taskId: 'task-1',
        data: {
          title: 'Updated Task',
          priority: 'P0',
        },
      });

      expect(result).toHaveProperty('title', 'Updated Task');
      expect(result).toHaveProperty('priority', 'P0');
    });

    it('should throw NOT_FOUND when task not found', async () => {
      const error = new TaskNotFoundError('task-1');
      error.name = 'TaskNotFoundError';
      vi.mocked(mockTaskService.updateTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.update({
          taskId: 'nonexistent',
          data: { title: 'New Title' },
        })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('delete', () => {
    it('should delete task successfully', async () => {
      vi.mocked(mockTaskService.deleteTask).mockResolvedValue(undefined);

      const caller = router.createCaller(mockContext);
      const result = await caller.delete({ taskId: 'task-1' });

      expect(result).toEqual({ taskId: 'task-1', deleted: true });
      expect(mockTaskService.deleteTask).toHaveBeenCalledWith('task-1');
    });

    it('should throw NOT_FOUND when task not found', async () => {
      const error = new TaskNotFoundError('task-1');
      error.name = 'TaskNotFoundError';
      vi.mocked(mockTaskService.deleteTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.delete({ taskId: 'nonexistent' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('convertMessageToTask', () => {
    it('should convert message to task successfully', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Task from Message',
        taskType: 'single_agent',
        priority: 'P2',
        status: 'todo',
        channelId: 'channel-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.convertMessageToTask).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.convertMessageToTask({
        messageId: 'msg-1',
        title: 'Task from Message',
        createdBy: 'user-1',
      });

      expect(result).toHaveProperty('task_id', 'task-1');
      expect(result).toHaveProperty('title', 'Task from Message');
    });

    it('should throw NOT_FOUND when message not found', async () => {
      const error = new MessageNotFoundError('message-1');
      error.name = 'MessageNotFoundError';
      vi.mocked(mockTaskService.convertMessageToTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.convertMessageToTask({
          messageId: 'nonexistent',
          title: 'Task',
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Message not found');
    });
  });

  describe('claim', () => {
    it('should claim task successfully', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'in_progress',
        channelId: 'channel-1',
        assignee: AssigneeRef.create({
          id: 'user-1',
          type: 'human',
          assignedAt: new Date(),
        }),
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.claimTask).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.claim({
        taskId: 'task-1',
        assigneeId: 'user-1',
      });

      expect(result).toHaveProperty('assignee');
      expect(result.assignee).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('status', 'in_progress');
    });

    it('should throw FORBIDDEN when task not assignable', async () => {
      const error = new Error('Task not assignable');
      error.name = 'TaskNotAssignableError';
      vi.mocked(mockTaskService.claimTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.claim({
          taskId: 'task-1',
          assigneeId: 'user-1',
        })
      ).rejects.toThrow('Task not assignable');
    });
  });

  describe('unclaim', () => {
    it('should unclaim task successfully', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.unclaimTask).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.unclaim({
        taskId: 'task-1',
        userId: 'user-1',
      });

      expect(result).toHaveProperty('task_id', 'task-1');
      expect(result).toHaveProperty('status', 'todo');
    });

    it('should throw FORBIDDEN when user is not assignee', async () => {
      const error = new Error('User is not the assignee');
      vi.mocked(mockTaskService.unclaimTask).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.unclaim({
          taskId: 'task-1',
          userId: 'user-2',
        })
      ).rejects.toThrow('User is not the assignee');
    });
  });

  describe('updateStatus', () => {
    it('should update task status successfully', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        projectId: 'proj-1',
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'done',
        channelId: 'channel-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskService.updateTaskStatus).mockResolvedValue(task);

      const caller = router.createCaller(mockContext);
      const result = await caller.updateStatus({
        taskId: 'task-1',
        status: 'done',
        actorId: 'user-1',
      });

      expect(result).toHaveProperty('status', 'done');
    });

    it('should throw BAD_REQUEST for invalid status transition', async () => {
      const error = new Error('Cannot transition from todo to done');
      error.name = 'InvalidStatusTransitionError';
      vi.mocked(mockTaskService.updateTaskStatus).mockRejectedValue(error);

      const caller = router.createCaller(mockContext);

      await expect(
        caller.updateStatus({
          taskId: 'task-1',
          status: 'done',
          actorId: 'user-1',
        })
      ).rejects.toThrow('Cannot transition from todo to done');
    });
  });
});
