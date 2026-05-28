/**
 * Configuration Service Interface
 *
 * 配置同步上下文：负责 Realm 配置的同步、验证和管理
 */

import type { RealmConfiguration } from '../../infrastructure/gateway/backend-gateway.interface'

/**
 * 配置变更记录
 */
export interface ConfigChange {
  version: number
  changes: Record<string, unknown>
  timestamp: Date
}

/**
 * 配置同步结果
 */
export interface SyncResult {
  success: boolean
  version: number
  checksum: string
  error?: string
}

/**
 * 配置服务接口
 */
export interface IConfigurationService {
  /**
   * 同步配置
   * @param realmId Realm ID
   * @returns 同步结果
   */
  syncConfig(realmId: string): Promise<SyncResult>

  /**
   * 获取本地配置
   * @param realmId Realm ID
   * @returns 配置对象或 null
   */
  getConfig(realmId: string): Promise<RealmConfiguration | null>

  /**
   * 获取本地配置版本
   * @param realmId Realm ID
   * @returns 版本号
   */
  getVersion(realmId: string): Promise<number>

  /**
   * 验证配置完整性
   * @param realmId Realm ID
   * @returns 是否有效
   */
  validateConfig(realmId: string): Promise<boolean>

  /**
   * 处理配置推送
   * @param realmId Realm ID
   * @param config 新配置
   */
  handleConfigPush(realmId: string, config: RealmConfiguration): Promise<void>

  /**
   * 启动定期校验
   * @param intervalMs 校验间隔（毫秒）
   */
  startPeriodicValidation(intervalMs?: number): void

  /**
   * 停止定期校验
   */
  stopPeriodicValidation(): void
}
