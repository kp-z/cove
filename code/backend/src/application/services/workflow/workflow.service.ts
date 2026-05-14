/**
 * WorkflowService - Workflow 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Workflow
 * - 启动和执行 Workflow
 * - 管理 Workflow 状态（draft → active → paused → completed）
 * - 管理 Workflow 触发器
 *
 * 依赖：
 * - IWorkflowRepository: Workflow 数据访问
 * - ITaskRepository: Task 数据访问
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { WorkflowEntity, WorkflowStatus, WorkflowStep, WorkflowTrigger } from '../../../domain/models/workflow/workflow.entity';
import { TaskEntity } from '../../../domain/models/task/task.entity';
import {
  IWorkflowRepository,
  ITaskRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { TaskNotFoundError } from '../task/task.errors';

export interface CreateWorkflowDTO {
  readonly name: string;
  readonly description?: string;
  readonly krId?: string;
  readonly projectId: string;
  readonly steps: readonly (readonly WorkflowStep[])[];
  readonly triggers?: readonly WorkflowTrigger[];
  readonly createdBy: string;
}

export interface UpdateWorkflowDTO {
  readonly name?: string;
  readonly description?: string;
}


import { WorkflowTriggerService } from './workflow-trigger.service';

export class WorkflowService {
  private readonly triggerService: WorkflowTriggerService;

  constructor(
    private readonly workflowRepository: IWorkflowRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {
    this.triggerService = new WorkflowTriggerService(workflowRepository, eventBus, logger);
  }

  /**
   * 创建新 Workflow
   */
  async createWorkflow(dto: CreateWorkflowDTO): Promise<WorkflowEntity> {
    this.logger.info('Creating new workflow', { name: dto.name });

    // 生成 Workflow ID
    const workflowId = this.generateWorkflowId();

    // 验证所有 Task 存在
    await this.validateWorkflowSteps(dto.steps);

    // 创建 Workflow 实体
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

    // 保存到数据库
    await this.workflowRepository.save(workflow);

    // 发布事件
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

  /**
   * 根据 ID 获取 Workflow
   */
  async getWorkflowById(workflowId: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    return workflow;
  }

  /**
   * 根据 Project 获取 Workflows
   */
  async getWorkflowsByProject(projectId: string): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findByProject(projectId);
  }

  /**
   * 根据 KR 获取 Workflows
   */
  async getWorkflowsByKR(krId: string): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findByKR(krId);
  }

  /**
   * 根据状态获取 Workflows
   */
  async getWorkflowsByStatus(status: WorkflowStatus): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findByStatus(status);
  }

  /**
   * 获取所有激活的 Workflows
   */
  async getActiveWorkflows(): Promise<WorkflowEntity[]> {
    return await this.workflowRepository.findActive();
  }

  /**
   * 更新 Workflow
   */
  async updateWorkflow(workflowId: string, dto: UpdateWorkflowDTO): Promise<WorkflowEntity> {
    this.logger.info('Updating workflow', { workflowId });

    // 获取现有 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 创建更新后的 Workflow（不可变更新）
    let updatedWorkflow = workflow;

    if (dto.name !== undefined) {
      updatedWorkflow = updatedWorkflow.updateName(dto.name);
    }

    if (dto.description !== undefined) {
      updatedWorkflow = updatedWorkflow.updateDescription(dto.description);
    }

    // 保存更新
    await this.workflowRepository.update(updatedWorkflow);

    // 发布事件
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

  /**
   * 激活 Workflow
   */
  async activateWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Activating workflow', { workflowId });

    // 获取 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 激活（Domain 层业务规则）
    const activatedWorkflow = workflow.activate();

    // 保存更新
    await this.workflowRepository.update(activatedWorkflow);

    // 发布事件
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

  /**
   * 暂停 Workflow
   */
  async pauseWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Pausing workflow', { workflowId });

    // 获取 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 暂停（Domain 层业务规则）
    const pausedWorkflow = workflow.pause();

    // 保存更新
    await this.workflowRepository.update(pausedWorkflow);

    // 发布事件
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

  /**
   * 恢复 Workflow
   */
  async resumeWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Resuming workflow', { workflowId });

    // 获取 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 恢复（Domain 层业务规则）
    const resumedWorkflow = workflow.resume();

    // 保存更新
    await this.workflowRepository.update(resumedWorkflow);

    // 发布事件
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

  /**
   * 完成 Workflow
   */
  async completeWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Completing workflow', { workflowId });

    // 获取 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 完成（Domain 层业务规则）
    const completedWorkflow = workflow.complete();

    // 保存更新
    await this.workflowRepository.update(completedWorkflow);

    // 发布事件
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

  /**
   * 归档 Workflow
   */
  async archiveWorkflow(workflowId: string): Promise<WorkflowEntity> {
    this.logger.info('Archiving workflow', { workflowId });

    // 获取 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 归档（Domain 层业务规则）
    const archivedWorkflow = workflow.archive();

    // 保存更新
    await this.workflowRepository.update(archivedWorkflow);

    // 发布事件
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

  async deleteWorkflow(workflowId: string): Promise<void> {
    this.logger.info('Deleting workflow', { workflowId });

    // 获取 Workflow
    const workflow = await this.getWorkflowById(workflowId);

    // 检查状态（只能删除已归档的 Workflow）
    if (workflow.status !== 'archived') {
      throw new WorkflowNotArchivedError(workflowId);
    }

    // 删除
    await this.workflowRepository.delete(workflowId);

    // 发布事件
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

  /**
   * 获取 Workflow 的所有 Steps
   */
  async getWorkflowSteps(workflowId: string): Promise<readonly (readonly WorkflowStep[])[]> {
    const workflow = await this.getWorkflowById(workflowId);
    return workflow.steps;
  }

  // --- Private helpers ---

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
      // 不抛出异常，避免影响主流程
    }
  }
}

// --- Application Layer Errors ---

export class WorkflowNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Workflow not found: ${workflowId}`);
    this.name = 'WorkflowNotFoundError';
  }
}

export class WorkflowNotArchivedError extends Error {
  constructor(workflowId: string) {
    super(`Workflow must be archived before deletion: ${workflowId}`);
    this.name = 'WorkflowNotArchivedError';
  }
}
