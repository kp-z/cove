/**
 * WorkflowQueryService - Workflow 查询操作
 */

import { WorkflowEntity, WorkflowStatus, WorkflowStep } from '../../../domain/models/workflow/workflow.entity';
import { IWorkflowRepository } from '../../interfaces';
import { WorkflowNotFoundError } from './workflow.errors';

export class WorkflowQueryService {
  constructor(
    private readonly workflowRepository: IWorkflowRepository
  ) {}

  async getWorkflowById(workflowId: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    return workflow;
  }

  async getWorkflowsByProject(projectId: string): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findByProject(projectId);
  }

  async getWorkflowsByKR(krId: string): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findByKR(krId);
  }

  async getWorkflowsByStatus(status: WorkflowStatus): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findByStatus(status);
  }

  async getActiveWorkflows(): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findActive();
  }

  async getWorkflowSteps(workflowId: string): Promise<readonly (readonly WorkflowStep[])[]> {
    const workflow = await this.getWorkflowById(workflowId);
    return workflow.steps;
  }
}
