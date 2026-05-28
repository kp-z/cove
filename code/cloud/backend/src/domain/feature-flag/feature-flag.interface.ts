/**
 * Feature Flag Interface
 *
 * Feature Flag 系统：支持 Realm 级别的执行模式切换
 *
 * 职责：
 * - 管理 Feature Flag 的启用/禁用
 * - 控制执行模式（Backend vs Device）
 * - 支持灰度发布（按百分比）
 * - 提供配置查询接口
 */

/**
 * 执行模式
 */
export type ExecutionMode = 'backend' | 'device'

/**
 * Feature Flag 配置
 */
export interface FeatureFlagConfig {
  realmId: string
  flagName: string
  enabled: boolean
  mode: ExecutionMode
  rolloutPercentage: number  // 0-100
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
   * 获取执行模式
   * @param realmId Realm ID
   * @returns 执行模式
   */
  getMode(realmId: string): Promise<ExecutionMode>

  /**
   * 设置执行模式
   * @param realmId Realm ID
   * @param mode 执行模式
   */
  setMode(realmId: string, mode: ExecutionMode): Promise<void>

  /**
   * 设置灰度百分比
   * @param realmId Realm ID
   * @param percentage 百分比（0-100）
   */
  setRolloutPercentage(realmId: string, percentage: number): Promise<void>

  /**
   * 获取配置
   * @param realmId Realm ID
   * @returns Feature Flag 配置
   */
  getConfig(realmId: string): Promise<FeatureFlagConfig | null>
}
