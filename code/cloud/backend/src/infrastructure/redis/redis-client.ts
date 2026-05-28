/**
 * Redis Client Implementation
 *
 * 使用 ioredis 实现 Redis 客户端
 * 高内聚：所有 Redis 操作封装在一个类中
 * 低耦合：通过接口隔离实现细节
 */

import Redis from 'ioredis'
import type { IRedisClient } from './redis-client.interface'
import type { RedisConfig } from '../../../config/redis.config'

export class RedisClient implements IRedisClient {
  private client: Redis | null = null
  private pubClient: Redis | null = null
  private subClient: Redis | null = null
  private subscribers: Map<string, Set<(message: string) => void>> = new Map()
  private connected = false

  constructor(private readonly config: RedisConfig) {}

  /**
   * 连接到 Redis
   */
  async connect(): Promise<void> {
    try {
      // 主客户端（用于普通操作）
      this.client = this.createClient()

      // Pub/Sub 需要独立的客户端
      if (this.config.pubsub.enabled) {
        this.pubClient = this.createClient()
        this.subClient = this.createClient()

        // 设置订阅消息处理器
        this.subClient.on('message', (channel: string, message: string) => {
          const handlers = this.subscribers.get(channel)
          if (handlers) {
            handlers.forEach((handler) => handler(message))
          }
        })
      }

      // 等待连接就绪
      await this.client.ping()
      this.connected = true
    } catch (error) {
      this.connected = false
      throw new Error(`Failed to connect to Redis: ${error}`)
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit()
        this.client = null
      }

      if (this.pubClient) {
        await this.pubClient.quit()
        this.pubClient = null
      }

      if (this.subClient) {
        await this.subClient.quit()
        this.subClient = null
      }

      this.subscribers.clear()
      this.connected = false
    } catch (error) {
      throw new Error(`Failed to disconnect from Redis: ${error}`)
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected && this.client !== null
  }

  /**
   * 健康检查
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.client) return false
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  /**
   * 基础操作
   */

  async get(key: string): Promise<string | null> {
    this.ensureConnected()
    return await this.client!.get(key)
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.ensureConnected()
    if (ttl) {
      await this.client!.setex(key, ttl, value)
    } else {
      await this.client!.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    this.ensureConnected()
    await this.client!.del(key)
  }

  async exists(key: string): Promise<boolean> {
    this.ensureConnected()
    const result = await this.client!.exists(key)
    return result === 1
  }

  /**
   * Hash 操作
   */

  async hget(key: string, field: string): Promise<string | null> {
    this.ensureConnected()
    return await this.client!.hget(key, field)
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    this.ensureConnected()
    await this.client!.hset(key, field, value)
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    this.ensureConnected()
    return await this.client!.hgetall(key)
  }

  async hdel(key: string, field: string): Promise<void> {
    this.ensureConnected()
    await this.client!.hdel(key, field)
  }

  /**
   * Pub/Sub 操作
   */

  async publish(channel: string, message: string): Promise<number> {
    this.ensureConnected()
    if (!this.pubClient) {
      throw new Error('Pub/Sub is not enabled')
    }
    return await this.pubClient.publish(channel, message)
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    this.ensureConnected()
    if (!this.subClient) {
      throw new Error('Pub/Sub is not enabled')
    }

    // 添加处理器
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set())
      await this.subClient.subscribe(channel)
    }
    this.subscribers.get(channel)!.add(handler)
  }

  async unsubscribe(channel: string): Promise<void> {
    this.ensureConnected()
    if (!this.subClient) {
      throw new Error('Pub/Sub is not enabled')
    }

    // 移除所有处理器
    this.subscribers.delete(channel)
    await this.subClient.unsubscribe(channel)
  }

  /**
   * 私有方法
   */

  private createClient(): Redis {
    if (this.config.cluster.enabled && this.config.cluster.nodes) {
      // Redis Cluster 模式
      return new Redis.Cluster(this.config.cluster.nodes, {
        redisOptions: {
          password: this.config.password,
          db: this.config.db,
        },
        clusterRetryStrategy: (times) => {
          if (times > this.config.retry.maxAttempts) {
            return null
          }
          return Math.min(times * this.config.retry.delay, 3000)
        },
      })
    } else {
      // 单实例模式
      return new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        retryStrategy: (times) => {
          if (times > this.config.retry.maxAttempts) {
            return null
          }
          return Math.min(times * this.config.retry.delay, 3000)
        },
        maxRetriesPerRequest: this.config.retry.maxAttempts,
      })
    }
  }

  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('Redis client is not connected')
    }
  }
}
