import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService, CreateTaskDTO, UpdateTaskDTO } from './task.service';
import { TaskStatusService } from './task-status.service';
import { TaskAssignmentService } from './task-assignment.service';
import { TaskEntity, TaskStatus, TaskPriority } from '../../../domain/models/task/task.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ActorRef } from '../../../domain/models/value-objects';
import {
  ITaskRepository,
  IMessageRepository,
  IAgentRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';
import { TaskNotFoundError, TaskNotDeletableError } from './task.errors';
import { MessageNotFoundError } from '../message/message.errors';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

describe('TaskService', () => {
  let taskService: TaskService;
  let mockTaskRepository: ITaskRepository;
  let mockMessageRepository: IMessageRepository;
  let mockAgentRepository: IAgentRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let taskStatusService: TaskStatusService;
  let taskAssignmentService: TaskAssignmentService;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'test-user-id');

    mockTaskRepository = {
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
      findByChannel: vi.fn(),
      findByProject: vi.fn(),
      findByStatus: vi.fn(),
      findByPriority: vi.fn(),
      findByAssignee: vi.fn(),
      getNextTaskNumber: vi.fn(),
    } as unknown as ITaskRepository;

    mockMessageRepository = {
      findById: vi.fn(),
    } as unknown as IMessageRepository;

    mockAgentRepository = {
      findById: vi.fn(),
    } as unknown as IAgentRepository;

    mockEventBus = {
      publish: vi.fn(),
    } as unknown as IEventBus;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as ILogger;

    taskStatusService = new TaskStatusService(mockTaskRepository, mockEventBus, mockLogger);
    taskAssignmentService = new TaskAssignmentService(
      mockTaskRepository,
      mockAgentRepository,
      mockEventBus,
      mockLogger
    );

    taskService = new TaskService(
      mockTaskRepository,
      taskStatusService,
      taskAssignmentService,
      mockEventBus,
      mockLogger,
      mockMessageRepository
    );
  });

  describe('createTask', () => {
    it('should create a new task successfully', async () => {
      const dto: CreateTaskDTO = {
        title: 'Test Task',
        description: 'Test Description',
        taskType: 'single_agent',
        priority: 'P1',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: 'user-1',
      };

      const result = await runWithContext(testContext, async () => {
        return await taskService.createTask(dto);
      });

      expect(result).toBeInstanceOf(TaskEntity);
      expect(result.title).toBe(dto.title);
      expect(result.description).toBe(dto.description);
      expect(result.priority).toBe(dto.priority);
      expect(result.status).toBe('todo');
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          status: 'todo',
        }),
        'test-server-id'
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.created',
          aggregateType: 'Task',
        })
      );
    });

    it('should create task with dependencies', async () => {
      const dto: CreateTaskDTO = {
        title: 'Dependent Task',
        taskType: 'single_agent',
        priority: 'P2',
        channelId: 'channel-1',
        projectId: 'project-1',
        dependsOn: ['task-1', 'task-2'],
        createdBy: 'user-1',
      };

      const result = await runWithContext(testContext, async () => {

        return await taskService.createTask(dto);

      });

      expect(result.dependsOn).toEqual(['task-1', 'task-2']);
    });

    it('should create task with optional KR ID', async () => {
      const dto: CreateTaskDTO = {
        title: 'KR Task',
        taskType: 'workflow',
        priority: 'P0',
        channelId: 'channel-1',
        projectId: 'project-1',
        krId: 'kr-123',
        createdBy: 'user-1',
      };

      const result = await runWithContext(testContext, async () => {

        return await taskService.createTask(dto);

      });

      expect(result.krId).toBe('kr-123');
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
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

      const result = await runWithContext(testContext, async () => {

        return await taskService.getTaskById('task-1');

      });

      expect(result).toBe(mockTask);
      expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-1');
    });

    it('should throw TaskNotFoundError when task not found', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return taskService.getTaskById('nonexistent');
        })
      ).rejects.toThrow(TaskNotFoundError);
    });
  });

  describe('getTasksByChannel', () => {
    it('should return tasks for a channel', async () => {
      const mockTasks = [
        TaskEntity.create({
          taskId: 'task-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'todo',
          channelId: 'channel-1',
          projectId: 'project-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskRepository.findByChannel).mockResolvedValue(mockTasks);

      const result = await runWithContext(testContext, async () => {

        return await taskService.getTasksByChannel('channel-1');

      });

      expect(result).toEqual(mockTasks);
      expect(mockTaskRepository.findByChannel).toHaveBeenCalledWith('channel-1');
    });
  });

  describe('getTasksByProject', () => {
    it('should return tasks for a project', async () => {
      const mockTasks = [
        TaskEntity.create({
          taskId: 'task-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'todo',
          channelId: 'channel-1',
          projectId: 'project-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskRepository.findByProject).mockResolvedValue(mockTasks);

      const result = await runWithContext(testContext, async () => {

        return await taskService.getTasksByProject('project-1');

      });

      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTasksByStatus', () => {
    it('should return tasks by status', async () => {
      const mockTasks = [
        TaskEntity.create({
          taskId: 'task-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'in_progress',
          channelId: 'channel-1',
          projectId: 'project-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskRepository.findByStatus).mockResolvedValue(mockTasks);

      const result = await runWithContext(testContext, async () => {

        return await taskService.getTasksByStatus('in_progress');

      });

      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTasksByPriority', () => {
    it('should return tasks by priority', async () => {
      const mockTasks = [
        TaskEntity.create({
          taskId: 'task-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P0',
          status: 'todo',
          channelId: 'channel-1',
          projectId: 'project-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskRepository.findByPriority).mockResolvedValue(mockTasks);

      const result = await runWithContext(testContext, async () => {

        return await taskService.getTasksByPriority('P0');

      });

      expect(result).toEqual(mockTasks);
    });
  });

  describe('getTasksByAssignee', () => {
    it('should return tasks by assignee', async () => {
      const mockTasks = [
        TaskEntity.create({
          taskId: 'task-1',
          title: 'Task 1',
          taskType: 'single_agent',
          priority: 'P1',
          status: 'in_progress',
          channelId: 'channel-1',
          projectId: 'project-1',
          createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
          createdAt: new Date(),
        }),
      ];

      vi.mocked(mockTaskRepository.findByAssignee).mockResolvedValue(mockTasks);

      const result = await runWithContext(testContext, async () => {

        return await taskService.getTasksByAssignee('agent-1');

      });

      expect(result).toEqual(mockTasks);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const existingTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Old Title',
        description: 'Old Description',
        taskType: 'single_agent',
        priority: 'P2',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(existingTask);

      const dto: UpdateTaskDTO = {
        title: 'New Title',
        description: 'New Description',
        priority: 'P1',
      };

      const result = await runWithContext(testContext, async () => {

        return await taskService.updateTask('task-1', dto);

      });

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Description');
      expect(result.priority).toBe('P1');
      expect(mockTaskRepository.update).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.updated',
        })
      );
    });

    it('should throw TaskNotFoundError when updating nonexistent task', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return taskService.updateTask('nonexistent', { title: 'New' });
        })
      ).rejects.toThrow(
        TaskNotFoundError
      );
    });

    it('should update only provided fields', async () => {
      const existingTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Old Title',
        description: 'Old Description',
        taskType: 'single_agent',
        priority: 'P2',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(existingTask);

      const result = await runWithContext(testContext, async () => {

        return await taskService.updateTask('task-1', { title: 'New Title' });

      });

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('Old Description');
      expect(result.priority).toBe('P2');
    });
  });

  describe('deleteTask', () => {
    it('should delete task when status is done', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        title: 'Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'done',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);

      await runWithContext(testContext, async () => {

        await taskService.deleteTask('task-1');

      });

      expect(mockTaskRepository.delete).toHaveBeenCalledWith('task-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.deleted',
        })
      );
    });

    it('should delete task when status is cancelled', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        title: 'Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'cancelled',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);

      await runWithContext(testContext, async () => {

        await taskService.deleteTask('task-1');

      });

      expect(mockTaskRepository.delete).toHaveBeenCalledWith('task-1');
    });

    it('should throw TaskNotDeletableError when status is not done or cancelled', async () => {
      const task = TaskEntity.create({
        taskId: 'task-1',
        title: 'Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'in_progress',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(task);

      await expect(
        runWithContext(testContext, async () => {
          return taskService.deleteTask('task-1');
        })
      ).rejects.toThrow(TaskNotDeletableError);
    });
  });

  describe('convertMessageToTask', () => {
    it('should convert message to task successfully', async () => {
      const mockMessage = MessageEntity.create({
        messageId: 'msg-1',
        msgShortId: 'msg-short-1',
        content: 'Message content',
        channelId: 'channel-1',
        senderId: 'user-1',
        senderType: 'human',
        status: 'sent',
        contentType: 'text',
        contentFormat: 'plain',
        createdAt: new Date(),
      });

      vi.mocked(mockMessageRepository.findById).mockResolvedValue(mockMessage);
      vi.mocked(mockTaskRepository.getNextTaskNumber).mockResolvedValue(42);

      const result = await runWithContext(testContext, async () => {

        return await taskService.convertMessageToTask('msg-1', 'Task from message', 'user-1');

      });

      expect(result.title).toBe('Task from message');
      expect(result.sourceMessageId).toBe('msg-1');
      expect(result.channelId).toBe('channel-1');
      expect(result.taskNumber).toBe(42);
      expect(mockTaskRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.created',
          payload: expect.objectContaining({
            sourceMessageId: 'msg-1',
            taskNumber: 42,
          }),
        })
      );
    });

    it('should throw MessageNotFoundError when message not found', async () => {
      vi.mocked(mockMessageRepository.findById).mockResolvedValue(null);

      await expect(
        runWithContext(testContext, async () => {
          return taskService.convertMessageToTask('nonexistent', 'Task', 'user-1');
        })
      ).rejects.toThrow(MessageNotFoundError);
    });

    it('should throw error when messageRepository is not provided', async () => {
      const serviceWithoutMessageRepo = new TaskService(
        mockTaskRepository,
        taskStatusService,
        taskAssignmentService,
        mockEventBus,
        mockLogger
      );

      await expect(
        runWithContext(testContext, async () => {
          return serviceWithoutMessageRepo.convertMessageToTask('msg-1', 'Task', 'user-1');
        })
      ).rejects.toThrow('MessageRepository is required for convertMessageToTask');
    });
  });

  describe('delegation to TaskStatusService', () => {
    let mockTask: TaskEntity;

    beforeEach(() => {
      mockTask = TaskEntity.create({
        taskId: 'task-1',
        title: 'Task',
        taskType: 'single_agent',
        priority: 'P1',
        status: 'todo',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
        createdAt: new Date(),
      });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
    });

    it('should delegate startTask to TaskStatusService', async () => {
      const result = await runWithContext(testContext, async () => {
        return await taskService.startTask('task-1');
      });

      expect(result.status).toBe('in_progress');
      expect(mockTaskRepository.update).toHaveBeenCalled();
    });

    it('should delegate completeTask to TaskStatusService', async () => {
      const inProgressTask = mockTask.start();
      const inReviewTask = inProgressTask.submitForReview();
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(inReviewTask);

      const result = await runWithContext(testContext, async () => {

        return await taskService.completeTask('task-1');

      });

      expect(result.status).toBe('done');
    });

    it('should delegate cancelTask to TaskStatusService', async () => {
      const result = await runWithContext(testContext, async () => {
        return await taskService.cancelTask('task-1');
      });

      expect(result.status).toBe('cancelled');
    });
  });

  describe('event publishing error handling', () => {
    it('should log error when event publishing fails but not throw', async () => {
      vi.mocked(mockEventBus.publish).mockRejectedValue(new Error('Event bus error'));

      const dto: CreateTaskDTO = {
        title: 'Test Task',
        taskType: 'single_agent',
        priority: 'P1',
        channelId: 'channel-1',
        projectId: 'project-1',
        createdBy: 'user-1',
      };

      await expect(
        runWithContext(testContext, async () => {
          return taskService.createTask(dto);
        })
      ).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.objectContaining({
          eventType: 'task.created',
        })
      );
    });
  });
});
