/**
 * Message Router Tests
 *
 * TDD: 测试跨分片消息路由
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessageRouter } from '../message-router'
import type { IRedisClient } from '../redis-client.interface'
import type { ShardingConfig } from '../../../../config/redis.config'

describe('MessageRouter', () => {
  let mockRedisClient: IRedisClient
  let shardingConfig: ShardingConfig
  let messageRouter: MessageRouter

  beforeEach(() => {
    // Mock Redis Client
    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      hget: vi.fn(),
      hset: vi.fn(),
      hgetall: vi.fn(),
      hdel: vi.fn(),
      publish: vi.fn().mockResolvedValue(1),
      subscribe: vi.fn().mockResolvedValue(undefined),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true),
      ping: vi.fn().mockResolvedValue(true),
    }

    // Shard 配置：当前是 Shard 0，总共 3 个分片
    shardingConfig = {
      shardId: 0,
      totalShards: 3,
      strategy: 'consistent-hash',
      virtualNodes: 150,
    }

    messageRouter = new MessageRouter(mockRedisClient, shardingConfig)
  })

  describe('本地路由', () => {
    it('should route message locally when realm is on current shard', async () => {
      const handler = vi.fn()
      messageRouter.onMessage(handler)

      // 假设 realm-0 路由到 shard 0
      await messageRouter.routeMessage('realm-0', { content: 'test' })

      // 应该直接调用本地处理器，不通过 Redis
      expect(handler).toHaveBeenCalledWith('realm-0', { content: 'test' })
      expect(mockRedisClient.publish).not.toHaveBeenCalled()
    })

    it('should call multiple handlers for local message', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      messageRouter.onMessage(handler1)
      messageRouter.onMessage(handler2)

      await messageRouter.routeMessage('realm-0', { content: 'test' })

      expect(handler1).toHaveBeenCalledWith('realm-0', { content: 'test' })
      expect(handler2).toHaveBeenCalledWith('realm-0', { content: 'test' })
    })

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()

      messageRouter.onMessage(errorHandler)
      messageRouter.onMessage(normalHandler)

      // 不应该抛出错误
      await expect(
        messageRouter.routeMessage('realm-0', { content: 'test' }),
      ).resolves.not.toThrow()

      // 正常的处理器应该仍然被调用
      expect(normalHandler).toHaveBeenCalled()
    })
  })

  describe('跨分片路由', () => {
    it('should route message to remote shard via Redis Pub/Sub', async () => {
      const handler = vi.fn()
      messageRouter.onMessage(handler)

      // 假设 realm-1 路由到 shard 1（不是当前 shard 0）
      await messageRouter.routeMessage('realm-1', { content: 'remote' })

      // 应该通过 Redis Pub/Sub 发送
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'backend.1',
        expect.stringContaining('route_message'),
      )

      // 不应该调用本地处理器
      expect(handler).not.toHaveBeenCalled()
    })

    it('should include correct metadata in Pub/Sub message', async () => {
      await messageRouter.routeMessage('realm-1', { content: 'remote' })

      expect(mockRedisClient.publish).toHaveBeenCalled()
      const publishCall = (mockRedisClient.publish as any).mock.calls[0]
      const message = JSON.parse(publishCall[1])

      expect(message).toMatchObject({
        type: 'route_message',
        payload: {
          realmId: 'realm-1',
          message: { content: 'remote' },
        },
        senderId: 'shard-0',
      })
      expect(message.timestamp).toBeTypeOf('number')
    })
  })

  describe('订阅分片消息', () => {
    it('should subscribe to current shard channel', async () => {
      await messageRouter.subscribeToShard()

      expect(mockRedisClient.subscribe).toHaveBeenCalledWith(
        'backend.0',
        expect.any(Function),
      )
    })

    it('should handle incoming Pub/Sub messages', async () => {
      const handler = vi.fn()
      messageRouter.onMessage(handler)

      // 模拟订阅
      let subscribeCallback: (message: string) => void = () => {}
      ;(mockRedisClient.subscribe as any).mockImplementation(
        async (_channel: string, callback: (message: string) => void) => {
          subscribeCallback = callback
        },
      )

      await messageRouter.subscribeToShard()

      // 模拟接收到 Pub/Sub 消息
      const pubsubMessage = {
        type: 'route_message',
        payload: {
          realmId: 'realm-0',
          message: { content: 'from-remote' },
        },
        timestamp: Date.now(),
        senderId: 'shard-1',
      }

      subscribeCallback(JSON.stringify(pubsubMessage))

      // 应该调用本地处理器
      expect(handler).toHaveBeenCalledWith('realm-0', { content: 'from-remote' })
    })

    it('should ignore invalid Pub/Sub messages', async () => {
      const handler = vi.fn()
      messageRouter.onMessage(handler)

      let subscribeCallback: (message: string) => void = () => {}
      ;(mockRedisClient.subscribe as any).mockImplementation(
        async (_channel: string, callback: (message: string) => void) => {
          subscribeCallback = callback
        },
      )

      await messageRouter.subscribeToShard()

      // 发送无效 JSON
      subscribeCallback('invalid json')

      // 不应该调用处理器
      expect(handler).not.toHaveBeenCalled()
    })

    it('should ignore non-route_message types', async () => {
      const handler = vi.fn()
      messageRouter.onMessage(handler)

      let subscribeCallback: (message: string) => void = () => {}
      ;(mockRedisClient.subscribe as any).mockImplementation(
        async (_channel: string, callback: (message: string) => void) => {
          subscribeCallback = callback
        },
      )

      await messageRouter.subscribeToShard()

      // 发送其他类型的消息
      const otherMessage = {
        type: 'other_type',
        payload: {},
        timestamp: Date.now(),
        senderId: 'shard-1',
      }

      subscribeCallback(JSON.stringify(otherMessage))

      // 不应该调用处理器
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('Realm 分片检查', () => {
    it('should correctly identify local realms', () => {
      // realm-0 应该在 shard 0
      expect(messageRouter.isLocalRealm('realm-0')).toBe(true)
    })

    it('should correctly identify remote realms', () => {
      // realm-1 应该在 shard 1
      expect(messageRouter.isLocalRealm('realm-1')).toBe(false)
    })
  })

  describe('性能测试', () => {
    it('should handle high message throughput', async () => {
      const handler = vi.fn()
      messageRouter.onMessage(handler)

      const messageCount = 1000
      const startTime = Date.now()

      // 发送 1000 条消息
      for (let i = 0; i < messageCount; i++) {
        await messageRouter.routeMessage('realm-0', { id: i })
      }

      const duration = Date.now() - startTime

      // 应该在合理时间内完成（< 100ms）
      expect(duration).toBeLessThan(100)
      expect(handler).toHaveBeenCalledTimes(messageCount)
    })
  })
})
