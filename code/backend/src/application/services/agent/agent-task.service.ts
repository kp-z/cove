/**
 * AgentTaskService - Agent 任务分配
 */

import { TaskEntity } from '../../../domain/models/task/task.entity';
import { AssigneeRef } from '../../../domain/models/value-objects';
import {
  IAgentRepository,
  ITaskRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { AgentNotFoundError, AgentNotAvailableError } from './agent.errors';
import { TaskNotFoundError, TaskNotAssignableError } from '../task/task.errors';

export interface AgentAssignTaskDTO {
  readonly taskId: string;
  readonly agentId: string;
}

export class AgentTaskService {
  constructor(
    private readonly agentRepository: IAgentRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async assignTask(dto: AgentAssignTaskDTO): Promise<TaskEntity> {
    this.logger.info('Assigning task to agent', { ...dto });

    const agent = await this.agentRepository.findById(dto.agentId);
    if (!agent) {
      throw new AgentNotFoundError(dto.agentId);
    }

    if (agent.status !== 'idle' && agent.status !== 'active') {
      throw new AgentNotAvailableError(dto.agentId, agent.status);
    }

    const task = await this.taskRepository.findById(dto.taskId);
    if (!task) {
      throw new TaskNotFoundError(dto.taskId);
    }

    if (task.status !== 'todo') {
      throw new TaskNotAssignableError(dto.taskId, task.status);
    }

    const assignee = AssigneeRef.create({
      id: dto.agentId,
      type: 'agent',
      assignedAt: new Date(),
    });

    const assignedTask = task.claim(assignee);

    await this.taskRepository.update(assignedTask);

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

    this.logger.info('Task assigned to agent successfully', { ...dto });

    return assignedTask;
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
    }
  }
}
