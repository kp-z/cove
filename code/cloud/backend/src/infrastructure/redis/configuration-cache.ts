/**
 * Configuration Cache Service
 *
 * 负责 Realm 配置的缓存管理
 * 高内聚：封装所有配置缓存逻辑
 * 低耦合：依赖 IRedisClient 接口
 */

import type { IRedisClient } from './redis-client.interface'

export interface ConfigurationCacheOptions {
  keyPrefix: string
  ttl: number // 秒
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
}

export class ConfigurationCache {
  private stats = {
    hits: 0,
    misses: 0,
  }

  constructor(
    private readonly redisClient: IRedisClient,
    private readonly options: ConfigurationCacheOptions,
  ) {}

  /**
   * 获取配置
   */
  async get<T = any>(realmId: string): Promise<T | null> {
    try {
      const key = this.getKey(realmId)
      const value = await this.redisClient.get(key)

      if (value === null) {
        this.stats.misses++
        return null
      }

      this.stats.hits++
      return JSON.parse(value) as T
    } catch (error) {
      throw error
    }
  }

  /**
   * 设置配置
   */
  async set<T = any>(realmId: string, config: T): Promise<void> {
    const key = this.getKey(realmId)
    const value = JSON.stringify(config)
    await this.redisClient.set(key, value, this.options.ttl)
  }

  /**
   * 删除配置
   */
  async del(realmId: string): Promise<void> {
    const key = this.getKey(realmId)
    await this.redisClient.del(key)
  }

  /**
   * 检查配置是否存在
   */
  async exists(realmId: string): Promise<boolean> {
    const key = this.getKey(realmId)
    return await this.redisClient.exists(key)
  }

  /**
   * 获取配置版本
   */
  async getVersion(realmId: string): Promise<number> {
    const metaKey = this.getMetaKey(realmId)
    const version = await this.redisClient.hget(metaKey, 'version')
    return version ? parseInt(version, 10) : 0
  }

  /**
   * 设置配置版本
   */
  async setVersion(realmId: string, version: number): Promise<void> {
    const metaKey = this.getMetaKey(realmId)
    await this.redisClient.hset(metaKey, 'version', version.toString())
  }

  /**
   * 获取配置校验和
   */
  async getChecksum(realmId: string): Promise<string | null> {
    const metaKey = this.getMetaKey(realmId)
    return await this.redisClient.hget(metaKey, 'checksum')
  }

  /**
   * 设置配置校验和
   */
  async setChecksum(realmId: string, checksum: string): Promise<void> {
    const metaKey = this.getMetaKey(realmId)
    await this.redisClient.hset(metaKey, 'checksum', checksum)
  }

  /**
   * 批量获取配置
   */
  async getMany<T = any>(realmIds: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {}

    await Promise.all(
      realmIds.map(async (realmId) => {
        results[realmId] = await this.get<T>(realmId)
      }),
    )

    return results
  }

  /**
   * 批量设置配置
   */
  async setMany<T = any>(configs: Record<string, T>): Promise<void> {
    await Promise.all(
      Object.entries(configs).map(([realmId, config]) => this.set(realmId, config)),
    )
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? this.stats.hits / total : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
    }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * 私有方法
   */

  private getKey(realmId: string): string {
    return `${this.options.keyPrefix}${realmId}`
  }

  private getMetaKey(realmId: string): string {
    return `${this.options.keyPrefix}${realmId}:meta`
  }
}
