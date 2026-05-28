/**
 * Message Router Service
 *
 * 负责跨分片消息路由
 * 高内聚：封装所有路由逻辑
 * 低耦合：依赖接口而非具体实现
 */

import type { IRedisClient, RedisPubSubMessage } from './redis-client.interface'
import type { ShardingConfig } from '../../../config/redis.config'
import { getShardForRealmSimple } from '../../../config/redis.config'

export interface IMessageRouter {
  /**
   * 路由消息到目标 Realm
   */
  routeMessage(realmId: string, message: unknown): Promise<void>

  /**
   * 订阅本分片的消息
   */
  subscribeToShard(): Promise<void>

  /**
   * 注册消息处理器
   */
  onMessage(handler: (realmId: string, message: unknown) => void): void

  /**
   * 检查 Realm 是否在本分片
   */
  isLocalRealm(realmId: string): boolean
}

export class MessageRouter implements IMessageRouter {
  private messageHandlers: Set<(realmId: string, message: unknown) => void> = new Set()
  private readonly channelName: string

  constructor(
    private readonly redisClient: IRedisClient,
    private readonly shardingConfig: ShardingConfig,
  ) {
    this.channelName = `backend.${shardingConfig.shardId}`
  }

  /**
   * 路由消息到目标 Realm
   */
  async routeMessage(realmId: string, message: unknown): Promise<void> {
    const targetShard = getShardForRealmSimple(realmId, this.shardingConfig.totalShards)

    if (targetShard === this.shardingConfig.shardId) {
      // 本地路由：直接调用处理器
      this.handleLocalMessage(realmId, message)
    } else {
      // 跨分片路由：通过 Redis Pub/Sub
      await this.routeToRemoteShard(targetShard, realmId, message)
    }
  }

  /**
   * 订阅本分片的消息
   */
  async subscribeToShard(): Promise<void> {
    await this.redisClient.subscribe(this.channelName, (rawMessage: string) => {
      try {
        const pubsubMessage: RedisPubSubMessage = JSON.parse(rawMessage)
        this.handleRemoteMessage(pubsubMessage)
      } catch (error) {
        console.error('Failed to parse Pub/Sub message:', error)
      }
    })
  }

  /**
   * 注册消息处理器
   */
  onMessage(handler: (realmId: string, message: unknown) => void): void {
    this.messageHandlers.add(handler)
  }

  /**
   * 检查 Realm 是否在本分片
   */
  isLocalRealm(realmId: string): boolean {
    const targetShard = getShardForRealmSimple(realmId, this.shardingConfig.totalShards)
    return targetShard === this.shardingConfig.shardId
  }

  /**
   * 私有方法
   */

  private handleLocalMessage(realmId: string, message: unknown): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(realmId, message)
      } catch (error) {
        console.error('Message handler error:', error)
      }
    })
  }

  private async routeToRemoteShard(
    targetShard: number,
    realmId: string,
    message: unknown,
  ): Promise<void> {
    const pubsubMessage: RedisPubSubMessage = {
      type: 'route_message',
      payload: {
        realmId,
        message,
      },
      timestamp: Date.now(),
      senderId: `shard-${this.shardingConfig.shardId}`,
    }

    const channel = `backend.${targetShard}`
    await this.redisClient.publish(channel, JSON.stringify(pubsubMessage))
  }

  private handleRemoteMessage(pubsubMessage: RedisPubSubMessage): void {
    if (pubsubMessage.type !== 'route_message') {
      return
    }

    const payload = pubsubMessage.payload as { realmId: string; message: unknown }
    this.handleLocalMessage(payload.realmId, payload.message)
  }
}
