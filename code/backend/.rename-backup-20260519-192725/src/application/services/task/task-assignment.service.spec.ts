import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TaskAssignmentService,
  AssignTaskDTO,
  ClaimTaskDTO,
  AddDependencyDTO,
  RemoveDependencyDTO,
} from './task-assignment.service';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { AssigneeRef } from '../../../domain/models/value-objects';
import {
  ITaskRepository,
  IAgentRepository,
  IEventBus,
  ILogger,
} from '../../interfaces';
import { TaskNotFoundError, TaskNotAssignableError } from './task.errors';
import { AgentNotFoundError } from '../agent/agent.errors';
import { ServerContext } from '../../context/server-context';
import { runWithContext } from '../../context/server-context-store';

describe('TaskAssignmentService', () => {
  let service: TaskAssignmentService;
  let mockTaskRepository: ITaskRepository;
  let mockAgentRepository: IAgentRepository;
  let mockEventBus: IEventBus;
  let mockLogger: ILogger;
  let testContext: ServerContext;

  beforeEach(() => {
    testContext = ServerContext.create('test-server-id', 'test-user-id');
    mockTaskRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    } as any;

    mockAgentRepository = {
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

    service = new TaskAssignmentService(
      mockTaskRepository,
      mockAgentRepository,
      mockEventBus,
      mockLogger
    );
  });

  describe('assignTask', () => {
    it('should assign task to agent successfully', async () => {
      const mockTask = createTestTask({ status: 'todo' });
      const mockAgent = createTestAgent('agent-123');
      const assignedTask = createTestTask({ status: 'todo' });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.spyOn(mockTask, 'assignTo').mockReturnValue(assignedTask);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'agent-123',
        assigneeType: 'agent',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.assignTask(dto);
      });

      expect(result).toBe(assignedTask);
      expect(mockAgentRepository.findById).toHaveBeenCalledWith('agent-123');
      expect(mockTask.assignTo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'agent-123',
          type: 'agent',
        })
      );
      expect(mockTaskRepository.update).toHaveBeenCalledWith(assignedTask, 'test-server-id');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.assigned',
        })
      );
    });

    it('should assign task to human successfully', async () => {
      const mockTask = createTestTask({ status: 'todo' });
      const assignedTask = createTestTask({ status: 'todo' });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.spyOn(mockTask, 'assignTo').mockReturnValue(assignedTask);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'user-123',
        assigneeType: 'human',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.assignTask(dto);
      });

      expect(result).toBe(assignedTask);
      expect(mockAgentRepository.findById).not.toHaveBeenCalled();
      expect(mockTaskRepository.update).toHaveBeenCalledWith(assignedTask, 'test-server-id');
    });

    it('should throw error when task not found', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      const dto: AssignTaskDTO = {
        taskId: 'nonexistent',
        assigneeId: 'agent-123',
        assigneeType: 'agent',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.assignTask(dto);


      })).rejects.toThrow(TaskNotFoundError);
    });

    it('should throw error when task is not in todo status', async () => {
      const mockTask = createTestTask({ status: 'in_progress' });
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'agent-123',
        assigneeType: 'agent',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.assignTask(dto);


      })).rejects.toThrow(
        TaskNotAssignableError
      );
    });

    it('should throw error when agent not found', async () => {
      const mockTask = createTestTask({ status: 'todo' });
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(null);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'nonexistent',
        assigneeType: 'agent',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.assignTask(dto);


      })).rejects.toThrow(AgentNotFoundError);
    });
  });

  describe('claimTask', () => {
    it('should claim task successfully', async () => {
      const mockTask = createTestTask({ status: 'todo' });
      const assignedTask = createTestTask({ status: 'todo' });
      const claimedTask = createTestTask({ status: 'in_progress' });
      const mockAgent = createTestAgent('agent-123');

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.mocked(mockAgentRepository.findById).mockResolvedValue(mockAgent);
      vi.spyOn(mockTask, 'assignTo').mockReturnValue(assignedTask);
      vi.spyOn(assignedTask, 'start').mockReturnValue(claimedTask);

      const dto: ClaimTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'agent-123',
        assigneeType: 'agent',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.claimTask(dto);
      });

      expect(result).toBe(claimedTask);
      expect(mockTask.assignTo).toHaveBeenCalled();
      expect(assignedTask.start).toHaveBeenCalled();
      expect(mockTaskRepository.update).toHaveBeenCalledWith(claimedTask, 'test-server-id');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.claimed',
        })
      );
    });

    it('should throw error when task is not in todo status', async () => {
      const mockTask = createTestTask({ status: 'done' });
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);

      const dto: ClaimTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'agent-123',
        assigneeType: 'agent',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.claimTask(dto);


      })).rejects.toThrow(
        TaskNotAssignableError
      );
    });
  });

  describe('unclaimTask', () => {
    it('should unclaim task successfully', async () => {
      const mockTask = createTestTask({ status: 'in_progress' });
      const unclaimedTask = createTestTask({ status: 'todo' });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.spyOn(mockTask, 'unclaim').mockReturnValue(unclaimedTask);

      const result = await runWithContext(testContext, async () => {
        return await service.unclaimTask('task-123', 'user-123');
      });

      expect(result).toBe(unclaimedTask);
      expect(mockTask.unclaim).toHaveBeenCalledWith('user-123');
      expect(mockTaskRepository.update).toHaveBeenCalledWith(unclaimedTask, 'test-server-id');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.unclaimed',
        })
      );
    });

    it('should throw error when task not found', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      await expect(runWithContext(testContext, async () => {


        return await service.unclaimTask('nonexistent', 'user-123');


      })).rejects.toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('addDependency', () => {
    it('should add dependency successfully', async () => {
      const mockTask = createTestTask();
      const mockDependencyTask = createTestTask();
      const updatedTask = createTestTask();

      vi.mocked(mockTaskRepository.findById)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockDependencyTask);
      vi.spyOn(mockTask, 'addDependency').mockReturnValue(updatedTask);

      const dto: AddDependencyDTO = {
        taskId: 'task-123',
        dependsOnTaskId: 'task-456',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.addDependency(dto);
      });

      expect(result).toBe(updatedTask);
      expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-123');
      expect(mockTaskRepository.findById).toHaveBeenCalledWith('task-456');
      expect(mockTask.addDependency).toHaveBeenCalledWith('task-456');
      expect(mockTaskRepository.update).toHaveBeenCalledWith(updatedTask, 'test-server-id');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.dependency_added',
        })
      );
    });

    it('should throw error when task not found', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      const dto: AddDependencyDTO = {
        taskId: 'nonexistent',
        dependsOnTaskId: 'task-456',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.addDependency(dto);


      })).rejects.toThrow(
        TaskNotFoundError
      );
    });

    it('should throw error when dependency task not found', async () => {
      const mockTask = createTestTask();
      vi.mocked(mockTaskRepository.findById)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(null);

      const dto: AddDependencyDTO = {
        taskId: 'task-123',
        dependsOnTaskId: 'nonexistent',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.addDependency(dto);


      })).rejects.toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('removeDependency', () => {
    it('should remove dependency successfully', async () => {
      const mockTask = createTestTask();
      const updatedTask = createTestTask();

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.spyOn(mockTask, 'removeDependency').mockReturnValue(updatedTask);

      const dto: RemoveDependencyDTO = {
        taskId: 'task-123',
        dependsOnTaskId: 'task-456',
      };

      const result = await runWithContext(testContext, async () => {
        return await service.removeDependency(dto);
      });

      expect(result).toBe(updatedTask);
      expect(mockTask.removeDependency).toHaveBeenCalledWith('task-456');
      expect(mockTaskRepository.update).toHaveBeenCalledWith(updatedTask, 'test-server-id');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'task.dependency_removed',
        })
      );
    });

    it('should throw error when task not found', async () => {
      vi.mocked(mockTaskRepository.findById).mockResolvedValue(null);

      const dto: RemoveDependencyDTO = {
        taskId: 'nonexistent',
        dependsOnTaskId: 'task-456',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.removeDependency(dto);


      })).rejects.toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('event publishing error handling', () => {
    it('should not throw when event publishing fails', async () => {
      const mockTask = createTestTask({ status: 'todo' });
      const assignedTask = createTestTask({ status: 'todo' });

      vi.mocked(mockTaskRepository.findById).mockResolvedValue(mockTask);
      vi.spyOn(mockTask, 'assignTo').mockReturnValue(assignedTask);
      vi.mocked(mockEventBus.publish).mockRejectedValue(
        new Error('Event bus error')
      );

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        assigneeId: 'user-123',
        assigneeType: 'human',
      };

      await expect(runWithContext(testContext, async () => {


        return await service.assignTask(dto);


      })).resolves.toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to publish event',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });
});

// --- Test Helpers ---

function createTestTask(overrides?: Partial<TaskEntity>): TaskEntity {
  const task = TaskEntity.create({
    taskId: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    taskType: 'single_agent',
    status: 'todo',
    priority: 'P1',
    createdBy: 'user-123',
    createdAt: new Date(),
    ...overrides,
  });

  // Add domain methods
  task.assignTo = vi.fn().mockReturnValue(task);
  task.start = vi.fn().mockReturnValue(task);
  task.unclaim = vi.fn().mockReturnValue(task);
  task.addDependency = vi.fn().mockReturnValue(task);
  task.removeDependency = vi.fn().mockReturnValue(task);

  return task;
}

function createTestAgent(agentId: string): AgentEntity {
  return AgentEntity.create({
    agentId,
    name: `Agent ${agentId}`,
    type: 'assistant',
    scope: 'project' as const,
        projectIds: ['project-1'], createdBy: 'user-1',
    status: 'idle',
    capabilities: [],
    createdAt: new Date(),
  });
}
