import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HybridTaskRepository } from './hybrid-task.repository';
import { TaskEntity } from '../../domain/models/task/task.entity';
import { ActorRef } from '../../domain/models/value-objects/actor-ref';
import { AssigneeRef } from '../../domain/models/value-objects/assignee-ref';
import { TestDatabaseHelper } from './test-database.helper';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('HybridTaskRepository', () => {
  let testDb: TestDatabaseHelper;
  let repository: HybridTaskRepository;
  let storageService: StorageService;
  let mockLogger: ILogger;
  let testStorageRoot: string;

  beforeEach(async () => {
    testDb = new TestDatabaseHelper();
    await testDb.setup();

    testStorageRoot = path.join(process.cwd(), '.test-storage', `test-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    storageService = new StorageService(testStorageRoot);
    repository = new HybridTaskRepository(testDb.prisma, storageService, mockLogger);

    // Create test user first (required for foreign key constraints)
    await testDb.prisma.user.create({
      data: {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        status: 'active',
        profilePath: '/metadata/user-1.json',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test realm first
    await testDb.createTestRealm('test-realm-1');

    // Create test channel and project
    await testDb.prisma.channel.create({
      data: {
        id: 'channel-1',
        realmId: 'test-realm-1',
        name: 'test-channel',
        displayName: 'Test Channel',
        type: 'public',
        status: 'active',
        membersData: JSON.stringify([]),
        agentPool: JSON.stringify({ agents: [], maxAgents: 10 }),
        taskPool: JSON.stringify({ tasks: [], maxTasks: 100 }),
        conversationPool: JSON.stringify([]),
        communicationRules: JSON.stringify({ allowMentions: true }),
        workspace: JSON.stringify({ root: '/workspace' }),
        metaTags: JSON.stringify([]),
        createdById: 'user-1',
        createdByType: 'user',
        messageCount: 0,
        memberCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await testDb.prisma.project.create({
      data: {
        id: 'project-1',
        realmId: 'test-realm-1',
        name: 'test-project',
        description: 'Test project',
        status: 'active',
        metadataPath: '/metadata',
        ownerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await testDb.teardown();
    try {
      await fs.rm(testStorageRoot, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const createTestTask = (overrides?: Partial<any>): TaskEntity => {
    return TaskEntity.create({
      realmId: 'test-realm-1',
      taskId: 'task-1',
      title: 'Test Task',
      description: 'Test task description',
      taskType: 'single_agent',
      priority: 'P2',
      status: 'todo',
      channelId: 'channel-1',
      projectId: 'project-1',
      krId: undefined,
      taskNumber: 1,
      sourceMessageId: undefined,
      assignee: undefined,
      dependsOn: undefined,
      createdBy: ActorRef.create({ id: 'user-1', type: 'human' }),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    });
  };

  describe('save', () => {
    it('should save a new task', async () => {
      const task = createTestTask();

      await repository.save(task, 'realm-1');

      const found = await repository.findById('task-1');
      expect(found).not.toBeNull();
      expect(found?.taskId).toBe('task-1');
      expect(found?.title).toBe('Test Task');
      expect(found?.description).toBe('Test task description');
      expect(found?.status).toBe('todo');
      expect(found?.priority).toBe('P2');
    });

    it('should save task with assignee', async () => {
      const task = createTestTask({
        taskId: 'task-2',
        assignee: AssigneeRef.create({ id: 'user-2', type: 'human', assignedAt: new Date() }),
      });

      await repository.save(task, 'realm-1');

      const found = await repository.findById('task-2');
      expect(found?.assignee).not.toBeUndefined();
      expect(found?.assignee?.id).toBe('user-2');
    });

    it('should save task with dependencies', async () => {
      const task = createTestTask({
        taskId: 'task-3',
        dependsOn: ['task-1', 'task-2'],
      });

      await repository.save(task, 'realm-1');

      const found = await repository.findById('task-3');
      expect(found?.dependsOn).toEqual(['task-1', 'task-2']);
    });

    it('should save task with source message', async () => {
      const task = createTestTask({
        taskId: 'task-4',
        sourceMessageId: 'msg-123',
      });

      await repository.save(task, 'realm-1');

      const found = await repository.findById('task-4');
      expect(found?.sourceMessageId).toBe('msg-123');
    });

    it('should save task with different types', async () => {
      const singleAgentTask = createTestTask({
        taskId: 'task-single',
        taskType: 'single_agent',
      });
      const multiAgentTask = createTestTask({
        taskId: 'task-multi',
        taskType: 'multi_agent',
      });
      const workflowTask = createTestTask({
        taskId: 'task-workflow',
        taskType: 'workflow',
      });

      await repository.save(singleAgentTask, 'realm-1');
      await repository.save(multiAgentTask, 'realm-1');
      await repository.save(workflowTask, 'realm-1');

      const foundSingle = await repository.findById('task-single');
      const foundMulti = await repository.findById('task-multi');
      const foundWorkflow = await repository.findById('task-workflow');

      expect(foundSingle?.taskType).toBe('single_agent');
      expect(foundMulti?.taskType).toBe('multi_agent');
      expect(foundWorkflow?.taskType).toBe('workflow');
    });
  });

  describe('findById', () => {
    it('should find task by id', async () => {
      const task = createTestTask();
      await repository.save(task, 'realm-1');

      const found = await repository.findById('task-1');

      expect(found).not.toBeNull();
      expect(found?.taskId).toBe('task-1');
    });

    it('should return null for non-existent task', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByChannel', () => {
    it('should find tasks by channel id', async () => {
      const task1 = createTestTask({
        taskId: 'task-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const task2 = createTestTask({
        taskId: 'task-2',
        createdAt: new Date('2026-01-02T00:00:00Z'),
      });
      const task3 = createTestTask({
        taskId: 'task-3',
        createdAt: new Date('2026-01-03T00:00:00Z'),
      });

      await repository.save(task1, 'realm-1');
      await repository.save(task2, 'realm-1');
      await repository.save(task3, 'realm-1');

      const found = await repository.findByChannel('channel-1');

      expect(found).toHaveLength(3);
      // Should be ordered by createdAt desc
      expect(found[0].taskId).toBe('task-3');
      expect(found[1].taskId).toBe('task-2');
      expect(found[2].taskId).toBe('task-1');
    });

    it('should return empty array when no tasks in channel', async () => {
      const found = await repository.findByChannel('non-existent-channel');

      expect(found).toEqual([]);
    });
  });

  describe('findByProject', () => {
    it('should find tasks by project id', async () => {
      const task1 = createTestTask({ taskId: 'task-1' });
      const task2 = createTestTask({ taskId: 'task-2' });

      await repository.save(task1, 'realm-1');
      await repository.save(task2, 'realm-1');

      const found = await repository.findByProject('project-1');

      expect(found).toHaveLength(2);
      expect(found.map(t => t.taskId).sort()).toEqual(['task-1', 'task-2']);
    });

    it('should return empty array when no tasks in project', async () => {
      const found = await repository.findByProject('non-existent-project');

      expect(found).toEqual([]);
    });
  });

  describe('findByStatus', () => {
    it('should find tasks by status', async () => {
      const todoTask = createTestTask({
        taskId: 'task-1',
        status: 'todo',
      });
      const inProgressTask = createTestTask({
        taskId: 'task-2',
        status: 'in_progress',
      });
      const doneTask = createTestTask({
        taskId: 'task-3',
        status: 'done',
      });

      await repository.save(todoTask, 'realm-1');
      await repository.save(inProgressTask, 'realm-1');
      await repository.save(doneTask, 'realm-1');

      const todoTasks = await repository.findByStatus('todo');
      const inProgressTasks = await repository.findByStatus('in_progress');
      const doneTasks = await repository.findByStatus('done');

      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].status).toBe('todo');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].status).toBe('in_progress');
      expect(doneTasks).toHaveLength(1);
      expect(doneTasks[0].status).toBe('done');
    });

    it('should return empty array when no tasks with status', async () => {
      const found = await repository.findByStatus('done');

      expect(found).toEqual([]);
    });
  });

  describe('findByPriority', () => {
    it('should find tasks by priority', async () => {
      const lowTask = createTestTask({
        taskId: 'task-1',
        priority: 'P3',
      });
      const mediumTask = createTestTask({
        taskId: 'task-2',
        priority: 'P2',
      });
      const highTask = createTestTask({
        taskId: 'task-3',
        priority: 'P0',
      });

      await repository.save(lowTask, 'realm-1');
      await repository.save(mediumTask, 'realm-1');
      await repository.save(highTask, 'realm-1');

      const lowTasks = await repository.findByPriority('P3');
      const mediumTasks = await repository.findByPriority('P2');
      const highTasks = await repository.findByPriority('P0');

      expect(lowTasks).toHaveLength(1);
      expect(lowTasks[0].priority).toBe('P3');
      expect(mediumTasks).toHaveLength(1);
      expect(mediumTasks[0].priority).toBe('P2');
      expect(highTasks).toHaveLength(1);
      expect(highTasks[0].priority).toBe('P0');
    });
  });

  describe('findByAssignee', () => {
    it('should find tasks by assignee id', async () => {
      const task1 = createTestTask({
        taskId: 'task-1',
        assignee: AssigneeRef.create({ id: 'user-1', type: 'human', assignedAt: new Date() }),
      });
      const task2 = createTestTask({
        taskId: 'task-2',
        assignee: AssigneeRef.create({ id: 'user-1', type: 'human', assignedAt: new Date() }),
      });
      const task3 = createTestTask({
        taskId: 'task-3',
        assignee: AssigneeRef.create({ id: 'user-2', type: 'human', assignedAt: new Date() }),
      });

      await repository.save(task1, 'realm-1');
      await repository.save(task2, 'realm-1');
      await repository.save(task3, 'realm-1');

      const user1Tasks = await repository.findByAssignee('user-1');
      const user2Tasks = await repository.findByAssignee('user-2');

      expect(user1Tasks).toHaveLength(2);
      expect(user1Tasks.map(t => t.taskId).sort()).toEqual(['task-1', 'task-2']);
      expect(user2Tasks).toHaveLength(1);
      expect(user2Tasks[0].taskId).toBe('task-3');
    });

    it('should return empty array when assignee has no tasks', async () => {
      const found = await repository.findByAssignee('non-existent-user');

      expect(found).toEqual([]);
    });
  });

  describe('findByKR', () => {
    it('should find tasks by KR id', async () => {
      const task1 = createTestTask({
        taskId: 'task-1',
        krId: 'kr-1',
      });
      const task2 = createTestTask({
        taskId: 'task-2',
        krId: 'kr-1',
      });
      const task3 = createTestTask({
        taskId: 'task-3',
        krId: 'kr-2',
      });

      await repository.save(task1, 'realm-1');
      await repository.save(task2, 'realm-1');
      await repository.save(task3, 'realm-1');

      const kr1Tasks = await repository.findByKR('kr-1');
      const kr2Tasks = await repository.findByKR('kr-2');

      expect(kr1Tasks).toHaveLength(2);
      expect(kr1Tasks.map(t => t.taskId).sort()).toEqual(['task-1', 'task-2']);
      expect(kr2Tasks).toHaveLength(1);
      expect(kr2Tasks[0].taskId).toBe('task-3');
    });

    it('should return empty array when KR has no tasks', async () => {
      const found = await repository.findByKR('non-existent-kr');

      expect(found).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update task title and description', async () => {
      const task = createTestTask();
      await repository.save(task, 'realm-1');

      const updatedTask = TaskEntity.create({
        taskId: task.taskId,
        title: 'Updated Title',
        description: 'Updated description',
        taskType: task.taskType,
        priority: task.priority,
        status: task.status,
        channelId: task.channelId,
        projectId: task.projectId,
        krId: task.krId,
        taskNumber: task.taskNumber,
        sourceMessageId: task.sourceMessageId,
        assignee: task.assignee,
        dependsOn: task.dependsOn,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
      });
      await repository.update(updatedTask, 'realm-1');

      const found = await repository.findById('task-1');
      expect(found?.title).toBe('Updated Title');
      expect(found?.description).toBe('Updated description');
    });

    it('should update task status', async () => {
      const task = createTestTask({ status: 'todo' });
      await repository.save(task, 'realm-1');

      const updatedTask = task.start();
      await repository.update(updatedTask, 'realm-1');

      const found = await repository.findById('task-1');
      expect(found?.status).toBe('in_progress');
    });

    it('should update task priority', async () => {
      const task = createTestTask({ priority: 'P3' });
      await repository.save(task, 'realm-1');

      const updatedTask = TaskEntity.create({
        taskId: task.taskId,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        priority: 'P0',
        status: task.status,
        channelId: task.channelId,
        projectId: task.projectId,
        krId: task.krId,
        taskNumber: task.taskNumber,
        sourceMessageId: task.sourceMessageId,
        assignee: task.assignee,
        dependsOn: task.dependsOn,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
      });
      await repository.update(updatedTask, 'realm-1');

      const found = await repository.findById('task-1');
      expect(found?.priority).toBe('P0');
    });

    it('should update task assignee', async () => {
      const task = createTestTask();
      await repository.save(task, 'realm-1');

      const updatedTask = task.assignTo(AssigneeRef.create({ id: 'user-2', type: 'human', assignedAt: new Date() }));
      await repository.update(updatedTask, 'realm-1');

      const found = await repository.findById('task-1');
      expect(found?.assignee?.id).toBe('user-2');
      expect(found?.assignee?.type).toBe('human');
    });
  });

  describe('delete', () => {
    it('should delete task', async () => {
      const task = createTestTask();
      await repository.save(task, 'realm-1');

      await repository.delete('task-1');

      const found = await repository.findById('task-1');
      expect(found).toBeNull();
    });

    it('should throw when deleting non-existent task', async () => {
      await expect(repository.delete('non-existent')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when task exists', async () => {
      const task = createTestTask();
      await repository.save(task, 'realm-1');

      const exists = await repository.exists('task-1');

      expect(exists).toBe(true);
    });

    it('should return false when task does not exist', async () => {
      const exists = await repository.exists('non-existent');

      expect(exists).toBe(false);
    });
  });

  describe('getNextTaskNumber', () => {
    it('should return 1 for first task in channel', async () => {
      const nextNumber = await repository.getNextTaskNumber('channel-1');

      expect(nextNumber).toBe(1);
    });

    it('should return incremented number for subsequent tasks', async () => {
      const task1 = createTestTask({ taskId: 'task-1', taskNumber: 1 });
      const task2 = createTestTask({ taskId: 'task-2', taskNumber: 2 });

      await repository.save(task1, 'realm-1');
      await repository.save(task2, 'realm-1');

      const nextNumber = await repository.getNextTaskNumber('channel-1');

      expect(nextNumber).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should log errors on save failure', async () => {
      const task = createTestTask();
      await repository.save(task, 'realm-1');

      // Try to save duplicate
      await expect(repository.save(task, 'realm-1')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log errors on update failure', async () => {
      const task = createTestTask();

      // Try to update non-existent task
      await expect(repository.update(task, 'realm-1')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
