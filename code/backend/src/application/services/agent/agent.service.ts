/**
 * AgentService - Agent 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Agent
 * - 更新 Agent 配置（runtime, persona, skills, tools, triggers）
 * - 分配任务给 Agent
 * - 处理消息响应逻辑
 *
 * 注意：启动/停止 Agent 已移至 AgentRuntimeService
 *
 * 依赖：
 * - IAgentRepository: Agent 数据访问
 * - ITaskRepository: Task 数据访问
 * - IAgentRuntime: Agent 运行时
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { AgentEntity, AgentStatus, AgentCategory, AgentRuntimeConfig, AgentPersona, AgentSkills, AgentTools, AgentTriggers } from '../../../domain/models/agent/agent.entity';
import { AgentResponseService } from './agent-response.service';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import { MessageEntity } from '../../../domain/models/message/message.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import { AssigneeRef } from '../../../domain/models/value-objects';
import {
  IAgentRepository,
  ITaskRepository,
  IMessageRepository,
  IChannelRepository,
  IAgentRuntime,
  IEventBus,
  ILogger,
  DomainEvent,
  IAgentConfigStore,
} from '../../interfaces';
import { AgentNotFoundError, AgentNotAvailableError, AgentInUseError, AgentResponseGenerationError } from './agent.errors';
import { TaskNotFoundError, TaskNotAssignableError } from '../task/task.errors';

export interface CreateAgentDTO {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly category?: AgentCategory;
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly createdBy: string;
}

export interface UpdateAgentDTO {
  readonly displayName?: string;
  readonly description?: string;
  readonly category?: AgentCategory;
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
}

export interface AgentAssignTaskDTO {
  readonly taskId: string;
  readonly agentId: string;
}

export class AgentService {
  private readonly agentResponseService: AgentResponseService;

  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly agentRuntime: IAgentRuntime,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly configStore?: IAgentConfigStore
  ) {
    this.agentResponseService = new AgentResponseService(
      agentRepository, messageRepository, channelRepository, eventBus, logger, configStore
    );
  }

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
      category: dto.category ?? 'custom',
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

  async getAgentDetail(agentId: string): Promise<Record<string, unknown>> {
    const agent = await this.getAgentById(agentId);
    if (!this.configStore) {
      return agent.toJSON() as unknown as Record<string, unknown>;
    }
    const [runtime, persona, files] = await Promise.all([
      this.configStore.getRuntime(agentId),
      this.configStore.getPersona(agentId),
      this.configStore.getFilePaths(agentId),
    ]);
    return { ...agent.toJSON(), runtime, persona, files } as unknown as Record<string, unknown>;
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
    // 需要手动构建 props 对象，因为 AgentEntity 的 props 是私有的
    const updatedAgent = AgentEntity.create({
      agentId: agent.agentId,
      name: agent.name,
      displayName: dto.displayName !== undefined ? dto.displayName : agent.displayName,
      description: dto.description !== undefined ? dto.description : agent.description,
      status: agent.status,
      category: dto.category !== undefined ? dto.category : agent.category,
      capabilities: dto.capabilities !== undefined ? dto.capabilities : agent.capabilities,
      tags: dto.tags !== undefined ? dto.tags : agent.tags,
      runtimeConfig: agent.runtimeConfig,
      persona: agent.persona,
      skills: agent.skills,
      tools: agent.tools,
      triggers: agent.triggers,
      createdBy: agent.createdBy,
      createdAt: agent.createdAt,
    });

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
   * 更新 Agent Runtime 配置
   */
  async updateRuntimeConfig(agentId: string, config: AgentRuntimeConfig | Record<string, unknown>): Promise<unknown> {
    this.logger.info('Updating agent runtime config', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      return this.configStore.updateRuntime(agentId, config as Record<string, unknown>);
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateRuntimeConfig(config as AgentRuntimeConfig);
    await this.agentRepository.update(updated);
    return updated;
  }

  /**
   * 更新 Agent Persona
   */
  async updatePersona(agentId: string, persona: AgentPersona | Record<string, unknown>): Promise<unknown> {
    this.logger.info('Updating agent persona', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      return this.configStore.updatePersona(agentId, persona as Record<string, unknown>);
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updatePersona(persona as AgentPersona);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updateSkills(agentId: string, skills: AgentSkills): Promise<unknown> {
    this.logger.info('Updating agent skills', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      await this.configStore.updateSkills(agentId, skills as any);
      return skills;
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateSkills(skills);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updateTools(agentId: string, tools: AgentTools): Promise<unknown> {
    this.logger.info('Updating agent tools', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      await this.configStore.updateTools(agentId, tools as any);
      return tools;
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateTools(tools);
    await this.agentRepository.update(updated);
    return updated;
  }

  async updateTriggers(agentId: string, triggers: AgentTriggers): Promise<unknown> {
    this.logger.info('Updating agent triggers', { agentId });
    await this.getAgentById(agentId);
    if (this.configStore) {
      await this.configStore.updateTriggers(agentId, triggers as any);
      return triggers;
    }
    const agent = await this.getAgentById(agentId);
    const updated = agent.updateTriggers(triggers);
    await this.agentRepository.update(updated);
    return updated;
  }

  /**
   * 分配任务给 Agent
   */
  async assignTask(dto: AgentAssignTaskDTO): Promise<TaskEntity> {
    this.logger.info('Assigning task to agent', { ...dto });

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

    this.logger.info('Task assigned successfully', { ...dto });

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

  // --- Delegation to AgentResponseService ---

  async handleIncomingMessage(message: MessageEntity): Promise<void> {
    return this.agentResponseService.handleIncomingMessage(message);
  }

  async shouldAgentRespond(agent: AgentEntity, message: MessageEntity, channel: ChannelEntity): Promise<boolean> {
    return this.agentResponseService.shouldAgentRespond(agent, message, channel);
  }

  async generateAgentResponse(agent: AgentEntity, message: MessageEntity, channel: ChannelEntity): Promise<string> {
    return this.agentResponseService.generateAgentResponse(agent, message, channel);
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
