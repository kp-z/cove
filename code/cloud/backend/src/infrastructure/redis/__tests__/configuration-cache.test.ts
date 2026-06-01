/**
 * Configuration Cache Service Tests
 *
 * TDD: 测试配置缓存服务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConfigurationCache } from '../configuration-cache'
import type { IRedisClient } from '../redis-client.interface'

describe('ConfigurationCache', () => {
  let mockRedisClient: IRedisClient
  let configCache: ConfigurationCache

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
      publish: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      isConnected: vi.fn().mockReturnValue(true),
      ping: vi.fn().mockResolvedValue(true),
    }

    configCache = new ConfigurationCache(mockRedisClient, {
      keyPrefix: 'test:config:',
      ttl: 300,
    })
  })

  describe('基础操作', () => {
    it('should get configuration from cache', async () => {
      const mockConfig = {
        realmId: 'realm-1',
        agents: [],
        version: 1,
      }

      ;(mockRedisClient.get as any).mockResolvedValue(JSON.stringify(mockConfig))

      const result = await configCache.get('realm-1')

      expect(mockRedisClient.get).toHaveBeenCalledWith('test:config:realm-1')
      expect(result).toEqual(mockConfig)
    })

    it('should return null when config not found', async () => {
      ;(mockRedisClient.get as any).mockResolvedValue(null)

      const result = await configCache.get('realm-1')

      expect(result).toBeNull()
    })

    it('should set configuration to cache with TTL', async () => {
      const config = {
        realmId: 'realm-1',
        agents: [],
        version: 1,
      }

      await configCache.set('realm-1', config)

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:config:realm-1',
        JSON.stringify(config),
        300,
      )
    })

    it('should delete configuration from cache', async () => {
      await configCache.del('realm-1')

      expect(mockRedisClient.del).toHaveBeenCalledWith('test:config:realm-1')
    })

    it('should check if configuration exists', async () => {
      ;(mockRedisClient.exists as any).mockResolvedValue(true)

      const exists = await configCache.exists('realm-1')

      expect(mockRedisClient.exists).toHaveBeenCalledWith('test:config:realm-1')
      expect(exists).toBe(true)
    })
  })

  describe('版本管理', () => {
    it('should get configuration version', async () => {
      ;(mockRedisClient.hget as any).mockResolvedValue('5')

      const version = await configCache.getVersion('realm-1')

      expect(mockRedisClient.hget).toHaveBeenCalledWith(
        'test:config:realm-1:meta',
        'version',
      )
      expect(version).toBe(5)
    })

    it('should return 0 when version not found', async () => {
      ;(mockRedisClient.hget as any).mockResolvedValue(null)

      const version = await configCache.getVersion('realm-1')

      expect(version).toBe(0)
    })

    it('should set configuration version', async () => {
      await configCache.setVersion('realm-1', 10)

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'test:config:realm-1:meta',
        'version',
        '10',
      )
    })

    it('should get configuration checksum', async () => {
      ;(mockRedisClient.hget as any).mockResolvedValue('abc123')

      const checksum = await configCache.getChecksum('realm-1')

      expect(mockRedisClient.hget).toHaveBeenCalledWith(
        'test:config:realm-1:meta',
        'checksum',
      )
      expect(checksum).toBe('abc123')
    })

    it('should set configuration checksum', async () => {
      await configCache.setChecksum('realm-1', 'def456')

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'test:config:realm-1:meta',
        'checksum',
        'def456',
      )
    })
  })

  describe('批量操作', () => {
    it('should get multiple configurations', async () => {
      const config1 = { realmId: 'realm-1', version: 1 }
      const config2 = { realmId: 'realm-2', version: 2 }

      ;(mockRedisClient.get as any)
        .mockResolvedValueOnce(JSON.stringify(config1))
        .mockResolvedValueOnce(JSON.stringify(config2))

      const results = await configCache.getMany(['realm-1', 'realm-2'])

      expect(results).toEqual({
        'realm-1': config1,
        'realm-2': config2,
      })
    })

    it('should handle missing configurations in batch', async () => {
      const config1 = { realmId: 'realm-1', version: 1 }

      ;(mockRedisClient.get as any)
        .mockResolvedValueOnce(JSON.stringify(config1))
        .mockResolvedValueOnce(null)

      const results = await configCache.getMany(['realm-1', 'realm-2'])

      expect(results).toEqual({
        'realm-1': config1,
        'realm-2': null,
      })
    })

    it('should set multiple configurations', async () => {
      const configs = {
        'realm-1': { realmId: 'realm-1', version: 1 },
        'realm-2': { realmId: 'realm-2', version: 2 },
      }

      await configCache.setMany(configs)

      expect(mockRedisClient.set).toHaveBeenCalledTimes(2)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:config:realm-1',
        JSON.stringify(configs['realm-1']),
        300,
      )
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'test:config:realm-2',
        JSON.stringify(configs['realm-2']),
        300,
      )
    })
  })

  describe('缓存统计', () => {
    it('should track cache hits and misses', async () => {
      ;(mockRedisClient.get as any)
        .mockResolvedValueOnce(JSON.stringify({ realmId: 'realm-1' }))
        .mockResolvedValueOnce(null)

      await configCache.get('realm-1') // hit
      await configCache.get('realm-2') // miss

      const stats = configCache.getStats()

      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.5)
    })

    it('should reset cache statistics', async () => {
      ;(mockRedisClient.get as any).mockResolvedValue(JSON.stringify({ realmId: 'realm-1' }))

      await configCache.get('realm-1')
      await configCache.get('realm-1')

      configCache.resetStats()

      const stats = configCache.getStats()

      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe(0)
    })
  })

  describe('错误处理', () => {
    it('should handle Redis errors gracefully', async () => {
      ;(mockRedisClient.get as any).mockRejectedValue(new Error('Redis error'))

      await expect(configCache.get('realm-1')).rejects.toThrow('Redis error')
    })

    it('should handle invalid JSON', async () => {
      ;(mockRedisClient.get as any).mockResolvedValue('invalid json')

      await expect(configCache.get('realm-1')).rejects.toThrow()
    })
  })

  describe('性能测试', () => {
    it('should handle high throughput', async () => {
      ;(mockRedisClient.get as any).mockResolvedValue(
        JSON.stringify({ realmId: 'realm-1' }),
      )

      const count = 1000
      const startTime = Date.now()

      const promises = []
      for (let i = 0; i < count; i++) {
        promises.push(configCache.get('realm-1'))
      }

      await Promise.all(promises)

      const duration = Date.now() - startTime

      // 应该在合理时间内完成（< 100ms）
      expect(duration).toBeLessThan(100)
    })
  })
})
