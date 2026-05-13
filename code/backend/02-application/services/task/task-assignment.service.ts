import { TaskEntity, TaskStatus } from '../../../01-domain/models/task/task.entity';
import { AgentEntity } from '../../../01-domain/models/agent/agent.entity';
import { AssigneeRef } from '../../../01-domain/models/value-objects';
import {
  ITaskRepository,
  IAgentRepository,
  IEventBus,
  IEventPublisher,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { TaskNotFoundError, TaskNotAssignableError, AgentNotFoundError } from './task.service';

export interface AssignTaskDTO {
  readonly taskId: string;
  readonly assigneeId: string;
  readonly assigneeType: 'agent' | 'human';
}

export interface ClaimTaskDTO {
  readonly taskId: string;
  readonly assigneeId: string;
  readonly assigneeType: 'agent' | 'human';
}

export interface AddDependencyDTO {
  readonly taskId: string;
  readonly dependsOnTaskId: string;
}

export interface RemoveDependencyDTO {
  readonly taskId: string;
  readonly dependsOnTaskId: string;
}

export class TaskAssignmentService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly eventPublisher?: IEventPublisher
  ) {}

  async assignTask(dto: AssignTaskDTO): Promise<TaskEntity> {
    this.logger.info('Assigning task', dto);
    const task = await this.findTask(dto.taskId);

    if (task.status !== 'todo') {
      throw new TaskNotAssignableError(dto.taskId, task.status);
    }

    if (dto.assigneeType === 'agent') {
      const agent = await this.agentRepository.findById(dto.assigneeId);
      if (!agent) throw new AgentNotFoundError(dto.assigneeId);
    }

    const assignee = AssigneeRef.create({
      id: dto.assigneeId,
      type: dto.assigneeType,
      assignedAt: new Date(),
    });

    const assigned = task.assignTo(assignee);
    await this.taskRepository.update(assigned);

    await this.publishEvent('task.assigned', dto.taskId, {
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      assigneeType: dto.assigneeType,
    });

    return assigned;
  }

  async claimTask(dto: ClaimTaskDTO): Promise<TaskEntity> {
    this.logger.info('Claiming task', dto);
    const task = await this.findTask(dto.taskId);

    if (task.status !== 'todo') {
      throw new TaskNotAssignableError(dto.taskId, task.status);
    }

    if (dto.assigneeType === 'agent') {
      const agent = await this.agentRepository.findById(dto.assigneeId);
      if (!agent) throw new AgentNotFoundError(dto.assigneeId);
    }

    const assignee = AssigneeRef.create({
      id: dto.assigneeId,
      type: dto.assigneeType,
      assignedAt: new Date(),
    });

    const claimed = task.assignTo(assignee).start();
    await this.taskRepository.update(claimed);

    await this.publishEvent('task.claimed', dto.taskId, {
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      assigneeType: dto.assigneeType,
    });

    await this.publishWsEvent('task_claimed', claimed.channelId, {
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      assigneeType: dto.assigneeType,
      status: claimed.status,
    });

    return claimed;
  }

  async unclaimTask(taskId: string, userId: string): Promise<TaskEntity> {
    this.logger.info('Unclaiming task', { taskId, userId });
    const task = await this.findTask(taskId);
    const unclaimed = task.unclaim(userId);
    await this.taskRepository.update(unclaimed);

    await this.publishEvent('task.unclaimed', taskId, { taskId, userId });
    await this.publishWsEvent('task_updated', unclaimed.channelId, {
      taskId, userId, status: unclaimed.status,
    });

    return unclaimed;
  }

  async addDependency(dto: AddDependencyDTO): Promise<TaskEntity> {
    this.logger.info('Adding task dependency', dto);
    const task = await this.findTask(dto.taskId);
    await this.findTask(dto.dependsOnTaskId);
    const updated = task.addDependency(dto.dependsOnTaskId);
    await this.taskRepository.update(updated);

    await this.publishEvent('task.dependency_added', dto.taskId, {
      taskId: dto.taskId, dependsOnTaskId: dto.dependsOnTaskId,
    });

    return updated;
  }

  async removeDependency(dto: RemoveDependencyDTO): Promise<TaskEntity> {
    this.logger.info('Removing task dependency', dto);
    const task = await this.findTask(dto.taskId);
    const updated = task.removeDependency(dto.dependsOnTaskId);
    await this.taskRepository.update(updated);

    await this.publishEvent('task.dependency_removed', dto.taskId, {
      taskId: dto.taskId, dependsOnTaskId: dto.dependsOnTaskId,
    });

    return updated;
  }

  private async findTask(taskId: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new TaskNotFoundError(taskId);
    return task;
  }

  private async publishEvent(eventType: string, aggregateId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.eventBus.publish({
        eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        eventType, aggregateId, aggregateType: 'Task', occurredAt: new Date(), payload,
      });
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, { eventType, aggregateId });
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
