/**
 * IExecutionRepository - Execution Repository 接口
 *
 * Application Layer 通过此接口访问 Execution 数据。
 */

import { ExecutionEntity, ExecutionStatus } from '../../../domain/models/execution/execution.entity';

export interface IExecutionRepository {
  /**
   * 根据 ID 查找 Execution
   * @param executionId - Execution ID
   * @returns Execution 实体，不存在返回 null
   */
  findById(executionId: string): Promise<ExecutionEntity | null>;

  /**
   * 根据 Agent 查找 Executions
   * @param agentId - Agent ID
   * @param limit - 限制数量
   * @returns Execution 实体数组
   */
  findByAgent(agentId: string, limit?: number): Promise<ExecutionEntity[]>;

  /**
   * 根据 Task 查找 Executions
   * @param taskId - Task ID
   * @returns Execution 实体数组
   */
  findByTask(taskId: string): Promise<ExecutionEntity[]>;

  /**
   * 根据 Conversation 查找 Executions
   * @param conversationId - Conversation ID
   * @returns Execution 实体数组
   */
  findByConversation(conversationId: string): Promise<ExecutionEntity[]>;

  /**
   * 根据状态查找 Executions
   * @param status - Execution 状态
   * @returns Execution 实体数组
   */
  findByStatus(status: ExecutionStatus): Promise<ExecutionEntity[]>;

  /**
   * 查找正在运行的 Executions
   * @returns Execution 实体数组
   */
  findRunning(): Promise<ExecutionEntity[]>;

  /**
   * 查找最近的 Executions
   * @param limit - 限制数量
   * @returns Execution 实体数组
   */
  findRecent(limit: number): Promise<ExecutionEntity[]>;

  /**
   * 保存新 Execution
   * @param execution - Execution 实体
   */
  save(execution: ExecutionEntity): Promise<void>;

  /**
   * 更新 Execution
   * @param execution - Execution 实体
   */
  update(execution: ExecutionEntity): Promise<void>;

  /**
   * 删除 Execution
   * @param executionId - Execution ID
   */
  delete(executionId: string): Promise<void>;

  /**
   * 检查 Execution 是否存在
   * @param executionId - Execution ID
   * @returns 是否存在
   */
  exists(executionId: string): Promise<boolean>;
}
