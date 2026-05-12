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

import { AgentEntity, AgentStatus } from '../../../01-domain/models/agent/agent.entity';
import { TaskEntity } from '../../../01-domain/models/task/task.entity';
import { MessageEntity } from '../../../01-domain/models/message/message.entity';
import { ChannelEntity } from '../../../01-domain/models/channel/channel.entity';
import { AssigneeRef } from '../../../01-domain/models/value-objects';
import {
  IAgentRepository,
  ITaskRepository,
  IMessageRepository,
  IChannelRepository,
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
    private readonly messageRepository: IMessageRepository,
    private readonly channelRepository: IChannelRepository,
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
      framework: 'claude_code', // 默认使用 claude_code 框架
      agentType: 'session', // 默认使用 session 类型
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
    // 需要手动构建 props 对象，因为 AgentEntity 的 props 是私有的
    const updatedAgent = AgentEntity.create({
      agentId: agent.agentId,
      name: agent.name,
      displayName: dto.displayName !== undefined ? dto.displayName : agent.displayName,
      description: dto.description !== undefined ? dto.description : agent.description,
      framework: agent.framework,
      agentType: agent.agentType,
      status: agent.status,
      category: agent.category,
      priority: agent.priority,
      tags: dto.tags !== undefined ? dto.tags : agent.tags,
      configFiles: agent.configFiles,
      memoryConfig: agent.memoryConfig,
      capabilities: dto.capabilities !== undefined ? dto.capabilities : agent.capabilities,
      permissions: agent.permissions,
      resourceLimits: agent.resourceLimits,
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

  /**
   * 处理新消息 - Agent 自动响应核心逻辑
   *
   * 当频道中有新消息时，此方法判断是否需要 Agent 响应，并生成回复。
   *
   * @param message - 新消息实体
   */
  async handleIncomingMessage(message: MessageEntity): Promise<void> {
    this.logger.info('Handling incoming message', {
      messageId: message.messageId,
      channelId: message.channelId,
      senderId: message.senderId,
      senderType: message.senderType,
    });

    // 1. 获取频道信息
    const channel = await this.channelRepository.findById(message.channelId);
    if (!channel) {
      this.logger.warn('Channel not found for message', { channelId: message.channelId });
      return;
    }

    // 2. 获取频道中的所有 Agents
    const agentIds = channel.agentPool;
    if (agentIds.length === 0) {
      this.logger.debug('No agents in channel', { channelId: message.channelId });
      return;
    }

    // 3. 遍历所有 Agents，判断是否需要响应
    for (const agentId of agentIds) {
      try {
        const agent = await this.agentRepository.findById(agentId);
        if (!agent) {
          this.logger.warn('Agent not found in pool', { agentId });
          continue;
        }

        // 判断是否需要响应
        const shouldRespond = await this.shouldAgentRespond(agent, message, channel);
        if (!shouldRespond) {
          this.logger.debug('Agent should not respond', { agentId, messageId: message.messageId });
          continue;
        }

        // 生成并发送回复
        this.logger.info('Agent will respond to message', { agentId, messageId: message.messageId });
        await this.generateAndSendResponse(agent, message, channel);

      } catch (error) {
        this.logger.error('Error handling message for agent', error as Error, {
          agentId,
          messageId: message.messageId,
        });
        // 继续处理其他 Agents
      }
    }
  }

  /**
   * 判断 Agent 是否应该响应消息
   *
   * 响应条件：
   * 1. Agent 状态为 active 或 idle
   * 2. 消息不是 Agent 自己发送的
   * 3. 消息状态为 sent
   * 4. 满足以下任一条件：
   *    - 消息中 @mention 了该 Agent
   *    - 频道类型为 dm 且对方是该 Agent
   *    - Agent 配置为自动响应所有消息
   *
   * @param agent - Agent 实体
   * @param message - 消息实体
   * @param channel - 频道实体
   * @returns 是否应该响应
   */
  async shouldAgentRespond(
    agent: AgentEntity,
    message: MessageEntity,
    channel: ChannelEntity
  ): Promise<boolean> {
    // 1. 检查 Agent 状态
    if (agent.status !== 'active' && agent.status !== 'idle') {
      this.logger.debug('Agent not in active/idle status', {
        agentId: agent.agentId,
        status: agent.status,
      });
      return false;
    }

    // 2. 不响应自己发送的消息
    if (message.senderId === agent.agentId) {
      return false;
    }

    // 3. 只响应已发送的消息
    if (message.status !== 'sent') {
      return false;
    }

    // 4. 检查是否被 @mention
    const isMentioned = message.mentions.some(
      (mention) => mention.mentionType === 'agent' && mention.mentionId === agent.agentId
    );
    if (isMentioned) {
      this.logger.debug('Agent is mentioned in message', { agentId: agent.agentId });
      return true;
    }

    // 5. 检查是否为 DM 频道
    if (channel.type === 'dm') {
      // DM 频道中，如果对方发消息，Agent 应该响应
      const isDmWithAgent = channel.members.some(
        (member) => member.memberId === agent.agentId && member.memberType === 'agent'
      );
      if (isDmWithAgent) {
        this.logger.debug('Message in DM channel with agent', { agentId: agent.agentId });
        return true;
      }
    }

    // 6. 检查 Agent 是否配置为自动响应所有消息
    // 注意：这个功能需要在 AgentEntity 中添加 autoRespond 配置
    // 目前默认不自动响应所有消息
    // if (agent.config?.autoRespond === true) {
    //   return true;
    // }

    return false;
  }

  /**
   * 生成 Agent 回复内容
   *
   * 此方法调用 Agent Runtime 生成回复内容。
   * 在 MVP 阶段，可以先返回 Mock 回复，后续接入真实的 Claude API。
   *
   * @param agent - Agent 实体
   * @param message - 原始消息实体
   * @param channel - 频道实体
   * @returns 回复内容
   */
  async generateAgentResponse(
    agent: AgentEntity,
    message: MessageEntity,
    channel: ChannelEntity
  ): Promise<string> {
    this.logger.info('Generating agent response', {
      agentId: agent.agentId,
      messageId: message.messageId,
    });

    try {
      // 调用 Agent Runtime 生成回复
      // 注意：这里需要 IAgentRuntime 接口支持 generateResponse 方法
      // 如果接口还没有此方法，需要先添加到接口定义中

      // TODO: 实现真实的 Agent Runtime 调用
      // const response = await this.agentRuntime.generateResponse(agent.agentId, {
      //   message: message.content,
      //   channelId: channel.channelId,
      //   conversationHistory: await this.getConversationHistory(channel.channelId),
      // });

      // MVP 阶段：返回 Mock 回复
      const mockResponse = this.generateMockResponse(agent, message);

      this.logger.info('Agent response generated', {
        agentId: agent.agentId,
        responseLength: mockResponse.length,
      });

      return mockResponse;

    } catch (error) {
      this.logger.error('Failed to generate agent response', error as Error, {
        agentId: agent.agentId,
        messageId: message.messageId,
      });
      throw new AgentResponseGenerationError(agent.agentId, message.messageId);
    }
  }

  /**
   * 生成并发送 Agent 回复
   *
   * 私有方法，用于生成回复并保存到数据库，发布事件。
   *
   * @param agent - Agent 实体
   * @param originalMessage - 原始消息实体
   * @param channel - 频道实体
   */
  private async generateAndSendResponse(
    agent: AgentEntity,
    originalMessage: MessageEntity,
    channel: ChannelEntity
  ): Promise<void> {
    try {
      // 1. 生成回复内容
      const responseContent = await this.generateAgentResponse(agent, originalMessage, channel);

      // 2. 创建回复消息实体
      const responseMessage = MessageEntity.create({
        messageId: this.generateMessageId(),
        msgShortId: this.generateShortId(),
        senderId: agent.agentId,
        senderType: 'agent',
        senderName: agent.displayName,
        channelId: channel.channelId,
        channelName: channel.name,
        threadId: originalMessage.threadId || originalMessage.messageId, // 在原消息的线程中回复
        isThreadRoot: false,
        content: responseContent,
        contentType: 'text',
        contentFormat: 'markdown',
        attachments: [],
        mentions: [],
        references: [
          {
            refType: 'url',
            refId: originalMessage.messageId,
            refTitle: 'Reply to message',
          },
        ],
        status: 'sent',
        isEdited: false,
        editHistory: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        meta: {
          client: 'agent-runtime',
          isPinned: false,
          isImportant: false,
        },
      });

      // 3. 保存回复消息
      await this.messageRepository.save(responseMessage);

      // 4. 发布事件
      await this.publishEvent({
        eventId: this.generateEventId(),
        eventType: 'message.sent',
        aggregateId: responseMessage.messageId,
        aggregateType: 'Message',
        occurredAt: new Date(),
        payload: {
          messageId: responseMessage.messageId,
          channelId: channel.channelId,
          senderId: agent.agentId,
          senderType: 'agent',
          inReplyTo: originalMessage.messageId,
        },
      });

      // 5. 发布 Agent 响应完成事件
      await this.publishEvent({
        eventId: this.generateEventId(),
        eventType: 'agent.response_generated',
        aggregateId: agent.agentId,
        aggregateType: 'Agent',
        occurredAt: new Date(),
        payload: {
          agentId: agent.agentId,
          messageId: responseMessage.messageId,
          originalMessageId: originalMessage.messageId,
          channelId: channel.channelId,
        },
      });

      this.logger.info('Agent response sent successfully', {
        agentId: agent.agentId,
        responseMessageId: responseMessage.messageId,
        originalMessageId: originalMessage.messageId,
      });

    } catch (error) {
      this.logger.error('Failed to generate and send response', error as Error, {
        agentId: agent.agentId,
        originalMessageId: originalMessage.messageId,
      });
      throw error;
    }
  }

  /**
   * 生成 Mock 回复（MVP 阶段使用）
   *
   * @param agent - Agent 实体
   * @param message - 原始消息实体
   * @returns Mock 回复内容
   */
  private generateMockResponse(agent: AgentEntity, message: MessageEntity): string {
    const responses = [
      `Hi! I'm ${agent.displayName}. I received your message: "${message.content.substring(0, 50)}..."`,
      `Thanks for reaching out! As ${agent.displayName}, I'm here to help.`,
      `Hello! ${agent.displayName} here. I understand you said: "${message.content.substring(0, 50)}..."`,
      `Got it! I'm ${agent.displayName} and I'm processing your request.`,
    ];

    // 随机选择一个回复
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }

  /**
   * 生成消息 ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 生成短 ID（8 字符）
   */
  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 10);
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

export class AgentResponseGenerationError extends Error {
  constructor(agentId: string, messageId: string) {
    super(`Failed to generate response for agent ${agentId} to message ${messageId}`);
    this.name = 'AgentResponseGenerationError';
  }
}
