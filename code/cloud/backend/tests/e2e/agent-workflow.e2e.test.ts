/**
 * E2E Tests: Agent Workflow
 *
 * Tests agent creation, configuration, and task execution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TestDatabaseHelper } from '../../src/infrastructure/repositories/test-database.helper';
import { StorageService } from '../../src/infrastructure/storage/storage.service';
import { AgentService } from '../../src/application/services/agent/agent.service';
import { TaskService } from '../../src/application/services/task/task.service';
import { UserService } from '../../src/application/services/user/user.service';
import { ProjectService } from '../../src/application/services/project/project.service';
import { ChannelService } from '../../src/application/services/channel/channel.service';
import { HybridAgentRepository } from '../../src/infrastructure/repositories/hybrid-agent.repository';
import { HybridTaskRepository } from '../../src/infrastructure/repositories/hybrid-task.repository';
import { HybridUserRepository } from '../../src/infrastructure/repositories/hybrid-user.repository';
import { HybridProjectRepository } from '../../src/infrastructure/repositories/hybrid-project.repository';
import { ChannelRepository } from '../../src/infrastructure/repositories/channel.repository';
import { ILogger } from '../../src/application/interfaces/logger.interface';
import * as path from 'path';
import * as fs from 'fs/promises';

describe.skip('E2E: Agent Workflow', () => {
  let testDb: TestDatabaseHelper;
  let prisma: PrismaClient;
  let storageService: StorageService;
  let testStorageRoot: string;
  let logger: ILogger;

  // Services
  let agentService: AgentService;
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
    testStorageRoot = path.join(process.cwd(), '.test-storage', `e2e-agent-${Date.now()}`);
    await fs.mkdir(testStorageRoot, { recursive: true });
    storageService = new StorageService(testStorageRoot);

    // Setup logger
    logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

    // Initialize repositories
    const agentRepo = new HybridAgentRepository(prisma, storageService, logger);
    const taskRepo = new HybridTaskRepository(prisma, storageService, logger);
    const userRepo = new HybridUserRepository(prisma, storageService, logger);
    const projectRepo = new HybridProjectRepository(prisma, storageService, logger);
    const channelRepo = new ChannelRepository(prisma, storageService, logger);

    // Initialize services
    agentService = new AgentService(agentRepo);
    taskService = new TaskService(taskRepo);
    userService = new UserService(userRepo);
    projectService = new ProjectService(projectRepo);
    channelService = new ChannelService(channelRepo);

    // Create test user, project, and channel
    const user = await userService.createUser({
      username: 'agentuser',
      email: 'agent@example.com',
      displayName: 'Agent User',
      passwordHash: 'hash',
    });
    userId = user.userId;

    const project = await projectService.createProject({
      name: 'agent-project',
      displayName: 'Agent Project',
      ownerId: userId,
    });
    projectId = project.projectId;

    const channel = await channelService.createChannel({
      name: 'agents',
      displayName: 'Agents',
      projectId: projectId,
      createdBy: userId,
    });
    channelId = channel.channelId;
  });

  afterEach(async () => {
    await testDb.teardown();
    await fs.rm(testStorageRoot, { recursive: true, force: true });
  });

  it('should create and configure an agent', async () => {
    // Step 1: Create an agent
    const agent = await agentService.createAgent({
      name: 'test-agent',
      displayName: 'Test Agent',
      description: 'A test agent for E2E testing',
      scope: 'user',
      createdBy: userId,
    });

    expect(agent.agentId).toBeDefined();
    expect(agent.name).toBe('test-agent');
    expect(agent.status).toBe('idle');
    expect(agent.scope).toBe('user');

    // Step 2: Configure agent runtime
    const configuredAgent = await agentService.updateAgentConfig(agent.agentId, {
      runtimeConfig: {
        model: 'claude-sonnet-4',
        temperature: 0.7,
        maxTokens: 4096,
      },
    });

    expect(configuredAgent.runtimeConfig).toBeDefined();
    expect(configuredAgent.runtimeConfig?.model).toBe('claude-sonnet-4');

    // Step 3: Activate agent
    const activeAgent = await agentService.updateAgentStatus(agent.agentId, 'active');
    expect(activeAgent.status).toBe('active');

    // Verify persistence
    const retrievedAgent = await agentService.getAgentById(agent.agentId);
    expect(retrievedAgent?.status).toBe('active');
    expect(retrievedAgent?.runtimeConfig?.model).toBe('claude-sonnet-4');
  });

  it('should assign task to agent and track execution', async () => {
    // Create agent
    const agent = await agentService.createAgent({
      name: 'worker-agent',
      displayName: 'Worker Agent',
      description: 'Agent that executes tasks',
      scope: 'user',
      createdBy: userId,
    });

    await agentService.updateAgentStatus(agent.agentId, 'active');

    // Create task
    const task = await taskService.createTask({
      title: 'Agent task',
      description: 'Task for agent to execute',
      taskType: 'single_agent',
      priority: 'P1',
      channelId: channelId,
      projectId: projectId,
      createdBy: userId,
    });

    // Assign task to agent
    const assignedTask = await taskService.assignTask(task.taskId, {
      assigneeId: agent.agentId,
      assigneeType: 'agent',
    });

    expect(assignedTask.assignee?.id).toBe(agent.agentId);
    expect(assignedTask.assignee?.type).toBe('agent');

    // Agent starts working
    await taskService.updateTaskStatus(task.taskId, 'in_progress');

    // Agent completes task
    await taskService.updateTaskStatus(task.taskId, 'done');

    // Verify final state
    const completedTask = await taskService.getTaskById(task.taskId);
    expect(completedTask?.status).toBe('done');
    expect(completedTask?.assignee?.id).toBe(agent.agentId);
  });

  it('should handle agent scopes (user, project, built-in)', async () => {
    // Create user-scoped agent
    const userAgent = await agentService.createAgent({
      name: 'user-agent',
      displayName: 'User Agent',
      description: 'User-scoped agent',
      scope: 'user',
      createdBy: userId,
    });

    expect(userAgent.scope).toBe('user');

    // Create project-scoped agent
    const projectAgent = await agentService.createAgent({
      name: 'project-agent',
      displayName: 'Project Agent',
      description: 'Project-scoped agent',
      scope: 'project',
      projectIds: [projectId],
      createdBy: userId,
    });

    expect(projectAgent.scope).toBe('project');
    expect(projectAgent.projectIds).toContain(projectId);

    // Create built-in agent
    const builtInAgent = await agentService.createAgent({
      name: 'built-in-agent',
      displayName: 'Built-in Agent',
      description: 'System built-in agent',
      scope: 'built-in',
      createdBy: 'system',
    });

    expect(builtInAgent.scope).toBe('built-in');

    // Verify all agents can be retrieved
    const allAgents = await agentService.listAgents();
    expect(allAgents.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle agent status transitions', async () => {
    // Create agent
    const agent = await agentService.createAgent({
      name: 'status-agent',
      displayName: 'Status Agent',
      description: 'Agent for status testing',
      scope: 'user',
      createdBy: userId,
    });

    expect(agent.status).toBe('idle');

    // Activate
    let updatedAgent = await agentService.updateAgentStatus(agent.agentId, 'active');
    expect(updatedAgent.status).toBe('active');

    // Disable
    updatedAgent = await agentService.updateAgentStatus(agent.agentId, 'disabled');
    expect(updatedAgent.status).toBe('disabled');

    // Re-activate
    updatedAgent = await agentService.updateAgentStatus(agent.agentId, 'active');
    expect(updatedAgent.status).toBe('active');

    // Error state
    updatedAgent = await agentService.updateAgentStatus(agent.agentId, 'error');
    expect(updatedAgent.status).toBe('error');

    // Recover to idle
    updatedAgent = await agentService.updateAgentStatus(agent.agentId, 'idle');
    expect(updatedAgent.status).toBe('idle');
  });

  it('should configure agent capabilities and tools', async () => {
    // Create agent with capabilities
    const agent = await agentService.createAgent({
      name: 'capable-agent',
      displayName: 'Capable Agent',
      description: 'Agent with specific capabilities',
      scope: 'user',
      capabilities: ['code_generation', 'code_review', 'testing'],
      createdBy: userId,
    });

    expect(agent.capabilities).toContain('code_generation');
    expect(agent.capabilities).toContain('code_review');
    expect(agent.capabilities).toContain('testing');

    // Update agent tools configuration
    const configuredAgent = await agentService.updateAgentConfig(agent.agentId, {
      tools: {
        enabled: ['bash', 'read', 'write', 'edit'],
        disabled: ['web_search'],
      },
    });

    expect(configuredAgent.tools).toBeDefined();
    expect(configuredAgent.tools?.enabled).toContain('bash');
    expect(configuredAgent.tools?.disabled).toContain('web_search');
  });

  it('should handle multi-agent collaboration', async () => {
    // Create multiple agents
    const agent1 = await agentService.createAgent({
      name: 'agent-1',
      displayName: 'Agent 1',
      description: 'First agent',
      scope: 'user',
      createdBy: userId,
    });

    const agent2 = await agentService.createAgent({
      name: 'agent-2',
      displayName: 'Agent 2',
      description: 'Second agent',
      scope: 'user',
      createdBy: userId,
    });

    await agentService.updateAgentStatus(agent1.agentId, 'active');
    await agentService.updateAgentStatus(agent2.agentId, 'active');

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

    // Assign to first agent
    await taskService.assignTask(task.taskId, {
      assigneeId: agent1.agentId,
      assigneeType: 'agent',
    });

    // Start work
    await taskService.updateTaskStatus(task.taskId, 'in_progress');

    // Later, reassign to second agent
    await taskService.assignTask(task.taskId, {
      assigneeId: agent2.agentId,
      assigneeType: 'agent',
    });

    // Complete
    await taskService.updateTaskStatus(task.taskId, 'done');

    // Verify final state
    const completedTask = await taskService.getTaskById(task.taskId);
    expect(completedTask?.assignee?.id).toBe(agent2.agentId);
    expect(completedTask?.status).toBe('done');
  });

  it('should handle agent persona configuration', async () => {
    // Create agent
    const agent = await agentService.createAgent({
      name: 'persona-agent',
      displayName: 'Persona Agent',
      description: 'Agent with custom persona',
      scope: 'user',
      createdBy: userId,
    });

    // Configure persona
    const configuredAgent = await agentService.updateAgentConfig(agent.agentId, {
      persona: {
        role: 'Senior Software Engineer',
        expertise: ['TypeScript', 'Node.js', 'DDD'],
        communicationStyle: 'professional and concise',
      },
    });

    expect(configuredAgent.persona).toBeDefined();
    expect(configuredAgent.persona?.role).toBe('Senior Software Engineer');
    expect(configuredAgent.persona?.expertise).toContain('TypeScript');
  });

  it('should query agents by scope and status', async () => {
    // Create agents with different scopes and statuses
    const activeUserAgent = await agentService.createAgent({
      name: 'active-user-agent',
      displayName: 'Active User Agent',
      scope: 'user',
      createdBy: userId,
    });
    await agentService.updateAgentStatus(activeUserAgent.agentId, 'active');

    const idleUserAgent = await agentService.createAgent({
      name: 'idle-user-agent',
      displayName: 'Idle User Agent',
      scope: 'user',
      createdBy: userId,
    });

    const projectAgent = await agentService.createAgent({
      name: 'project-agent',
      displayName: 'Project Agent',
      scope: 'project',
      projectIds: [projectId],
      createdBy: userId,
    });
    await agentService.updateAgentStatus(projectAgent.agentId, 'active');

    // Query active agents
    const activeAgents = await agentService.getAgentsByStatus('active');
    expect(activeAgents.length).toBeGreaterThanOrEqual(2);
    expect(activeAgents.some(a => a.agentId === activeUserAgent.agentId)).toBe(true);
    expect(activeAgents.some(a => a.agentId === projectAgent.agentId)).toBe(true);

    // Query user-scoped agents
    const userAgents = await agentService.getAgentsByScope('user');
    expect(userAgents.length).toBeGreaterThanOrEqual(2);
    expect(userAgents.some(a => a.agentId === activeUserAgent.agentId)).toBe(true);
    expect(userAgents.some(a => a.agentId === idleUserAgent.agentId)).toBe(true);
  });
});
