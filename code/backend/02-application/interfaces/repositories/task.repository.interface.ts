/**
 * ITaskRepository - Task Repository 接口
 *
 * Application Layer 通过此接口访问 Task 数据。
 */

import { TaskEntity, TaskStatus, TaskPriority } from '../../../01-domain/models/task/task.entity';

export interface ITaskRepository {
  /**
   * 根据 ID 查找 Task
   * @param taskId - Task ID
   * @returns Task 实体，不存在返回 null
   */
  findById(taskId: string): Promise<TaskEntity | null>;

  /**
   * 根据频道查找 Tasks
   * @param channelId - Channel ID
   * @returns Task 实体数组
   */
  findByChannel(channelId: string): Promise<TaskEntity[]>;

  /**
   * 获取频道内下一个 Task 编号
   * @param channelId - Channel ID
   * @returns 下一个可用的 task number
   */
  getNextTaskNumber(channelId: string): Promise<number>;

  /**
   * 根据项目查找 Tasks
   * @param projectId - Project ID
   * @returns Task 实体数组
   */
  findByProject(projectId: string): Promise<TaskEntity[]>;

  /**
   * 根据状态查找 Tasks
   * @param status - Task 状态
   * @returns Task 实体数组
   */
  findByStatus(status: TaskStatus): Promise<TaskEntity[]>;

  /**
   * 根据优先级查找 Tasks
   * @param priority - Task 优先级
   * @returns Task 实体数组
   */
  findByPriority(priority: TaskPriority): Promise<TaskEntity[]>;

  /**
   * 根据分配者查找 Tasks
   * @param assigneeId - 分配者 ID
   * @returns Task 实体数组
   */
  findByAssignee(assigneeId: string): Promise<TaskEntity[]>;

  /**
   * 根据 KR 查找 Tasks
   * @param krId - KR ID
   * @returns Task 实体数组
   */
  findByKR(krId: string): Promise<TaskEntity[]>;

  /**
   * 保存新 Task
   * @param task - Task 实体
   */
  save(task: TaskEntity): Promise<void>;

  /**
   * 更新 Task
   * @param task - Task 实体
   */
  update(task: TaskEntity): Promise<void>;

  /**
   * 删除 Task
   * @param taskId - Task ID
   */
  delete(taskId: string): Promise<void>;

  /**
   * 检查 Task 是否存在
   * @param taskId - Task ID
   * @returns 是否存在
   */
  exists(taskId: string): Promise<boolean>;
}
