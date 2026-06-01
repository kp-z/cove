/**
 * Feature Flag Store Interface
 *
 * Feature Flag 存储接口：SQLite 持久化存储
 */

import type { FeatureFlagConfig } from '../../domain/feature-flag/feature-flag.interface'

/**
 * Feature Flag 存储接口
 */
export interface IFeatureFlagStore {
  /**
   * 获取配置
   * @param realmId Realm ID
   * @returns Feature Flag 配置
   */
  get(realmId: string): Promise<FeatureFlagConfig | null>

  /**
   * 保存配置
   * @param config Feature Flag 配置
   */
  set(config: FeatureFlagConfig): Promise<void>

  /**
   * 删除配置
   * @param realmId Realm ID
   */
  delete(realmId: string): Promise<void>

  /**
   * 列出所有配置
   * @returns 所有 Feature Flag 配置
   */
  list(): Promise<FeatureFlagConfig[]>

  /**
   * 关闭存储
   */
  close(): Promise<void>
}
