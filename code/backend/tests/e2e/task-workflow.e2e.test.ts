/**
 * E2E Tests: Task Management Workflow
 *
 * Tests the complete task lifecycle: create → assign → update → complete
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TestDatabaseHelper } from '../../src/infrastructure/repositories/test-database.helper';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { TaskService } from '../../src/application/services/task/task.service';
import { UserService } from '../../src/application/services/user/user.service';
import { ProjectService } from '../../src/application/services/project/project.service';
import { ChannelService } from '../../src/application/services/channel/channel.service';
import { HybridTaskRepository } from '../../src/infrastructure/repositories/hybrid-task.repository';
import { HybridUserRepository } from '../../src/infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from '../../src/infrastructure/repositories/hybrid-project.repository';
import { ChannelRepository } from '../../src/infrastructure/repositories/channel.repository';
import { ILogger } from '../../src/application/interfaces/logger.interface';
import * as path from 'path';
import * as fs from 'fs/promises';

describe.skip('E2E: Task Management Workflow', () => {
  let testDb: TestDatabaseHelper;
  let prisma: PrismaClient;
  let storageService: StorageService;
  let testStorageRoot: string;
  let logger: ILogger;

  // Services
  let taskService: TaskService;
  let userService: UserService;
  let projectService: ProjectService;
  let channelService: ChannelService;

  // Test data
  let userId: string;
  let projectId: string;
  let channelId: string;

  beforeEach(async () => {
    // Setup test database
    testDb = new TestDatabaseHelper();
    prisma = await testDb.setup();

    // Setup test storage
    testStorageRoot = path.join(process.cwd(), '.test-storage', `e2e-task-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });
    storageService = new StorageService(testStorageRoot);

    // Setup logger
    logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

    // Initialize repositories
    const taskRepo = new HybridTaskRepository(prisma, storageService, logger);
    const userRepo = new HybridUserRepository(prisma, storageService, logger);
    const projectRepo = new HybridProjectRepository(prisma, storageService, logger);
    const channelRepo = new ChannelRepository(prisma, storageService, logger);

    // Initialize services
    taskService = new TaskService(taskRepo);
    userService = new UserService(userRepo);
    projectService = new ProjectService(projectRepo);
    channelService = new ChannelService(channelRepo);

    // Create test user, project, and channel
    const user = await userService.createUser({
      username: 'taskuser',
      email: 'task@example.com',
      displayName: 'Task User',
      passwordHash: 'hash',
    });
    userId = user.userId;

    const project = await projectService.createProject({
      name: 'task-project',
      displayName: 'Task Project',
      ownerId: userId,
    });
    projectId = project.projectId;

    const channel = await channelService.createChannel({
      name: 'tasks',
      displayName: 'Tasks',
      projectId: projectId,
      createdBy: userId,
    });
    channelId = channel.channelId;
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  it('should complete full task lifecycle: create → assign → in_progress → in_review → done', async () => {
    // Step 1: Create a task
    const task = await taskService.createTask({
      title: 'Implement feature X',
      description: 'Add new feature X to the system',
      taskType: 'single_agent',
      priority: 'P1',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    expect(task.taskId).toBeDefined();
    expect(task.title).toBe('Implement feature X');
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('P1');
    expect(task.assignee).toBeUndefined();

    // Step 2: Assign the task
    const assignedTask = await taskService.assignTask(task.taskId, {
      assigneeId: userId,
      assigneeType: 'human',
    });

    expect(assignedTask.assignee).toBeDefined();
    expect(assignedTask.assignee?.id).toBe(userId);
    expect(assignedTask.assignee?.type).toBe('human');

    // Step 3: Start working on the task
    const inProgressTask = await taskService.updateTaskStatus(task.taskId, 'in_progress');
    expect(inProgressTask.status).toBe('in_progress');

    // Step 4: Move to review
    const inReviewTask = await taskService.updateTaskStatus(task.taskId, 'in_review');
    expect(inReviewTask.status).toBe('in_review');

    // Step 5: Complete the task
    const completedTask = await taskService.updateTaskStatus(task.taskId, 'done');
    expect(completedTask.status).toBe('done');

    // Verify final state
    const finalTask = await taskService.getTaskById(task.taskId);
    expect(finalTask?.status).toBe('done');
    expect(finalTask?.assignee?.id).toBe(userId);
  });

  it('should handle task priority changes', async () => {
    // Create task with P2 priority
    const task = await taskService.createTask({
      title: 'Low priority task',
      description: 'This can wait',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    expect(task.priority).toBe('P2');

    // Escalate to P0
    const escalatedTask = await taskService.updateTaskPriority(task.taskId, 'P0');
    expect(escalatedTask.priority).toBe('P0');

    // Verify persistence
    const retrievedTask = await taskService.getTaskById(task.taskId);
    expect(retrievedTask?.priority).toBe('P0');
  });

  it('should handle task reassignment', async () => {
    // Create second user
    const user2 = await userService.createUser({
      username: 'taskuser2',
      email: 'task2@example.com',
      displayName: 'Task User 2',
      passwordHash: 'hash',
    });

    // Create and assign task to first user
    const task = await taskService.createTask({
      title: 'Reassignment test',
      description: 'Test task reassignment',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    const assignedTask = await taskService.assignTask(task.taskId, {
      assigneeId: userId,
      assigneeType: 'human',
    });

    expect(assignedTask.assignee?.id).toBe(userId);

    // Reassign to second user
    const reassignedTask = await taskService.assignTask(task.taskId, {
      assigneeId: user2.userId,
      assigneeType: 'human',
    });

    expect(reassignedTask.assignee?.id).toBe(user2.userId);

    // Verify persistence
    const retrievedTask = await taskService.getTaskById(task.taskId);
    expect(retrievedTask?.assignee?.id).toBe(user2.userId);
  });

  it('should handle task unassignment', async () => {
    // Create and assign task
    const task = await taskService.createTask({
      title: 'Unassignment test',
      description: 'Test task unassignment',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    await taskService.assignTask(task.taskId, {
      assigneeId: userId,
      assigneeType: 'human',
    });

    // Unassign
    const unassignedTask = await taskService.unassignTask(task.taskId, userId);
    expect(unassignedTask.assignee).toBeUndefined();

    // Verify persistence
    const retrievedTask = await taskService.getTaskById(task.taskId);
    expect(retrievedTask?.assignee).toBeUndefined();
  });

  it('should query tasks by status', async () => {
    // Create tasks with different statuses
    const task1 = await taskService.createTask({
      title: 'Todo task',
      description: 'Task 1',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    const task2 = await taskService.createTask({
      title: 'In progress task',
      description: 'Task 2',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    await taskService.updateTaskStatus(task2.taskId, 'in_progress');

    const task3 = await taskService.createTask({
      title: 'Done task',
      description: 'Task 3',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    await taskService.updateTaskStatus(task3.taskId, 'done');

    // Query by status
    const todoTasks = await taskService.getTasksByStatus(channelId, 'todo');
    const inProgressTasks = await taskService.getTasksByStatus(channelId, 'in_progress');
    const doneTasks = await taskService.getTasksByStatus(channelId, 'done');

    expect(todoTasks.length).toBe(1);
    expect(todoTasks[0].taskId).toBe(task1.taskId);

    expect(inProgressTasks.length).toBe(1);
    expect(inProgressTasks[0].taskId).toBe(task2.taskId);

    expect(doneTasks.length).toBe(1);
    expect(doneTasks[0].taskId).toBe(task3.taskId);
  });

  it('should query tasks by assignee', async () => {
    // Create second user
    const user2 = await userService.createUser({
      username: 'taskuser2',
      email: 'task2@example.com',
      displayName: 'Task User 2',
      passwordHash: 'hash',
    });

    // Create tasks assigned to different users
    const task1 = await taskService.createTask({
      title: 'Task for user 1',
      description: 'Task 1',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    await taskService.assignTask(task1.taskId, {
      assigneeId: userId,
      assigneeType: 'human',
    });

    const task2 = await taskService.createTask({
      title: 'Task for user 2',
      description: 'Task 2',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    await taskService.assignTask(task2.taskId, {
      assigneeId: user2.userId,
      assigneeType: 'human',
    });

    // Query by assignee
    const user1Tasks = await taskService.getTasksByAssignee(userId);
    const user2Tasks = await taskService.getTasksByAssignee(user2.userId);

    expect(user1Tasks.length).toBe(1);
    expect(user1Tasks[0].taskId).toBe(task1.taskId);

    expect(user2Tasks.length).toBe(1);
    expect(user2Tasks[0].taskId).toBe(task2.taskId);
  });

  it('should handle task cancellation', async () => {
    // Create task
    const task = await taskService.createTask({
      title: 'Task to cancel',
      description: 'This task will be cancelled',
      taskType: 'single_agent',
      priority: 'P2',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    // Start working on it
    await taskService.updateTaskStatus(task.taskId, 'in_progress');

    // Cancel it
    const cancelledTask = await taskService.updateTaskStatus(task.taskId, 'cancelled');
    expect(cancelledTask.status).toBe('cancelled');

    // Verify persistence
    const retrievedTask = await taskService.getTaskById(task.taskId);
    expect(retrievedTask?.status).toBe('cancelled');
  });

  it('should handle multi-agent tasks', async () => {
    // Create multi-agent task
    const task = await taskService.createTask({
      title: 'Multi-agent collaboration',
      description: 'Task requiring multiple agents',
      taskType: 'multi_agent',
      priority: 'P1',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    expect(task.taskType).toBe('multi_agent');

    // Assign to an agent
    const assignedTask = await taskService.assignTask(task.taskId, {
      assigneeId: 'agent-1',
      assigneeType: 'agent',
    });

    expect(assignedTask.assignee?.type).toBe('agent');
    expect(assignedTask.assignee?.id).toBe('agent-1');
  });
});
