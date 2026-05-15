/**
 * WorkflowLifecycleService - Workflow 生命周期管理
 */

import { WorkflowEntity } from '../../../domain/models/workflow/workflow.entity';
import {
  IWorkflowRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { WorkflowNotFoundError } from './workflow.errors';

export class WorkflowLifecycleService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async activateWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Activating workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const activatedWorkflow = workflow.activate();

    await this.workflowRepository.update(activatedWorkflow);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.activated',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: { workflowId },
    });

    this.logger.info('Workflow activated successfully', { workflowId });

    return activatedWorkflow;
  }

  async pauseWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Pausing workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const pausedWorkflow = workflow.pause();

    await this.workflowRepository.update(pausedWorkflow);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.paused',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: { workflowId },
    });

    this.logger.info('Workflow paused successfully', { workflowId });

    return pausedWorkflow;
  }

  async resumeWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Resuming workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const resumedWorkflow = workflow.resume();

    await this.workflowRepository.update(resumedWorkflow);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.resumed',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: { workflowId },
    });

    this.logger.info('Workflow resumed successfully', { workflowId });

    return resumedWorkflow;
  }

  async completeWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Completing workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const completedWorkflow = workflow.complete();

    await this.workflowRepository.update(completedWorkflow);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.completed',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: { workflowId },
    });

    this.logger.info('Workflow completed successfully', { workflowId });

    return completedWorkflow;
  }

  async archiveWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Archiving workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    const archivedWorkflow = workflow.archive();

    await this.workflowRepository.update(archivedWorkflow);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.archived',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: { workflowId },
    });

    this.logger.info('Workflow archived successfully', { workflowId });

    return archivedWorkflow;
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
