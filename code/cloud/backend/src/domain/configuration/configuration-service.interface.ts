/**
 * Configuration Service Interface
 *
 * 配置服务：负责配置的同步、验证、缓存
 *
 * 职责：
 * - 配置同步：增量同步、版本链管理
 * - 配置验证：校验和验证、一致性检查
 * - 配置缓存：本地持久化、版本管理
 * - 配置推送：接收 Backend 推送的配置更新
 */

import type { RealmConfiguration } from '../../infrastructure/gateway/backend-gateway.interface'

/**
 * 配置同步结果
 */
export interface SyncResult {
  success: boolean
  localVersion: number
  remoteVersion: number
  applied: boolean
  error?: string
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  valid: boolean
  checksumMatch: boolean
  errors: string[]
}

/**
 * 配置服务接口
 */
export interface IConfigurationService {
  /**
   * 同步配置（增量或全量）
   * @param realmId Realm ID
   * @returns 同步结果
   */
  syncConfig(realmId: string): Promise<SyncResult>

  /**
   * 获取本地配置
   * @param realmId Realm ID
   * @returns 配置信息
   */
  getLocalConfig(realmId: string): Promise<RealmConfiguration | null>

  /**
   * 获取本地配置版本
   * @param realmId Realm ID
   * @returns 版本号
   */
  getLocalVersion(realmId: string): Promise<number>

  /**
   * 验证配置一致性
   * @param realmId Realm ID
   * @returns 验证结果
   */
  validateConfig(realmId: string): Promise<ValidationResult>

  /**
   * 处理配置推送（来自 Backend）
   * @param realmId Realm ID
   * @param version 新版本号
   * @returns 是否成功应用
   */
  handleConfigPush(realmId: string, version: number): Promise<boolean>

  /**
   * 启动定期校验（每 5 分钟）
   */
  startPeriodicValidation(): void

  /**
   * 停止定期校验
   */
  stopPeriodicValidation(): void
}
