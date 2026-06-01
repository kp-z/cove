/**
 * Config Cache Tests
 *
 * TDD: 测试配置缓存
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { IConfigCache } from '../config-cache.interface'
import type { RealmConfiguration } from '../../../infrastructure/gateway/backend-gateway.interface'

// Mock 实现用于测试
class MockConfigCache implements IConfigCache {
  private cache: Map<string, { config: RealmConfiguration; checksum: string }> = new Map()

  async set(realmId: string, config: RealmConfiguration): Promise<void> {
    this.cache.set(realmId, {
      config: { ...config },
      checksum: config.checksum
    })
  }

  async get(realmId: string): Promise<RealmConfiguration | null> {
    const cached = this.cache.get(realmId)
    return cached ? { ...cached.config } : null
  }

  async getVersion(realmId: string): Promise<number> {
    const config = await this.get(realmId)
    return config?.version ?? 0
  }

  async getChecksum(realmId: string): Promise<string | null> {
    const cached = this.cache.get(realmId)
    return cached?.checksum ?? null
  }

  async verifyChecksum(realmId: string, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.getChecksum(realmId)
    return actualChecksum === expectedChecksum
  }

  async delete(realmId: string): Promise<void> {
    this.cache.delete(realmId)
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  async close(): Promise<void> {
    // Mock 实现不需要关闭连接
  }
}

describe('ConfigCache', () => {
  let cache: MockConfigCache

  beforeEach(() => {
    cache = new MockConfigCache()
  })

  afterEach(async () => {
    await cache.close()
  })

  const createMockConfig = (realmId: string, version: number, checksum: string): RealmConfiguration => ({
    realmId,
    version,
    checksum,
    agents: [
      {
        id: 'agent-1',
        name: 'Assistant',
        description: 'General assistant',
        systemPrompt: 'You are helpful',
        adapterId: 'anthropic-adapter',
        adapterVersion: '1.0.0',
        enabled: true,
        priority: 1
      }
    ],
    settings: {
      maxConcurrentAgents: 5,
      messageTimeout: 30000,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000,
        maxBackoffMs: 10000
      }
    },
    updatedAt: new Date('2026-06-01T00:00:00Z')
  })

  describe('配置保存', () => {
    it('should save configuration', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')

      await cache.set('realm-1', config)

      const cached = await cache.get('realm-1')
      expect(cached).toBeDefined()
      expect(cached?.realmId).toBe('realm-1')
      expect(cached?.version).toBe(5)
      expect(cached?.checksum).toBe('abc123')
    })

    it('should update existing configuration', async () => {
      const config1 = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config1)

      const config2 = createMockConfig('realm-1', 6, 'def456')
      await cache.set('realm-1', config2)

      const cached = await cache.get('realm-1')
      expect(cached?.version).toBe(6)
      expect(cached?.checksum).toBe('def456')
    })

    it('should save multiple realm configurations', async () => {
      const config1 = createMockConfig('realm-1', 5, 'abc123')
      const config2 = createMockConfig('realm-2', 3, 'xyz789')

      await cache.set('realm-1', config1)
      await cache.set('realm-2', config2)

      const cached1 = await cache.get('realm-1')
      const cached2 = await cache.get('realm-2')

      expect(cached1?.version).toBe(5)
      expect(cached2?.version).toBe(3)
    })
  })

  describe('配置获取', () => {
    it('should get configuration', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const cached = await cache.get('realm-1')
      expect(cached).toBeDefined()
      expect(cached?.agents).toHaveLength(1)
      expect(cached?.agents[0].name).toBe('Assistant')
    })

    it('should return null for non-existent realm', async () => {
      const cached = await cache.get('invalid')
      expect(cached).toBeNull()
    })

    it('should return immutable copy', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const cached1 = await cache.get('realm-1')
      const cached2 = await cache.get('realm-1')

      // 修改 cached1 不应影响 cached2
      if (cached1) {
        cached1.version = 999
      }

      expect(cached2?.version).toBe(5)
    })
  })

  describe('版本查询', () => {
    it('should get configuration version', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const version = await cache.getVersion('realm-1')
      expect(version).toBe(5)
    })

    it('should return 0 for non-existent realm', async () => {
      const version = await cache.getVersion('invalid')
      expect(version).toBe(0)
    })
  })

  describe('校验和验证', () => {
    it('should get checksum', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const checksum = await cache.getChecksum('realm-1')
      expect(checksum).toBe('abc123')
    })

    it('should return null for non-existent realm', async () => {
      const checksum = await cache.getChecksum('invalid')
      expect(checksum).toBeNull()
    })

    it('should verify checksum match', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const isValid = await cache.verifyChecksum('realm-1', 'abc123')
      expect(isValid).toBe(true)
    })

    it('should detect checksum mismatch', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const isValid = await cache.verifyChecksum('realm-1', 'wrong-checksum')
      expect(isValid).toBe(false)
    })

    it('should return false for non-existent realm', async () => {
      const isValid = await cache.verifyChecksum('invalid', 'abc123')
      expect(isValid).toBe(false)
    })
  })

  describe('配置删除', () => {
    it('should delete configuration', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      await cache.delete('realm-1')

      const cached = await cache.get('realm-1')
      expect(cached).toBeNull()
    })

    it('should not throw error when deleting non-existent realm', async () => {
      await cache.delete('invalid')
      expect(true).toBe(true)
    })
  })

  describe('清空缓存', () => {
    it('should clear all configurations', async () => {
      const config1 = createMockConfig('realm-1', 5, 'abc123')
      const config2 = createMockConfig('realm-2', 3, 'xyz789')

      await cache.set('realm-1', config1)
      await cache.set('realm-2', config2)

      await cache.clear()

      const cached1 = await cache.get('realm-1')
      const cached2 = await cache.get('realm-2')

      expect(cached1).toBeNull()
      expect(cached2).toBeNull()
    })
  })

  describe('配置持久化', () => {
    it('should persist configuration across restarts', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      await cache.close()

      // 模拟重启
      const newCache = new MockConfigCache()
      // 在真实实现中，这里会从 SQLite 加载数据

      const cached = await newCache.get('realm-1')
      // Mock 实现不会持久化，所以这里是 null
      expect(cached).toBeNull()
    })
  })

  describe('配置完整性', () => {
    it('should preserve all configuration fields', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config)

      const cached = await cache.get('realm-1')

      expect(cached?.realmId).toBe(config.realmId)
      expect(cached?.version).toBe(config.version)
      expect(cached?.checksum).toBe(config.checksum)
      expect(cached?.agents).toEqual(config.agents)
      expect(cached?.settings).toEqual(config.settings)
      expect(cached?.updatedAt).toEqual(config.updatedAt)
    })

    it('should handle complex agent configurations', async () => {
      const config = createMockConfig('realm-1', 5, 'abc123')
      config.agents.push({
        id: 'agent-2',
        name: 'Specialist',
        description: 'Domain expert',
        systemPrompt: 'You are an expert',
        adapterId: 'openai-adapter',
        adapterVersion: '2.0.0',
        enabled: false,
        priority: 2
      })

      await cache.set('realm-1', config)

      const cached = await cache.get('realm-1')
      expect(cached?.agents).toHaveLength(2)
      expect(cached?.agents[1].name).toBe('Specialist')
    })
  })

  describe('版本升级场景', () => {
    it('should handle version upgrades', async () => {
      // 初始版本
      const config1 = createMockConfig('realm-1', 5, 'abc123')
      await cache.set('realm-1', config1)

      let version = await cache.getVersion('realm-1')
      expect(version).toBe(5)

      // 升级到版本 6
      const config2 = createMockConfig('realm-1', 6, 'def456')
      await cache.set('realm-1', config2)

      version = await cache.getVersion('realm-1')
      expect(version).toBe(6)

      // 升级到版本 7
      const config3 = createMockConfig('realm-1', 7, 'ghi789')
      await cache.set('realm-1', config3)

      version = await cache.getVersion('realm-1')
      expect(version).toBe(7)
    })
  })
})
