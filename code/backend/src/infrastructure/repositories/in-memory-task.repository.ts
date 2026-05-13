/**
 * InMemoryTaskRepository - Task Repository 的内存实现
 *
 * MVP 阶段使用 Map 存储数据，后续可替换为 Prisma/TypeORM 实现。
 * 实现 ITaskRepository 接口，遵循依赖倒置原则。
 */

import { ITaskRepository } from '../../application/interfaces/repositories/task.repository.interface';
import { TaskEntity, TaskStatus, TaskPriority } from '../../domain/models/task/task.entity';

export class InMemoryTaskRepository implements ITaskRepository {
  private tasks: Map<string, TaskEntity> = new Map();
  private channelTaskNumbers: Map<string, number> = new Map();

  /**
   * 根据 ID 查找 Task
   */
  async findById(taskId: string): Promise<TaskEntity | null> {
    const task = this.tasks.get(taskId);
    return task || null;
  }

  /**
   * 根据频道查找 Tasks
   */
  async findByChannel(channelId: string): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.channelId === channelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 获取频道内下一个 Task 编号
   */
  async getNextTaskNumber(channelId: string): Promise<number> {
    const current = this.channelTaskNumbers.get(channelId) ?? 0;
    const next = current + 1;
    this.channelTaskNumbers.set(channelId, next);
    return next;
  }

  /**
   * 根据项目查找 Tasks
   */
  async findByProject(projectId: string): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 根据状态查找 Tasks
   */
  async findByStatus(status: TaskStatus): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 根据优先级查找 Tasks
   */
  async findByPriority(priority: TaskPriority): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.priority === priority)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 根据分配者查找 Tasks
   */
  async findByAssignee(assigneeId: string): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.assignee?.id === assigneeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 根据 KR 查找 Tasks
   */
  async findByKR(krId: string): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.krId === krId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 查找所有 Tasks
   */
  async findAll(): Promise<TaskEntity[]> {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 保存新 Task
   */
  async save(task: TaskEntity): Promise<void> {
    if (this.tasks.has(task.taskId)) {
      throw new Error(`Task with ID ${task.taskId} already exists`);
    }
    this.tasks.set(task.taskId, task);
  }

  /**
   * 更新 Task
   */
  async update(task: TaskEntity): Promise<void> {
    if (!this.tasks.has(task.taskId)) {
      throw new Error(`Task with ID ${task.taskId} not found`);
    }
    this.tasks.set(task.taskId, task);
  }

  /**
   * 删除 Task
   */
  async delete(taskId: string): Promise<void> {
    if (!this.tasks.has(taskId)) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    this.tasks.delete(taskId);
  }

  /**
   * 检查 Task 是否存在
   */
  async exists(taskId: string): Promise<boolean> {
    return this.tasks.has(taskId);
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  clear(): void {
    this.tasks.clear();
    this.channelTaskNumbers.clear();
  }

  /**
   * 获取总数（仅用于测试/调试）
   */
  count(): number {
    return this.tasks.size;
  }
}
