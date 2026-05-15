/**
 * WorkflowService - Workflow 管理业务逻辑（协调器）
 *
 * 职责：
 * - 协调各个子服务完成 Workflow 管理功能
 *
 * 子服务：
 * - WorkflowCrudService: CRUD 操作
 * - WorkflowQueryService: 查询操作
 * - WorkflowLifecycleService: 生命周期管理
 */

import { WorkflowEntity, WorkflowStatus, WorkflowStep } from '../../../domain/models/workflow/workflow.entity';
import { WorkflowCrudService, CreateWorkflowDTO, UpdateWorkflowDTO } from './workflow-crud.service';
import { WorkflowQueryService } from './workflow-query.service';
import { WorkflowLifecycleService } from './workflow-lifecycle.service';

export class WorkflowService {
  constructor(
    private readonly crudService: WorkflowCrudService,
    private readonly queryService: WorkflowQueryService,
    private readonly lifecycleService: WorkflowLifecycleService
  ) {}

  async createWorkflow(dto: CreateWorkflowDTO): Promise<WorkflowEntity> {
    return this.crudService.createWorkflow(dto);
  }

  async getWorkflowById(workflowId: string): Promise<WorkflowEntity> {
    return this.queryService.getWorkflowById(workflowId);
  }

  async getWorkflowsByProject(projectId: string): Promise<WorkflowEntity[]> {
    return this.queryService.getWorkflowsByProject(projectId);
  }

  async getWorkflowsByKR(krId: string): Promise<WorkflowEntity[]> {
    return this.queryService.getWorkflowsByKR(krId);
  }

  async getWorkflowsByStatus(status: WorkflowStatus): Promise<WorkflowEntity[]> {
    return this.queryService.getWorkflowsByStatus(status);
  }

  async getActiveWorkflows(): Promise<WorkflowEntity[]> {
    return this.queryService.getActiveWorkflows();
  }

  async updateWorkflow(workflowId: string, dto: UpdateWorkflowDTO): Promise<WorkflowEntity> {
    return this.crudService.updateWorkflow(workflowId, dto);
  }

  async activateWorkflow(workflowId: string): Promise<WorkflowEntity> {
    return this.lifecycleService.activateWorkflow(workflowId);
  }

  async pauseWorkflow(workflowId: string): Promise<WorkflowEntity> {
    return this.lifecycleService.pauseWorkflow(workflowId);
  }

  async resumeWorkflow(workflowId: string): Promise<WorkflowEntity> {
    return this.lifecycleService.resumeWorkflow(workflowId);
  }

  async completeWorkflow(workflowId: string): Promise<WorkflowEntity> {
    return this.lifecycleService.completeWorkflow(workflowId);
  }

  async archiveWorkflow(workflowId: string): Promise<WorkflowEntity> {
    return this.lifecycleService.archiveWorkflow(workflowId);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.crudService.deleteWorkflow(workflowId);
  }

  async getWorkflowSteps(workflowId: string): Promise<readonly (readonly WorkflowStep[])[]> {
    return this.queryService.getWorkflowSteps(workflowId);
  }
}

export type { CreateWorkflowDTO, UpdateWorkflowDTO };
