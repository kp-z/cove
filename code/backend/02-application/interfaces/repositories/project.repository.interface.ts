/**
 * IProjectRepository - Project Repository 接口
 *
 * Application Layer 通过此接口访问 Project 数据。
 */

import { ProjectEntity, ProjectStatus } from '../../../01-domain/models/project/project.entity';

export interface IProjectRepository {
  /**
   * 根据 ID 查找 Project
   * @param projectId - Project ID
   * @returns Project 实体，不存在返回 null
   */
  findById(projectId: string): Promise<ProjectEntity | null>;

  /**
   * 根据所有者查找 Projects
   * @param ownerId - 所有者 ID
   * @returns Project 实体数组
   */
  findByOwner(ownerId: string): Promise<ProjectEntity[]>;

  /**
   * 根据状态查找 Projects
   * @param status - Project 状态
   * @returns Project 实体数组
   */
  findByStatus(status: ProjectStatus): Promise<ProjectEntity[]>;

  /**
   * 查找所有 Projects
   * @returns Project 实体数组
   */
  findAll(): Promise<ProjectEntity[]>;

  /**
   * 保存新 Project
   * @param project - Project 实体
   */
  save(project: ProjectEntity): Promise<void>;

  /**
   * 更新 Project
   * @param project - Project 实体
   */
  update(project: ProjectEntity): Promise<void>;

  /**
   * 删除 Project
   * @param projectId - Project ID
   */
  delete(projectId: string): Promise<void>;

  /**
   * 检查 Project 是否存在
   * @param projectId - Project ID
   * @returns 是否存在
   */
  exists(projectId: string): Promise<boolean>;
}
