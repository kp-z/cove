/**
 * Config Cache Interface
 *
 * 配置缓存：基于 SQLite 的配置持久化和版本管理
 *
 * 职责：
 * - 配置持久化：保存 Realm 配置到本地
 * - 版本管理：维护配置版本链
 * - 校验和验证：验证配置完整性
 * - 配置查询：快速获取本地配置
 */

import type { RealmConfiguration } from '../../infrastructure/gateway/backend-gateway.interface'

/**
 * 配置缓存记录
 */
export interface ConfigCacheRecord {
  realmId: string
  version: number
  checksum: string
  config: string // JSON 字符串
  createdAt: Date
  updatedAt: Date
}

/**
 * 配置缓存接口
 */
export interface IConfigCache {
  /**
   * 保存配置
   * @param realmId Realm ID
   * @param config 配置对象
   */
  set(realmId: string, config: RealmConfiguration): Promise<void>

  /**
   * 获取配置
   * @param realmId Realm ID
   * @returns 配置对象或 null
   */
  get(realmId: string): Promise<RealmConfiguration | null>

  /**
   * 获取配置版本
   * @param realmId Realm ID
   * @returns 版本号
   */
  getVersion(realmId: string): Promise<number>

  /**
   * 获取配置校验和
   * @param realmId Realm ID
   * @returns 校验和
   */
  getChecksum(realmId: string): Promise<string | null>

  /**
   * 验证配置完整性
   * @param realmId Realm ID
   * @param expectedChecksum 期望的校验和
   * @returns 是否匹配
   */
  verifyChecksum(realmId: string, expectedChecksum: string): Promise<boolean>

  /**
   * 删除配置
   * @param realmId Realm ID
   */
  delete(realmId: string): Promise<void>

  /**
   * 清空所有配置
   */
  clear(): Promise<void>

  /**
   * 关闭连接
   */
  close(): Promise<void>
}
