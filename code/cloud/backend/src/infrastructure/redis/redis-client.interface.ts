/**
 * Redis Client Interface
 *
 * 防腐层：隔离 Redis 实现细节，便于测试和替换
 */

export interface IRedisClient {
  /**
   * 基础操作
   */
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>

  /**
   * Hash 操作
   */
  hget(key: string, field: string): Promise<string | null>
  hset(key: string, field: string, value: string): Promise<void>
  hgetall(key: string): Promise<Record<string, string>>
  hdel(key: string, field: string): Promise<void>

  /**
   * Pub/Sub 操作
   */
  publish(channel: string, message: string): Promise<number>
  subscribe(channel: string, handler: (message: string) => void): Promise<void>
  unsubscribe(channel: string): Promise<void>

  /**
   * 连接管理
   */
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean

  /**
   * 健康检查
   */
  ping(): Promise<boolean>
}

/**
 * Redis Pub/Sub Message
 */
export interface RedisPubSubMessage {
  type: string
  payload: unknown
  timestamp: number
  senderId: string
}

/**
 * Redis Cache Entry
 */
export interface RedisCacheEntry<T> {
  data: T
  version: number
  checksum: string
  createdAt: number
  expiresAt: number
}
