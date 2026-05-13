import { TaskEntity, TaskStatus, TaskPriority } from '../../../01-domain/models/task/task.entity';
import { ActorRef } from '../../../01-domain/models/value-objects';
import {
  ITaskRepository,
  IAgentRepository,
  IMessageRepository,
  IEventBus,
  IEventPublisher,
  ILogger,
  DomainEvent,
} from '../interfaces';
import { TaskStatusService } from './task-status.service';
import { TaskAssignmentService } from './task-assignment.service';
import type { AssignTaskDTO, ClaimTaskDTO, AddDependencyDTO, RemoveDependencyDTO } from './task-assignment.service';

export interface CreateTaskDTO {
  readonly title: string;
  readonly description?: string;
  readonly taskType: 'single_agent' | 'multi_agent' | 'workflow';
  readonly priority: TaskPriority;
  readonly channelId: string;
  readonly projectId: string;
  readonly krId?: string;
  readonly dependsOn?: readonly string[];
  readonly createdBy: string;
}

export interface UpdateTaskDTO {
  readonly title?: string;
  readonly description?: string;
  readonly priority?: TaskPriority;
}

export type { AssignTaskDTO, ClaimTaskDTO, AddDependencyDTO, RemoveDependencyDTO };

export class TaskService {
  private readonly taskStatusService: TaskStatusService;
  private readonly taskAssignmentService: TaskAssignmentService;

  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly messageRepository?: IMessageRepository,
    private readonly eventPublisher?: IEventPublisher
  ) {
    this.taskStatusService = new TaskStatusService(taskRepository, eventBus, logger, eventPublisher);
    this.taskAssignmentService = new TaskAssignmentService(taskRepository, agentRepository, eventBus, logger, eventPublisher);
  }

  async createTask(dto: CreateTaskDTO): Promise<TaskEntity> {
    this.logger.info('Creating new task', { title: dto.title });

    const taskId = this.generateTaskId();
    const actor = ActorRef.create({ id: dto.createdBy, type: 'human' });

    const task = TaskEntity.create({
      taskId,
      title: dto.title,
      description: dto.description,
      taskType: dto.taskType,
      priority: dto.priority,
      status: 'todo',
      channelId: dto.channelId,
      projectId: dto.projectId,
      krId: dto.krId,
      dependsOn: dto.dependsOn ? [...dto.dependsOn] : [],
      createdBy: actor,
      createdAt: new Date(),
    });

    await this.taskRepository.save(task);
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'task.created',
      aggregateId: task.taskId,
      aggregateType: 'Task',
      occurredAt: new Date(),
      payload: { taskId: task.taskId, title: task.title, channelId: dto.channelId, createdBy: dto.createdBy },
    });

    this.logger.info('Task created successfully', { taskId: task.taskId });
    return task;
  }

  async getTaskById(taskId: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    return task;
  }

  async getTasksByChannel(channelId: string): Promise<TaskEntity[]> {
    return this.taskRepository.findByChannel(channelId);
  }

  async getTasksByProject(projectId: string): Promise<TaskEntity[]> {
    return this.taskRepository.findByProject(projectId);
  }

  async getTasksByStatus(status: TaskStatus): Promise<TaskEntity[]> {
    return this.taskRepository.findByStatus(status);
  }

  async getTasksByPriority(priority: TaskPriority): Promise<TaskEntity[]> {
    return this.taskRepository.findByPriority(priority);
  }

  async getTasksByAssignee(assigneeId: string): Promise<TaskEntity[]> {
    return this.taskRepository.findByAssignee(assigneeId);
  }

  async updateTask(taskId: string, dto: UpdateTaskDTO): Promise<TaskEntity> {
    this.logger.info('Updating task', { taskId });
    const task = await this.getTaskById(taskId);

    const json = task.toJSON();
    const updated = TaskEntity.fromJSON({
      ...json,
      title: dto.title ?? json.title,
      description: dto.description !== undefined ? dto.description : json.description,
      priority: dto.priority ?? json.priority,
    });

    await this.taskRepository.update(updated);
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'task.updated',
      aggregateId: taskId,
      aggregateType: 'Task',
      occurredAt: new Date(),
      payload: { taskId, changes: dto },
    });

    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    this.logger.info('Deleting task', { taskId });
    const task = await this.getTaskById(taskId);

    if (task.status !== 'cancelled' && task.status !== 'done') {
      throw new TaskNotDeletableError(taskId, task.status);
    }

    await this.taskRepository.delete(taskId);
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'task.deleted',
      aggregateId: taskId,
      aggregateType: 'Task',
      occurredAt: new Date(),
      payload: { taskId },
    });
  }

  async convertMessageToTask(messageId: string, title: string, createdBy: string): Promise<TaskEntity> {
    this.logger.info('Converting message to task', { messageId, title });

    if (!this.messageRepository) {
      throw new Error('MessageRepository is required for convertMessageToTask');
    }

    const message = await this.messageRepository.findById(messageId);
    if (!message) throw new MessageNotFoundError(messageId);

    const taskNumber = await this.taskRepository.getNextTaskNumber(message.channelId);
    const taskId = this.generateTaskId();
    const actor = ActorRef.create({ id: createdBy, type: 'human' });

    const task = TaskEntity.create({
      taskId,
      title,
      taskType: 'single_agent',
      priority: 'P2',
      status: 'todo',
      channelId: message.channelId,
      projectId: 'default',
      sourceMessageId: messageId,
      taskNumber,
      createdBy: actor,
      createdAt: new Date(),
    });

    await this.taskRepository.save(task);
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'task.created',
      aggregateId: task.taskId,
      aggregateType: 'Task',
      occurredAt: new Date(),
      payload: { taskId: task.taskId, title, channelId: message.channelId, sourceMessageId: messageId, taskNumber, createdBy },
    });
    await this.publishWsEvent('task_created', message.channelId, {
      taskId: task.taskId, title, taskNumber, sourceMessageId: messageId,
    });

    return task;
  }

  // --- Delegation to TaskStatusService ---
  async startTask(taskId: string): Promise<TaskEntity> { return this.taskStatusService.startTask(taskId); }
  async submitForReview(taskId: string): Promise<TaskEntity> { return this.taskStatusService.submitForReview(taskId); }
  async completeTask(taskId: string): Promise<TaskEntity> { return this.taskStatusService.completeTask(taskId); }
  async blockTask(taskId: string): Promise<TaskEntity> { return this.taskStatusService.blockTask(taskId); }
  async cancelTask(taskId: string): Promise<TaskEntity> { return this.taskStatusService.cancelTask(taskId); }
  async updateTaskStatus(taskId: string, status: TaskStatus, actorId: string): Promise<TaskEntity> {
    return this.taskStatusService.updateTaskStatus(taskId, status, actorId);
  }

  // --- Delegation to TaskAssignmentService ---
  async assignTask(dto: AssignTaskDTO): Promise<TaskEntity> { return this.taskAssignmentService.assignTask(dto); }
  async claimTask(dto: ClaimTaskDTO): Promise<TaskEntity> { return this.taskAssignmentService.claimTask(dto); }
  async unclaimTask(taskId: string, userId: string): Promise<TaskEntity> { return this.taskAssignmentService.unclaimTask(taskId, userId); }
  async addDependency(dto: AddDependencyDTO): Promise<TaskEntity> { return this.taskAssignmentService.addDependency(dto); }
  async removeDependency(dto: RemoveDependencyDTO): Promise<TaskEntity> { return this.taskAssignmentService.removeDependency(dto); }

  // --- Private helpers ---
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType, aggregateId: event.aggregateId,
      });
    }
  }

  private async publishWsEvent(eventType: string, channelId: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.eventPublisher) return;
    try {
      await this.eventPublisher.publish(eventType, channelId, payload);
    } catch (error) {
      this.logger.error('Failed to publish WS event', error as Error, { eventType, channelId });
    }
  }
}

// --- Application Layer Errors ---

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskNotAssignableError extends Error {
  constructor(taskId: string, status: TaskStatus) {
    super(`Task cannot be assigned: ${taskId} (status: ${status})`);
    this.name = 'TaskNotAssignableError';
  }
}

export class TaskNotDeletableError extends Error {
  constructor(taskId: string, status: TaskStatus) {
    super(`Task cannot be deleted: ${taskId} (status: ${status}). Only cancelled or done tasks can be deleted.`);
    this.name = 'TaskNotDeletableError';
  }
}

export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message not found: ${messageId}`);
    this.name = 'MessageNotFoundError';
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(fromStatus: string, toStatus: string) {
    super(`Invalid status transition from '${fromStatus}' to '${toStatus}'`);
    this.name = 'InvalidStatusTransitionError';
  }
}
