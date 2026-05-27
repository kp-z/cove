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
   * @param realmId - Realm ID
   * @returns Workflow 实体，不存在返回 null
   */
  findById(workflowId: string, realmId: string): Promise<WorkflowEntity | null>;

  /**
   * 根据项目查找 Workflows
   * @param projectId - Project ID
   * @param realmId - Realm ID
   * @returns Workflow 实体数组
   */
  findByProject(projectId: string, realmId: string): Promise<WorkflowEntity[]>;

  /**
   * 根据 KR 查找 Workflows
   * @param krId - KR ID
   * @param realmId - Realm ID
   * @returns Workflow 实体数组
   */
  findByKR(krId: string, realmId: string): Promise<WorkflowEntity[]>;

  /**
   * 根据状态查找 Workflows
   * @param status - Workflow 状态
   * @param realmId - Realm ID
   * @returns Workflow 实体数组
   */
  findByStatus(status: WorkflowStatus, realmId: string): Promise<WorkflowEntity[]>;

  /**
   * 查找所有激活的 Workflows
   * @param realmId - Realm ID
   * @returns Workflow 实体数组
   */
  findActive(realmId: string): Promise<WorkflowEntity[]>;

  /**
   * 查找所有 Workflows
   * @param realmId - Realm ID
   * @returns Workflow 实体数组
   */
  findAll(realmId: string): Promise<WorkflowEntity[]>;

  /**
   * 保存新 Workflow
   * @param workflow - Workflow 实体
   * @param realmId - Server ID
   */
  save(workflow: WorkflowEntity, realmId: string): Promise<void>;

  /**
   * 更新 Workflow
   * @param workflow - Workflow 实体
   * @param realmId - Server ID
   */
  update(workflow: WorkflowEntity, realmId: string): Promise<void>;

  /**
   * 删除 Workflow
   * @param workflowId - Workflow ID
   * @param realmId - Realm ID
   */
  delete(workflowId: string, realmId: string): Promise<void>;

  /**
   * 检查 Workflow 是否存在
   * @param workflowId - Workflow ID
   * @param realmId - Realm ID
   * @returns 是否存在
   */
  exists(workflowId: string, realmId: string): Promise<boolean>;
}
