/**
 * Feature Flag Interface
 *
 * Feature Flag 系统：支持 Realm 级别的功能开关
 *
 * 职责：
 * - 管理 Feature Flag 的启用/禁用
 * - 提供配置查询接口
 */

/**
 * Feature Flag 配置
 */
export interface FeatureFlagConfig {
  realmId: string
  flagName: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Feature Flag 接口
 */
export interface IFeatureFlag {
  /**
   * 启用 Feature Flag
   * @param realmId Realm ID
   * @param flagName Flag 名称
   */
  enable(realmId: string, flagName: string): Promise<void>

  /**
   * 禁用 Feature Flag
   * @param realmId Realm ID
   * @param flagName Flag 名称
   */
  disable(realmId: string, flagName: string): Promise<void>

  /**
   * 检查 Feature Flag 是否启用
   * @param realmId Realm ID
   * @param flagName Flag 名称
   * @returns 是否启用
   */
  isEnabled(realmId: string, flagName: string): Promise<boolean>

  /**
   * 获取配置
   * @param realmId Realm ID
   * @returns Feature Flag 配置
   */
  getConfig(realmId: string): Promise<FeatureFlagConfig | null>
}
