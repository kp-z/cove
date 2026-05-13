/**
 * IWorkflowRepository - Workflow Repository 接口
 *
 * Application Layer 通过此接口访问 Workflow 数据。
 */

import { WorkflowEntity, WorkflowStatus } from '../../../domain/models/workflow/workflow.entity';

export interface IWorkflowRepository {
  /**
   * 根据 ID 查找 Workflow
   * @param workflowId - Workflow ID
   * @returns Workflow 实体，不存在返回 null
   */
  findById(workflowId: string): Promise<WorkflowEntity | null>;

  /**
   * 根据项目查找 Workflows
   * @param projectId - Project ID
   * @returns Workflow 实体数组
   */
  findByProject(projectId: string): Promise<WorkflowEntity[]>;

  /**
   * 根据 KR 查找 Workflows
   * @param krId - KR ID
   * @returns Workflow 实体数组
   */
  findByKR(krId: string): Promise<WorkflowEntity[]>;

  /**
   * 根据状态查找 Workflows
   * @param status - Workflow 状态
   * @returns Workflow 实体数组
   */
  findByStatus(status: WorkflowStatus): Promise<WorkflowEntity[]>;

  /**
   * 查找所有激活的 Workflows
   * @returns Workflow 实体数组
   */
  findActive(): Promise<WorkflowEntity[]>;

  /**
   * 查找所有 Workflows
   * @returns Workflow 实体数组
   */
  findAll(): Promise<WorkflowEntity[]>;

  /**
   * 保存新 Workflow
   * @param workflow - Workflow 实体
   */
  save(workflow: WorkflowEntity): Promise<void>;

  /**
   * 更新 Workflow
   * @param workflow - Workflow 实体
   */
  update(workflow: WorkflowEntity): Promise<void>;

  /**
   * 删除 Workflow
   * @param workflowId - Workflow ID
   */
  delete(workflowId: string): Promise<void>;

  /**
   * 检查 Workflow 是否存在
   * @param workflowId - Workflow ID
   * @returns 是否存在
   */
  exists(workflowId: string): Promise<boolean>;
}
