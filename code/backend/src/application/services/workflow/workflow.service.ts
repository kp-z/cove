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
import { ServerContext } from '../../context/server-context';

export class WorkflowService {
  constructor(
    private readonly crudService: WorkflowCrudService,
    private readonly queryService: WorkflowQueryService,
    private readonly lifecycleService: WorkflowLifecycleService
  ) {}

  async createWorkflow(dto: CreateWorkflowDTO, context: ServerContext): Promise<WorkflowEntity> {
    return this.crudService.createWorkflow(dto, context);
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

  async updateWorkflow(workflowId: string, dto: UpdateWorkflowDTO, context: ServerContext): Promise<WorkflowEntity> {
    return this.crudService.updateWorkflow(workflowId, dto, context);
  }

  async activateWorkflow(workflowId: string, context: ServerContext): Promise<WorkflowEntity> {
    return this.lifecycleService.activateWorkflow(workflowId, context);
  }

  async pauseWorkflow(workflowId: string, context: ServerContext): Promise<WorkflowEntity> {
    return this.lifecycleService.pauseWorkflow(workflowId, context);
  }

  async resumeWorkflow(workflowId: string, context: ServerContext): Promise<WorkflowEntity> {
    return this.lifecycleService.resumeWorkflow(workflowId, context);
  }

  async completeWorkflow(workflowId: string, context: ServerContext): Promise<WorkflowEntity> {
    return this.lifecycleService.completeWorkflow(workflowId, context);
  }

  async archiveWorkflow(workflowId: string, context: ServerContext): Promise<WorkflowEntity> {
    return this.lifecycleService.archiveWorkflow(workflowId, context);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    return this.crudService.deleteWorkflow(workflowId);
  }

  async getWorkflowSteps(workflowId: string): Promise<readonly (readonly WorkflowStep[])[]> {
    return this.queryService.getWorkflowSteps(workflowId);
  }
}

export type { CreateWorkflowDTO, UpdateWorkflowDTO };
