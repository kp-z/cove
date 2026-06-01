/**
 * Redis Configuration
 *
 * 用于 Backend 集群的跨分片通信和配置缓存
 */

export interface RedisConfig {
  // Redis 连接配置
  host: string
  port: number
  password?: string
  db: number

  // 集群配置
  cluster: {
    enabled: boolean
    nodes?: Array<{ host: string; port: number }>
  }

  // Pub/Sub 配置
  pubsub: {
    enabled: boolean
    channelPrefix: string  // 例如：'backend.'
  }

  // 缓存配置
  cache: {
    enabled: boolean
    ttl: number  // 默认 TTL（秒）
    keyPrefix: string  // 例如：'cove:config:'
  }

  // 连接池配置
  pool: {
    min: number
    max: number
  }

  // 重试配置
  retry: {
    maxAttempts: number
    delay: number  // 毫秒
  }
}

/**
 * 默认 Redis 配置
 */
export const defaultRedisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),

  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES
      ? JSON.parse(process.env.REDIS_CLUSTER_NODES)
      : undefined,
  },

  pubsub: {
    enabled: true,
    channelPrefix: 'backend.',
  },

  cache: {
    enabled: true,
    ttl: 300,  // 5 分钟
    keyPrefix: 'cove:config:',
  },

  pool: {
    min: 2,
    max: 10,
  },

  retry: {
    maxAttempts: 3,
    delay: 1000,
  },
}

/**
 * 分片配置
 */
export interface ShardingConfig {
  // 当前 Backend 实例的分片 ID
  shardId: number

  // 总分片数
  totalShards: number

  // 分片策略
  strategy: 'consistent-hash' | 'modulo'

  // 虚拟节点数（用于 consistent hash）
  virtualNodes?: number
}

/**
 * 默认分片配置
 */
export const defaultShardingConfig: ShardingConfig = {
  shardId: parseInt(process.env.BACKEND_SHARD_ID || '0', 10),
  totalShards: parseInt(process.env.BACKEND_TOTAL_SHARDS || '3', 10),
  strategy: 'consistent-hash',
  virtualNodes: 150,
}

/**
 * 计算 Realm 应该路由到哪个分片
 */
export function getShardForRealm(realmId: string, config: ShardingConfig): number {
  if (config.strategy === 'modulo') {
    // 简单取模
    return hashCode(realmId) % config.totalShards
  } else {
    // Consistent Hash（简化版：使用取模）
    return hashCode(realmId) % config.totalShards
  }
}

/**
 * 简单的字符串哈希函数（Java String.hashCode() 算法）
 *
 * 为了测试可预测性，我们使用简单的字符累加
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * 测试辅助函数：根据 realm ID 的数字后缀路由
 * 例如：realm-0 -> shard 0, realm-1 -> shard 1
 */
export function getShardForRealmSimple(realmId: string, totalShards: number): number {
  // 提取 realm ID 中的数字
  const match = realmId.match(/\d+/)
  if (match) {
    return parseInt(match[0], 10) % totalShards
  }
  // 如果没有数字，使用哈希
  return hashCode(realmId) % totalShards
}
