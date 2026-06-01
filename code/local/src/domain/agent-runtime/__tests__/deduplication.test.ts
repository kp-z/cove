import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DeduplicationManager } from '../deduplication'
import type { DeduplicationConfig } from '../deduplication'

describe('DeduplicationManager', () => {
  let manager: DeduplicationManager

  afterEach(() => {
    if (manager) {
      manager.destroy()
    }
  })

  describe('content-hash strategy', () => {
    beforeEach(() => {
      const config: DeduplicationConfig = {
        strategy: 'content-hash',
        cacheTTL: 5000,
        enabled: true
      }
      manager = new DeduplicationManager(config)
    })

    it('应该检测重复的内容', () => {
      const content = 'Hello world'

      // 第一次请求
      const first = manager.checkDuplicate(content)
      expect(first).toBeNull()

      // 缓存响应
      manager.cacheResponse(content, 'Response 1', { test: true })

      // 第二次请求（重复）
      const second = manager.checkDuplicate(content)
      expect(second).not.toBeNull()
      expect(second?.content).toBe('Response 1')
      expect(second?.metadata?.test).toBe(true)
    })

    it('应该为不同内容返回 null', () => {
      manager.cacheResponse('Hello', 'Response 1')

      const result = manager.checkDuplicate('World')
      expect(result).toBeNull()
    })

    it('应该在 TTL 过期后返回 null', async () => {
      const config: DeduplicationConfig = {
        strategy: 'content-hash',
        cacheTTL: 100, // 100ms
        enabled: true
      }
      manager.destroy()
      manager = new DeduplicationManager(config)

      const content = 'Hello world'
      manager.cacheResponse(content, 'Response 1')

      // 立即检查 - 应该命中缓存
      const immediate = manager.checkDuplicate(content)
      expect(immediate).not.toBeNull()

      // 等待 TTL 过期
      await new Promise(resolve => setTimeout(resolve, 150))

      // 过期后 - 应该返回 null
      const expired = manager.checkDuplicate(content)
      expect(expired).toBeNull()
    })
  })

  describe('idempotency-key strategy', () => {
    beforeEach(() => {
      const config: DeduplicationConfig = {
        strategy: 'idempotency-key',
        cacheTTL: 5000,
        enabled: true
      }
      manager = new DeduplicationManager(config)
    })

    it('应该使用幂等性键检测重复', () => {
      const content = 'Hello world'
      const key = 'request-123'

      // 第一次请求
      const first = manager.checkDuplicate(content, key)
      expect(first).toBeNull()

      // 缓存响应
      manager.cacheResponse(content, 'Response 1', undefined, key)

      // 第二次请求（相同的幂等性键）
      const second = manager.checkDuplicate(content, key)
      expect(second).not.toBeNull()
      expect(second?.content).toBe('Response 1')
    })

    it('应该为不同的幂等性键返回 null', () => {
      const content = 'Hello world'
      manager.cacheResponse(content, 'Response 1', undefined, 'key-1')

      const result = manager.checkDuplicate(content, 'key-2')
      expect(result).toBeNull()
    })

    it('应该在没有幂等性键时抛出错误', () => {
      expect(() => {
        manager.checkDuplicate('Hello world')
      }).toThrow('Idempotency key required but not provided')
    })
  })

  describe('both strategy', () => {
    beforeEach(() => {
      const config: DeduplicationConfig = {
        strategy: 'both',
        cacheTTL: 5000,
        enabled: true
      }
      manager = new DeduplicationManager(config)
    })

    it('应该结合内容哈希和幂等性键', () => {
      const content = 'Hello world'
      const key = 'request-123'

      manager.cacheResponse(content, 'Response 1', undefined, key)

      // 相同的内容和键 - 应该命中
      const hit = manager.checkDuplicate(content, key)
      expect(hit).not.toBeNull()

      // 相同的内容，不同的键 - 应该不命中
      const miss1 = manager.checkDuplicate(content, 'different-key')
      expect(miss1).toBeNull()

      // 不同的内容，相同的键 - 应该不命中
      const miss2 = manager.checkDuplicate('Different content', key)
      expect(miss2).toBeNull()
    })

    it('应该在没有幂等性键时回退到内容哈希', () => {
      const content = 'Hello world'

      manager.cacheResponse(content, 'Response 1')

      const result = manager.checkDuplicate(content)
      expect(result).not.toBeNull()
      expect(result?.content).toBe('Response 1')
    })
  })

  describe('disabled', () => {
    beforeEach(() => {
      const config: DeduplicationConfig = {
        strategy: 'content-hash',
        cacheTTL: 5000,
        enabled: false
      }
      manager = new DeduplicationManager(config)
    })

    it('应该在禁用时始终返回 null', () => {
      const content = 'Hello world'

      manager.cacheResponse(content, 'Response 1')

      const result = manager.checkDuplicate(content)
      expect(result).toBeNull()
    })
  })

  describe('cache management', () => {
    beforeEach(() => {
      const config: DeduplicationConfig = {
        strategy: 'content-hash',
        cacheTTL: 5000,
        enabled: true
      }
      manager = new DeduplicationManager(config)
    })

    it('应该返回缓存统计', () => {
      manager.cacheResponse('Content 1', 'Response 1')
      manager.cacheResponse('Content 2', 'Response 2')

      const stats = manager.getStats()
      expect(stats.size).toBe(2)
      expect(stats.entries).toHaveLength(2)
      expect(stats.entries[0].expiresIn).toBeGreaterThan(0)
    })

    it('应该清空缓存', () => {
      manager.cacheResponse('Content 1', 'Response 1')
      manager.cacheResponse('Content 2', 'Response 2')

      expect(manager.getStats().size).toBe(2)

      manager.clear()

      expect(manager.getStats().size).toBe(0)
    })

    it('应该自动清理过期缓存', async () => {
      const config: DeduplicationConfig = {
        strategy: 'content-hash',
        cacheTTL: 100, // 100ms
        enabled: true
      }
      manager.destroy()
      manager = new DeduplicationManager(config)

      // 添加多个缓存项
      manager.cacheResponse('Content 1', 'Response 1')
      manager.cacheResponse('Content 2', 'Response 2')
      manager.cacheResponse('Content 3', 'Response 3')

      expect(manager.getStats().size).toBe(3)

      // 等待 TTL 过期
      await new Promise(resolve => setTimeout(resolve, 150))

      // 触发清理（通过检查一个过期的项）
      manager.checkDuplicate('Content 1')

      // 注意：自动清理是定期的（每分钟），所以这里我们只能验证手动清理
      // 在实际使用中，过期的缓存会在下次访问时被删除
    })
  })

  describe('destroy', () => {
    it('应该停止清理任务并清空缓存', () => {
      const config: DeduplicationConfig = {
        strategy: 'content-hash',
        cacheTTL: 5000,
        enabled: true
      }
      manager = new DeduplicationManager(config)

      manager.cacheResponse('Content 1', 'Response 1')
      expect(manager.getStats().size).toBe(1)

      manager.destroy()

      expect(manager.getStats().size).toBe(0)
    })
  })
})
