export const defaultRedisConfig = {
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
        ttl: 300,
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
};
export const defaultShardingConfig = {
    shardId: parseInt(process.env.BACKEND_SHARD_ID || '0', 10),
    totalShards: parseInt(process.env.BACKEND_TOTAL_SHARDS || '3', 10),
    strategy: 'consistent-hash',
    virtualNodes: 150,
};
export function getShardForRealm(realmId, config) {
    if (config.strategy === 'modulo') {
        return hashCode(realmId) % config.totalShards;
    }
    else {
        return hashCode(realmId) % config.totalShards;
    }
}
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}
export function getShardForRealmSimple(realmId, totalShards) {
    const match = realmId.match(/\d+/);
    if (match) {
        return parseInt(match[0], 10) % totalShards;
    }
    return hashCode(realmId) % totalShards;
}
//# sourceMappingURL=redis.config.js.map