/**
 * AgentService - Agent 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Agent
 * - 启动和停止 Agent
 * - 分配任务给 Agent
 * - 协调 Agent 与 Runtime 的交互
 *
 * 依赖：
 * - IAgentRepository: Agent 数据访问
 * - ITaskRepository: Task 数据访问
 * - IAgentRuntime: Agent 运行时
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { AgentEntity, AgentStatus } from '../../01-domain/models/agent/agent.entity';
import { TaskEntity } from '../../01-domain/models/task/task.entity';
import { AssigneeRef } from '../../01-domain/models/value-objects';
import {
  IAgentRepository,
  ITaskRepository,
  IAgentRuntime,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../interfaces';

export interface CreateAgentDTO {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly createdBy: string;
}

export interface UpdateAgentDTO {
  readonly displayName?: string;
  readonly description?: string;
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
}

export interface AssignTaskDTO {
  readonly taskId: string;
  readonly agentId: string;
}

export class AgentService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly agentRuntime: IAgentRuntime,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  /**
   * 创建新 Agent
   */
  async createAgent(dto: CreateAgentDTO): Promise<AgentEntity> {
    this.logger.info('Creating new agent', { name: dto.name });

    // 生成 Agent ID
    const agentId = this.generateAgentId();

    // 创建 Agent 实体
    const agent = AgentEntity.create({
      agentId,
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description,
      status: 'idle',
      capabilities: dto.capabilities,
      tags: dto.tags,
      createdBy: dto.createdBy,
      createdAt: new Date(),
    });

    // 保存到数据库
    await this.agentRepository.save(agent);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.created',
      aggregateId: agent.agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: {
        agentId: agent.agentId,
        name: agent.name,
        createdBy: dto.createdBy,
      },
    });

    this.logger.info('Agent created successfully', { agentId: agent.agentId });

    return agent;
  }

  /**
   * 根据 ID 获取 Agent
   */
  async getAgentById(agentId: string): Promise<AgentEntity> {
    const agent = await this.agentRepository.findById(agentId);
    if (!agent) {
      throw new AgentNotFoundError(agentId);
    }
    return agent;
  }

  /**
   * 获取所有 Agents
   */
  async getAllAgents(): Promise<AgentEntity[]> {
    return await this.agentRepository.findAll();
  }

  /**
   * 根据状态获取 Agents
   */
  async getAgentsByStatus(status: AgentStatus): Promise<AgentEntity[]> {
    return await this.agentRepository.findByStatus(status);
  }

  /**
   * 获取可用的 Agents（idle 状态）
   */
  async getAvailableAgents(): Promise<AgentEntity[]> {
    return await this.agentRepository.findByStatus('idle');
  }

  /**
   * 更新 Agent
   */
  async updateAgent(agentId: string, dto: UpdateAgentDTO): Promise<AgentEntity> {
    this.logger.info('Updating agent', { agentId });

    // 获取现有 Agent
    const agent = await this.getAgentById(agentId);

    // 创建更新后的 Agent（不可变更新）
    let updatedAgent = agent;

    if (dto.displayName !== undefined) {
      updatedAgent = AgentEntity.create({
        ...updatedAgent,
        displayName: dto.displayName,
      });
    }

    if (dto.description !== undefined) {
      updatedAgent = AgentEntity.create({
        ...updatedAgent,
        description: dto.description,
      });
    }

    if (dto.capabilities !== undefined) {
      updatedAgent = AgentEntity.create({
        ...updatedAgent,
        capabilities: dto.capabilities,
      });
    }

    if (dto.tags !== undefined) {
      updatedAgent = AgentEntity.create({
        ...updatedAgent,
        tags: dto.tags,
      });
    }

    // 保存更新
    await this.agentRepository.update(updatedAgent);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.updated',
      aggregateId: agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: {
        agentId,
        changes: dto,
      },
    });

    this.logger.info('Agent updated successfully', { agentId });

    return updatedAgent;
  }

  /**
   * 启动 Agent
   */
  async startAgent(agentId: string): Promise<void> {
    this.logger.info('Starting agent', { agentId });

    // 获取 Agent
    const agent = await this.getAgentById(agentId);

    // 检查状态
    if (agent.status === 'active') {
      this.logger.warn('Agent is already active', { agentId });
      return;
    }

    // 激活 Agent（Domain 层业务规则）
    const activatedAgent = agent.activate();

    // 启动 Runtime
    await this.agentRuntime.startAgent(agentId);

    // 更新状态
    await this.agentRepository.update(activatedAgent);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.started',
      aggregateId: agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: { agentId },
    });

    this.logger.info('Agent started successfully', { agentId });
  }

  /**
   * 停止 Agent
   */
  async stopAgent(agentId: string): Promise<void> {
    this.logger.info('Stopping agent', { agentId });

    // 获取 Agent
    const agent = await this.getAgentById(agentId);

    // 停用 Agent（Domain 层业务规则）
    const deactivatedAgent = agent.deactivate();

    // 停止 Runtime
    await this.agentRuntime.stopAgent(agentId);

    // 更新状态
    await this.agentRepository.update(deactivatedAgent);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.stopped',
      aggregateId: agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: { agentId },
    });

    this.logger.info('Agent stopped successfully', { agentId });
  }

  /**
   * 分配任务给 Agent
   */
  async assignTask(dto: AssignTaskDTO): Promise<TaskEntity> {
    this.logger.info('Assigning task to agent', dto);

    // 获取 Agent
    const agent = await this.getAgentById(dto.agentId);

    // 检查 Agent 是否可用
    if (agent.status !== 'idle' && agent.status !== 'active') {
      throw new AgentNotAvailableError(dto.agentId, agent.status);
    }

    // 获取 Task
    const task = await this.taskRepository.findById(dto.taskId);
    if (!task) {
      throw new TaskNotFoundError(dto.taskId);
    }

    // 检查 Task 状态
    if (task.status !== 'todo') {
      throw new TaskNotAssignableError(dto.taskId, task.status);
    }

    // 创建 AssigneeRef
    const assignee = AssigneeRef.create({
      id: dto.agentId,
      type: 'agent',
      assignedAt: new Date(),
    });

    // 认领任务（Domain 层业务规则：assignTo + start）
    const claimedTask = task.claim(assignee);

    // 更新 Task
    await this.taskRepository.update(claimedTask);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'task.assigned',
      aggregateId: dto.taskId,
      aggregateType: 'Task',
      occurredAt: new Date(),
      payload: {
        taskId: dto.taskId,
        agentId: dto.agentId,
      },
    });

    this.logger.info('Task assigned successfully', dto);

    return claimedTask;
  }

  /**
   * 删除 Agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    this.logger.info('Deleting agent', { agentId });

    // 获取 Agent
    const agent = await this.getAgentById(agentId);

    // 检查状态（不能删除正在运行的 Agent）
    if (agent.status === 'active') {
      throw new AgentInUseError(agentId);
    }

    // 删除
    await this.agentRepository.delete(agentId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'agent.deleted',
      aggregateId: agentId,
      aggregateType: 'Agent',
      occurredAt: new Date(),
      payload: { agentId },
    });

    this.logger.info('Agent deleted successfully', { agentId });
  }

  // --- Private helpers ---

  private generateAgentId(): string {
    return `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
      // 不抛出异常，避免影响主流程
    }
  }
}

// --- Application Layer Errors ---

export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentNotAvailableError extends Error {
  constructor(agentId: string, status: AgentStatus) {
    super(`Agent is not available: ${agentId} (status: ${status})`);
    this.name = 'AgentNotAvailableError';
  }
}

export class AgentInUseError extends Error {
  constructor(agentId: string) {
    super(`Agent is in use and cannot be deleted: ${agentId}`);
    this.name = 'AgentInUseError';
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskNotAssignableError extends Error {
  constructor(taskId: string, status: string) {
    super(`Task cannot be assigned: ${taskId} (status: ${status})`);
    this.name = 'TaskNotAssignableError';
  }
}
