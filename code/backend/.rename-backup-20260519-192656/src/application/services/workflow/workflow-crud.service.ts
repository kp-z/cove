/**
 * WorkflowCrudService - Workflow CRUD 操作
 */

import { WorkflowEntity, WorkflowStep } from '../../../domain/models/workflow/workflow.entity';
import {
  IWorkflowRepository,
  ITaskRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { WorkflowNotFoundError, WorkflowNotArchivedError } from './workflow.errors';
import { TaskNotFoundError } from '../task/task.errors';
import { getServerContext } from '../../context/server-context-store';

export interface CreateWorkflowDTO {
  readonly name: string;
  readonly description?: string;
  readonly krId?: string;
  readonly projectId: string;
  readonly steps: readonly (readonly WorkflowStep[])[];
  readonly triggers?: readonly import('../../../domain/models/workflow/workflow.entity').WorkflowTrigger[];
  readonly createdBy: string;
}

export interface UpdateWorkflowDTO {
  readonly name?: string;
  readonly description?: string;
}

export class WorkflowCrudService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createWorkflow(dto: CreateWorkflowDTO): Promise<WorkflowEntity> {
      const context = getServerContext();
    this.logger.info('Creating new workflow', { name: dto.name });

    const workflowId = this.generateWorkflowId();

    await this.validateWorkflowSteps(dto.steps);

    const workflow = WorkflowEntity.create({
      workflowId,
      name: dto.name,
      description: dto.description,
      krId: dto.krId,
      projectId: dto.projectId,
      status: 'draft',
      steps: dto.steps,
      triggers: dto.triggers || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: dto.createdBy,
        type: 'human',
      },
      meta: {
        tags: [],
      },
    });

    await this.workflowRepository.save(workflow, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.created',
      aggregateId: workflow.workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: {
        workflowId: workflow.workflowId,
        name: workflow.name,
        projectId: dto.projectId,
        createdBy: dto.createdBy,
      },
    });

    this.logger.info('Workflow created successfully', { workflowId: workflow.workflowId });

    return workflow;
  }

  async updateWorkflow(workflowId: string, dto: UpdateWorkflowDTO): Promise<WorkflowEntity> {
      const context = getServerContext();
    this.logger.info('Updating workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    let updatedWorkflow = workflow;

    if (dto.name !== undefined) {
      updatedWorkflow = updatedWorkflow.updateName(dto.name);
    }

    if (dto.description !== undefined) {
      updatedWorkflow = updatedWorkflow.updateDescription(dto.description);
    }

    await this.workflowRepository.update(updatedWorkflow, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.updated',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: {
        workflowId,
        changes: dto,
      },
    });

    this.logger.info('Workflow updated successfully', { workflowId });

    return updatedWorkflow;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    this.logger.info('Deleting workflow', { workflowId });

    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }

    if (workflow.status !== 'archived') {
      throw new WorkflowNotArchivedError(workflowId);
    }

    await this.workflowRepository.delete(workflowId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'workflow.deleted',
      aggregateId: workflowId,
      aggregateType: 'Workflow',
      occurredAt: new Date(),
      payload: { workflowId },
    });

    this.logger.info('Workflow deleted successfully', { workflowId });
  }

  private async validateWorkflowSteps(steps: readonly (readonly WorkflowStep[])[]): Promise<void> {
    for (const stage of steps) {
      for (const step of stage) {
        const task = await this.taskRepository.findById(step.taskId);
        if (!task) {
          throw new TaskNotFoundError(step.taskId);
        }
      }
    }
  }

  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
