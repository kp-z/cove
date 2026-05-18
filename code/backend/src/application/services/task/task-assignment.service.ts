import { TaskEntity } from '../../../domain/models/task/task.entity';
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
    private readonly logger: ILogger
  ) {}

  async assignTask(dto: AssignTaskDTO, context: ServerContext): Promise<TaskEntity> {
    // TODO: Fix logger call
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
    await this.taskRepository.update(assigned, context.serverId);

    await this.publishEvent('task.assigned', dto.taskId, {
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      assigneeType: dto.assigneeType,
    });

    return assigned;
  }

  async claimTask(dto: ClaimTaskDTO, context: ServerContext): Promise<TaskEntity> {
    // TODO: Fix logger call
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
    await this.taskRepository.update(claimed, context.serverId);

    await this.publishEvent('task.claimed', dto.taskId, {
      taskId: dto.taskId,
      assigneeId: dto.assigneeId,
      assigneeType: dto.assigneeType,
    });

    return claimed;
  }

  async unclaimTask(taskId: string, userId: string, context: ServerContext): Promise<TaskEntity> {
    this.logger.info('Unclaiming task', { taskId, userId });
    const task = await this.findTask(taskId);
    const unclaimed = task.unclaim(userId);
    await this.taskRepository.update(unclaimed, context.serverId);

    await this.publishEvent('task.unclaimed', taskId, { taskId, userId });

    return unclaimed;
  }

  async addDependency(dto: AddDependencyDTO, context: ServerContext): Promise<TaskEntity> {
    // TODO: Fix logger call
    const task = await this.findTask(dto.taskId);
    await this.findTask(dto.dependsOnTaskId);
    const updated = task.addDependency(dto.dependsOnTaskId);
    await this.taskRepository.update(updated, context.serverId);

    await this.publishEvent('task.dependency_added', dto.taskId, {
      taskId: dto.taskId, dependsOnTaskId: dto.dependsOnTaskId,
    });

    return updated;
  }

  async removeDependency(dto: RemoveDependencyDTO, context: ServerContext): Promise<TaskEntity> {
    // TODO: Fix logger call
    const task = await this.findTask(dto.taskId);
    const updated = task.removeDependency(dto.dependsOnTaskId);
    await this.taskRepository.update(updated, context.serverId);

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
}
