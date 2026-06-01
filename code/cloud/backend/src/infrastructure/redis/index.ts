/**
 * Redis Infrastructure Exports
 *
 * 统一导出 Redis 相关的所有接口和实现
 */

// Interfaces
export type { IRedisClient, RedisPubSubMessage, RedisCacheEntry } from './redis-client.interface'
export type { IMessageRouter } from './message-router'

// Implementations
export { RedisClient } from './redis-client'
export { MessageRouter } from './message-router'
export { ConfigurationCache } from './configuration-cache'
export type { ConfigurationCacheOptions, CacheStats } from './configuration-cache'

// Config
export type { RedisConfig, ShardingConfig } from './redis.config'
export {
  defaultRedisConfig,
  defaultShardingConfig,
  getShardForRealm,
  getShardForRealmSimple,
} from './redis.config'
