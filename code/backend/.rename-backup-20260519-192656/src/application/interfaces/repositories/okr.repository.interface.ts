/**
 * OKR Repository Interface
 *
 * 定义 OKR 实体的持久化接口，遵循依赖倒置原则。
 * Application Layer 通过此接口访问 OKR 数据，不直接依赖 Infrastructure 层。
 */

import type { OKREntity, KRStatus } from '../../../domain/models/okr';

export interface IOKRRepository {
  /**
   * 根据 OKR ID 查找
   */
  findById(okrId: string): Promise<OKREntity | null>;

  /**
   * 根据项目 ID 查找所有 OKR
   */
  findByProjectId(projectId: string): Promise<readonly OKREntity[]>;

  /**
   * 根据季度查找 OKR
   */
  findByQuarter(quarter: string): Promise<readonly OKREntity[]>;

  /**
   * 根据项目和季度查找 OKR
   */
  findByProjectAndQuarter(projectId: string, quarter: string): Promise<readonly OKREntity[]>;

  /**
   * 根据 KR 状态查找 OKR
   */
  findByKRStatus(status: KRStatus): Promise<readonly OKREntity[]>;

  /**
   * 保存新的 OKR
   */
  save(okr: OKREntity): Promise<void>;

  /**
   * 更新现有 OKR
   */
  update(okr: OKREntity): Promise<void>;

  /**
   * 删除 OKR
   */
  delete(okrId: string): Promise<void>;
}
