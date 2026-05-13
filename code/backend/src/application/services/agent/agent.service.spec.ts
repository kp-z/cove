/**
 * AgentService 单元测试
 *
 * 测试策略：
 * - Mock 所有外部依赖（Repository, Runtime, EventBus, Logger）
 * - 测试业务逻辑和流程编排
 * - 验证错误处理
 * - 验证事件发布
 */

import { AgentService, CreateAgentDTO, UpdateAgentDTO, AssignTaskDTO } from './agent.service';
import { AgentEntity, AgentStatus } from '../../../domain/models/agent/agent.entity';
import { TaskEntity, TaskStatus } from '../../../domain/models/task/task.entity';
import { AssigneeRef } from '../../../domain/models/value-objects';
import {
  IAgentRepository,
  ITaskRepository,
  IAgentRuntime,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';

// --- Mock Implementations ---

class MockAgentRepository implements IAgentRepository {
  private agents = new Map<string, AgentEntity>();

  async findById(agentId: string): Promise<AgentEntity | null> {
    return this.agents.get(agentId) || null;
  }

  async findAll(): Promise<AgentEntity[]> {
    return Array.from(this.agents.values());
  }

  async findByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    return Array.from(this.agents.values()).filter((a) => a.status === status);
  }

  async findByProjectId(projectId: string): Promise<AgentEntity[]> {
    return [];
  }

  async save(agent: AgentEntity): Promise<void> {
    this.agents.set(agent.agentId, agent);
  }

  async update(agent: AgentEntity): Promise<void> {
    this.agents.set(agent.agentId, agent);
  }

  async delete(agentId: string): Promise<void> {
    this.agents.delete(agentId);
  }

  // Test helpers
  clear(): void {
    this.agents.clear();
  }

  seed(agent: AgentEntity): void {
    this.agents.set(agent.agentId, agent);
  }
}

class MockTaskRepository implements ITaskRepository {
  private tasks = new Map<string, TaskEntity>();

  async findById(taskId: string): Promise<TaskEntity | null> {
    return this.tasks.get(taskId) || null;
  }

  async findByChannelId(channelId: string): Promise<TaskEntity[]> {
    return [];
  }

  async findByAssignee(assigneeId: string): Promise<TaskEntity[]> {
    return [];
  }

  async findByStatus(status: TaskStatus): Promise<TaskEntity[]> {
    return [];
  }

  async findByPriority(priority: string): Promise<TaskEntity[]> {
    return [];
  }

  async save(task: TaskEntity): Promise<void> {
    this.tasks.set(task.taskId, task);
  }

  async update(task: TaskEntity): Promise<void> {
    this.tasks.set(task.taskId, task);
  }

  async delete(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }

  async updateStatus(taskId: string, status: TaskStatus): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      const updated = TaskEntity.create({ ...task, status });
      this.tasks.set(taskId, updated);
    }
  }

  async assignTask(taskId: string, assignee: AssigneeRef): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      const updated = task.assignTo(assignee);
      this.tasks.set(taskId, updated);
    }
  }

  // Test helpers
  clear(): void {
    this.tasks.clear();
  }

  seed(task: TaskEntity): void {
    this.tasks.set(task.taskId, task);
  }
}

class MockAgentRuntime implements IAgentRuntime {
  private runningAgents = new Set<string>();

  async startAgent(agentId: string): Promise<void> {
    this.runningAgents.add(agentId);
  }

  async stopAgent(agentId: string): Promise<void> {
    this.runningAgents.delete(agentId);
  }

  async pauseAgent(agentId: string): Promise<void> {
    // No-op for mock
  }

  async resumeAgent(agentId: string): Promise<void> {
    // No-op for mock
  }

  async getAgentStatus(agentId: string): Promise<AgentStatus> {
    return this.runningAgents.has(agentId) ? 'active' : 'idle';
  }

  async sendMessage(agentId: string, message: string): Promise<void> {
    // No-op for mock
  }

  // Test helpers
  isRunning(agentId: string): boolean {
    return this.runningAgents.has(agentId);
  }
}

class MockEventBus implements IEventBus {
  public publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  subscribe<K extends keyof any>(eventType: K, handler: (event: any) => void | Promise<void>): void {
    // No-op for mock
  }

  unsubscribe<K extends keyof any>(eventType: K, handler: (event: any) => void | Promise<void>): void {
    // No-op for mock
  }

  // Test helpers
  clear(): void {
    this.publishedEvents = [];
  }

  getEventsByType(eventType: string): DomainEvent[] {
    return this.publishedEvents.filter((e) => e.eventType === eventType);
  }
}

class MockLogger implements ILogger {
  public logs: Array<{ level: string; message: string; context?: any }> = [];

  debug(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'debug', message, context });
  }

  info(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'info', message, context });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logs.push({ level: 'warn', message, context });
  }

  error(message: string, error: Error, context?: Record<string, any>): void {
    this.logs.push({ level: 'error', message, context: { ...context, error } });
  }

  // Test helpers
  clear(): void {
    this.logs = [];
  }
}

// --- Test Helpers ---

function createTestAgent(overrides: Partial<any> = {}): AgentEntity {
  const defaults = {
    agentId: 'agent-123',
    name: 'test-agent',
    displayName: 'Test Agent',
    description: 'A test agent',
    status: 'idle' as const,
    category: 'engineering' as const,
    capabilities: ['coding', 'testing'],
    tags: ['backend'],
    createdBy: 'user-123',
    createdAt: new Date(),
  };
  return AgentEntity.create({ ...defaults, ...overrides });
}

function createTestTask(overrides: Partial<any> = {}): TaskEntity {
  const defaults = {
    taskId: 'task-123',
    title: 'Test Task',
    description: 'A test task',
    taskType: 'single_agent' as const,
    priority: 'P1' as const,
    status: 'todo' as const,
    channelId: 'channel-123',
    projectId: 'project-123',
    createdBy: {
      id: 'user-123',
      type: 'human' as const,
    },
    createdAt: new Date(),
  };
  return TaskEntity.create({ ...defaults, ...overrides });
}

// --- Test Suite ---

describe('AgentService', () => {
  let service: AgentService;
  let agentRepository: MockAgentRepository;
  let taskRepository: MockTaskRepository;
  let messageRepository: any; // Mock for IMessageRepository
  let channelRepository: any; // Mock for IChannelRepository
  let agentRuntime: MockAgentRuntime;
  let eventBus: MockEventBus;
  let logger: MockLogger;

  beforeEach(() => {
    agentRepository = new MockAgentRepository();
    taskRepository = new MockTaskRepository();
    messageRepository = {}; // Minimal mock - not used in these tests
    channelRepository = {}; // Minimal mock - not used in these tests
    agentRuntime = new MockAgentRuntime();
    eventBus = new MockEventBus();
    logger = new MockLogger();

    service = new AgentService(
      agentRepository,
      taskRepository,
      messageRepository,
      channelRepository,
      agentRuntime,
      eventBus,
      logger
    );
  });

  describe('createAgent', () => {
    it('should create a new agent with valid data', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        description: 'A test agent',
        capabilities: ['coding', 'testing'],
        tags: ['backend'],
        createdBy: 'user-123',
      };

      const agent = await service.createAgent(dto);

      expect(agent.name).toBe('test-agent');
      expect(agent.displayName).toBe('Test Agent');
      expect(agent.description).toBe('A test agent');
      expect(agent.status).toBe('idle');
      // Note: capabilities is not part of AgentEntity domain model
      // expect(agent.capabilities).toEqual(['coding', 'testing']);
      expect(agent.tags).toEqual(['backend']);
    });

    it('should save agent to repository', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        createdBy: 'user-123',
      };

      const agent = await service.createAgent(dto);
      const saved = await agentRepository.findById(agent.agentId);

      expect(saved).not.toBeNull();
      expect(saved?.agentId).toBe(agent.agentId);
    });

    it('should publish agent.created event', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        createdBy: 'user-123',
      };

      await service.createAgent(dto);

      const events = eventBus.getEventsByType('agent.created');
      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({
        name: 'test-agent',
        createdBy: 'user-123',
      });
    });

    it('should log agent creation', async () => {
      const dto: CreateAgentDTO = {
        name: 'test-agent',
        displayName: 'Test Agent',
        createdBy: 'user-123',
      };

      await service.createAgent(dto);

      const infoLogs = logger.logs.filter((l) => l.level === 'info');
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(infoLogs.some((l) => l.message.includes('Creating new agent'))).toBe(true);
    });
  });

  describe('getAgentById', () => {
    it('should return agent when found', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);

      const result = await service.getAgentById('agent-123');

      expect(result.agentId).toBe('agent-123');
    });

    it('should throw AgentNotFoundError when not found', async () => {
      await expect(service.getAgentById('non-existent')).rejects.toThrow('Agent not found');
    });
  });

  describe('getAgentsByStatus', () => {
    it('should return agents with matching status', async () => {
      const agent1 = createTestAgent({
        agentId: 'agent-1',
        name: 'agent-1',
        displayName: 'Agent 1',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      const agent2 = createTestAgent({
        agentId: 'agent-2',
        name: 'agent-2',
        displayName: 'Agent 2',
        status: 'active',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent1);
      agentRepository.seed(agent2);

      const idleAgents = await service.getAgentsByStatus('idle');

      expect(idleAgents).toHaveLength(1);
      expect(idleAgents[0].agentId).toBe('agent-1');
    });
  });

  describe('updateAgent', () => {
    it('should update agent properties', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Old Name',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);

      const dto: UpdateAgentDTO = {
        displayName: 'New Name',
        description: 'Updated description',
      };

      const updated = await service.updateAgent('agent-123', dto);

      expect(updated.displayName).toBe('New Name');
      expect(updated.description).toBe('Updated description');
    });

    it('should publish agent.updated event', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);

      await service.updateAgent('agent-123', { displayName: 'New Name' });

      const events = eventBus.getEventsByType('agent.updated');
      expect(events).toHaveLength(1);
    });
  });

  // startAgent and stopAgent tests moved to agent-runtime.service — those methods
  // are now in AgentRuntimeService, not AgentService.

  describe('assignTask', () => {
    it('should assign task to idle agent', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      const task = createTestTask({
        taskId: 'task-123',
        title: 'Test Task',
        channelId: 'channel-123',
        status: 'todo',
        priority: 'P1',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);
      taskRepository.seed(task);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        agentId: 'agent-123',
      };

      const assignedTask = await service.assignTask(dto);

      expect(assignedTask.status).toBe('in_progress');
      expect(assignedTask.assignee?.id).toBe('agent-123');
      expect(assignedTask.assignee?.type).toBe('agent');
    });

    it('should throw error when agent is not available', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'error',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      const task = createTestTask({
        taskId: 'task-123',
        title: 'Test Task',
        channelId: 'channel-123',
        status: 'todo',
        priority: 'P1',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);
      taskRepository.seed(task);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        agentId: 'agent-123',
      };

      await expect(service.assignTask(dto)).rejects.toThrow('Agent is not available');
    });

    it('should throw error when task is not in todo status', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      const task = createTestTask({
        taskId: 'task-123',
        title: 'Test Task',
        channelId: 'channel-123',
        status: 'done',
        priority: 'P1',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);
      taskRepository.seed(task);

      const dto: AssignTaskDTO = {
        taskId: 'task-123',
        agentId: 'agent-123',
      };

      await expect(service.assignTask(dto)).rejects.toThrow('Task cannot be assigned');
    });

    it('should publish task.assigned event', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      const task = createTestTask({
        taskId: 'task-123',
        title: 'Test Task',
        channelId: 'channel-123',
        status: 'todo',
        priority: 'P1',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);
      taskRepository.seed(task);

      await service.assignTask({ taskId: 'task-123', agentId: 'agent-123' });

      const events = eventBus.getEventsByType('task.assigned');
      expect(events).toHaveLength(1);
    });
  });

  describe('deleteAgent', () => {
    it('should delete an idle agent', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);

      await service.deleteAgent('agent-123');

      const deleted = await agentRepository.findById('agent-123');
      expect(deleted).toBeNull();
    });

    it('should throw error when deleting active agent', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'active',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);

      await expect(service.deleteAgent('agent-123')).rejects.toThrow('Agent is in use');
    });

    it('should publish agent.deleted event', async () => {
      const agent = createTestAgent({
        agentId: 'agent-123',
        name: 'test-agent',
        displayName: 'Test Agent',
        status: 'idle',
        createdBy: 'user-123',
        createdAt: new Date(),
      });
      agentRepository.seed(agent);

      await service.deleteAgent('agent-123');

      const events = eventBus.getEventsByType('agent.deleted');
      expect(events).toHaveLength(1);
    });
  });
});
