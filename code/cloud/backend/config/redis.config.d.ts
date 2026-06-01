export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
    cluster: {
        enabled: boolean;
        nodes?: Array<{
            host: string;
            port: number;
        }>;
    };
    pubsub: {
        enabled: boolean;
        channelPrefix: string;
    };
    cache: {
        enabled: boolean;
        ttl: number;
        keyPrefix: string;
    };
    pool: {
        min: number;
        max: number;
    };
    retry: {
        maxAttempts: number;
        delay: number;
    };
}
export declare const defaultRedisConfig: RedisConfig;
export interface ShardingConfig {
    shardId: number;
    totalShards: number;
    strategy: 'consistent-hash' | 'modulo';
    virtualNodes?: number;
}
export declare const defaultShardingConfig: ShardingConfig;
export declare function getShardForRealm(realmId: string, config: ShardingConfig): number;
export declare function getShardForRealmSimple(realmId: string, totalShards: number): number;
//# sourceMappingURL=redis.config.d.ts.map