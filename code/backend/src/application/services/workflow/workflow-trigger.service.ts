import { WorkflowEntity, WorkflowTrigger } from '../../../domain/models/workflow/workflow.entity';
import { IWorkflowRepository, IEventBus, ILogger } from '../../interfaces';
import { WorkflowNotFoundError } from './workflow.service';

export interface AddTriggerDTO {
  readonly workflowId: string;
  readonly trigger: WorkflowTrigger;
}

export interface UpdateTriggerDTO {
  readonly workflowId: string;
  readonly triggerIndex: number;
  readonly trigger: WorkflowTrigger;
}

export interface EnableTriggerDTO {
  readonly workflowId: string;
  readonly triggerIndex: number;
}

export interface DisableTriggerDTO {
  readonly workflowId: string;
  readonly triggerIndex: number;
}

export class WorkflowTriggerService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async addTrigger(dto: AddTriggerDTO): Promise<WorkflowEntity> {
    this.logger.info('Adding trigger to workflow', { workflowId: dto.workflowId });
    const workflow = await this.findWorkflow(dto.workflowId);
    const updated = workflow.addTrigger(dto.trigger);
    await this.workflowRepository.update(updated);
    await this.publishEvent('workflow.trigger_added', dto.workflowId, {
      workflowId: dto.workflowId, trigger: dto.trigger,
    });
    return updated;
  }

  async updateTrigger(dto: UpdateTriggerDTO): Promise<WorkflowEntity> {
    this.logger.info('Updating trigger', { workflowId: dto.workflowId, triggerIndex: dto.triggerIndex });
    const workflow = await this.findWorkflow(dto.workflowId);
    const updated = workflow.updateTrigger(dto.triggerIndex, dto.trigger);
    await this.workflowRepository.update(updated);
    await this.publishEvent('workflow.trigger_updated', dto.workflowId, {
      workflowId: dto.workflowId, triggerIndex: dto.triggerIndex, trigger: dto.trigger,
    });
    return updated;
  }

  async enableTrigger(dto: EnableTriggerDTO): Promise<WorkflowEntity> {
    this.logger.info('Enabling trigger', { workflowId: dto.workflowId, triggerIndex: dto.triggerIndex });
    const workflow = await this.findWorkflow(dto.workflowId);
    const updated = workflow.enableTrigger(dto.triggerIndex);
    await this.workflowRepository.update(updated);
    await this.publishEvent('workflow.trigger_enabled', dto.workflowId, {
      workflowId: dto.workflowId, triggerIndex: dto.triggerIndex,
    });
    return updated;
  }

  async disableTrigger(dto: DisableTriggerDTO): Promise<WorkflowEntity> {
    this.logger.info('Disabling trigger', { workflowId: dto.workflowId, triggerIndex: dto.triggerIndex });
    const workflow = await this.findWorkflow(dto.workflowId);
    const updated = workflow.disableTrigger(dto.triggerIndex);
    await this.workflowRepository.update(updated);
    await this.publishEvent('workflow.trigger_disabled', dto.workflowId, {
      workflowId: dto.workflowId, triggerIndex: dto.triggerIndex,
    });
    return updated;
  }

  async getWorkflowTriggers(workflowId: string): Promise<readonly WorkflowTrigger[]> {
    const workflow = await this.findWorkflow(workflowId);
    return workflow.triggers;
  }

  async getEnabledTriggers(workflowId: string): Promise<readonly WorkflowTrigger[]> {
    const workflow = await this.findWorkflow(workflowId);
    return workflow.triggers.filter(t => t.enabled);
  }

  private async findWorkflow(workflowId: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) throw new WorkflowNotFoundError(workflowId);
    return workflow;
  }

  private async publishEvent(eventType: string, aggregateId: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await this.eventBus.publish({
        eventId: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        eventType, aggregateId, aggregateType: 'Workflow', occurredAt: new Date(), payload,
      });
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, { eventType, aggregateId });
    }
  }
}
