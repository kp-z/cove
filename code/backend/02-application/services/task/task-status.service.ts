import { TaskEntity, TaskStatus } from '../../../01-domain/models/task/task.entity';
import {
  ITaskRepository,
  IEventBus,
  IEventPublisher,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { TaskNotFoundError, InvalidStatusTransitionError } from './task.service';

export class TaskStatusService {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly eventPublisher?: IEventPublisher
  ) {}

  async startTask(taskId: string): Promise<TaskEntity> {
    this.logger.info('Starting task', { taskId });
    const task = await this.findTask(taskId);
    const updated = task.start();
    await this.taskRepository.update(updated);
    await this.publishEvent('task.started', taskId, { taskId });
    await this.publishWsEvent('task_updated', updated.channelId, { taskId, status: updated.status });
    return updated;
  }

  async submitForReview(taskId: string): Promise<TaskEntity> {
    this.logger.info('Submitting task for review', { taskId });
    const task = await this.findTask(taskId);
    const updated = task.submitForReview();
    await this.taskRepository.update(updated);
    await this.publishEvent('task.submitted_for_review', taskId, { taskId });
    return updated;
  }

  async completeTask(taskId: string): Promise<TaskEntity> {
    this.logger.info('Completing task', { taskId });
    const task = await this.findTask(taskId);
    const updated = task.complete();
    await this.taskRepository.update(updated);
    await this.publishEvent('task.completed', taskId, { taskId });
    return updated;
  }

  async blockTask(taskId: string): Promise<TaskEntity> {
    this.logger.info('Blocking task', { taskId });
    const task = await this.findTask(taskId);
    const updated = task.block();
    await this.taskRepository.update(updated);
    await this.publishEvent('task.blocked', taskId, { taskId });
    return updated;
  }

  async cancelTask(taskId: string): Promise<TaskEntity> {
    this.logger.info('Cancelling task', { taskId });
    const task = await this.findTask(taskId);
    const updated = task.cancel();
    await this.taskRepository.update(updated);
    await this.publishEvent('task.cancelled', taskId, { taskId });
    return updated;
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, actorId: string): Promise<TaskEntity> {
    this.logger.info('Updating task status', { taskId, status, actorId });
    const task = await this.findTask(taskId);

    let updated: TaskEntity;
    switch (status) {
      case 'in_progress': updated = task.start(); break;
      case 'in_review': updated = task.submitForReview(); break;
      case 'done': updated = task.complete(); break;
      case 'blocked': updated = task.block(); break;
      case 'cancelled': updated = task.cancel(); break;
      default: throw new InvalidStatusTransitionError(task.status, status);
    }

    await this.taskRepository.update(updated);
    await this.publishEvent('task.status_updated', taskId, {
      taskId, previousStatus: task.status, newStatus: status, actorId,
    });
    await this.publishWsEvent('task_updated', updated.channelId, {
      taskId, previousStatus: task.status, status: updated.status, actorId,
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
