import { describe, it, expect } from 'vitest'
import { MetadataCollectorFactory } from '../collector-factory'

describe('MetadataCollectorFactory', () => {
  describe('Basic Creation', () => {
    it('should create collectors without pooling', () => {
      const factory = new MetadataCollectorFactory({ enablePooling: false })

      const collector1 = factory.create('adapter-1', 'streaming')
      const collector2 = factory.create('adapter-2', 'batch')

      expect(collector1).toBeDefined()
      expect(collector2).toBeDefined()
      expect(collector1).not.toBe(collector2)
    })
  })

  describe('Object Pooling', () => {
    it('should reuse collectors when pooling enabled', () => {
      const factory = new MetadataCollectorFactory({
        enablePooling: true,
        maxPoolSize: 5
      })

      const collector1 = factory.create('adapter-1', 'streaming')
      factory.release(collector1)

      const collector2 = factory.create('adapter-2', 'batch')

      // Should reuse the same instance (after clearing)
      expect(collector2).toBe(collector1)
    })

    it('should respect max pool size', () => {
      const factory = new MetadataCollectorFactory({
        enablePooling: true,
        maxPoolSize: 2
      })

      const collectors = Array.from({ length: 5 }, (_, i) =>
        factory.create(`adapter-${i}`, 'streaming')
      )

      // Release all
      collectors.forEach(c => factory.release(c))

      const stats = factory.getStats()
      expect(stats.poolSize).toBe(2) // Only 2 should be pooled
      expect(stats.maxPoolSize).toBe(2)
    })

    it('should provide pool statistics', () => {
      const factory = new MetadataCollectorFactory({
        enablePooling: true,
        maxPoolSize: 10
      })

      const collector = factory.create('adapter', 'streaming')
      factory.release(collector)

      const stats = factory.getStats()
      expect(stats.poolSize).toBe(1)
      expect(stats.maxPoolSize).toBe(10)
      expect(stats.utilizationRate).toBe(0.1)
    })
  })

  describe('Drain', () => {
    it('should drain the pool', () => {
      const factory = new MetadataCollectorFactory({
        enablePooling: true,
        maxPoolSize: 5
      })

      const collectors = Array.from({ length: 3 }, (_, i) =>
        factory.create(`adapter-${i}`, 'streaming')
      )

      collectors.forEach(c => factory.release(c))
      expect(factory.getStats().poolSize).toBe(3)

      factory.drain()
      expect(factory.getStats().poolSize).toBe(0)
    })
  })
})
