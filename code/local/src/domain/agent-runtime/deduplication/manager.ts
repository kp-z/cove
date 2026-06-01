import { createHash } from 'crypto'

/**
 * 去重策略
 */
export type DeduplicationStrategy = 'content-hash' | 'idempotency-key' | 'both'

/**
 * 去重配置
 */
export interface DeduplicationConfig {
  /**
   * 去重策略
   */
  strategy: DeduplicationStrategy

  /**
   * 缓存 TTL（毫秒）
   */
  cacheTTL: number

  /**
   * 是否启用去重
   */
  enabled: boolean
}

/**
 * 缓存的响应
 */
export interface CachedResponse {
  content: string
  metadata?: Record<string, any>
  timestamp: number
  expiresAt: number
}

/**
 * 去重管理器
 * 基于内容哈希或幂等性令牌进行请求去重
 */
export class DeduplicationManager {
  private readonly cache = new Map<string, CachedResponse>()
  private cleanupInterval: NodeJS.Timeout | undefined

  constructor(private readonly config: DeduplicationConfig) {
    // 启动定期清理过期缓存
    if (config.enabled) {
      this.startCleanup()
    }
  }

  /**
   * 检查请求是否重复
   * @returns 如果是重复请求，返回缓存的响应；否则返回 null
   */
  checkDuplicate(
    content: string,
    idempotencyKey?: string
  ): CachedResponse | null {
    if (!this.config.enabled) {
      return null
    }

    const key = this.generateKey(content, idempotencyKey)
    const cached = this.cache.get(key)

    if (!cached) {
      return null
    }

    // 检查是否过期
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return cached
  }

  /**
   * 缓存响应
   */
  cacheResponse(
    content: string,
    response: string,
    metadata?: Record<string, any>,
    idempotencyKey?: string
  ): void {
    if (!this.config.enabled) {
      return
    }

    const key = this.generateKey(content, idempotencyKey)
    const now = Date.now()

    this.cache.set(key, {
      content: response,
      metadata,
      timestamp: now,
      expiresAt: now + this.config.cacheTTL
    })
  }

  /**
   * 生成缓存键
   */
  private generateKey(content: string, idempotencyKey?: string): string {
    switch (this.config.strategy) {
      case 'content-hash':
        return this.hashContent(content)

      case 'idempotency-key':
        if (!idempotencyKey) {
          throw new Error('Idempotency key required but not provided')
        }
        return idempotencyKey

      case 'both':
        const hash = this.hashContent(content)
        return idempotencyKey ? `${idempotencyKey}:${hash}` : hash

      default:
        throw new Error(`Unknown deduplication strategy: ${this.config.strategy}`)
    }
  }

  /**
   * 计算内容哈希
   */
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number
    entries: Array<{ key: string; expiresIn: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key: key.substring(0, 16) + '...', // 只显示前 16 个字符
      expiresIn: Math.max(0, cached.expiresAt - now)
    }))

    return {
      size: this.cache.size,
      entries
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 停止清理任务
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    this.clear()
  }
}
