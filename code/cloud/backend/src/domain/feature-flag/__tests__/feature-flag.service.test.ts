/**
 * Feature Flag Service Tests
 *
 * 测试 Feature Flag 服务
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FeatureFlagService } from '../feature-flag.service'
import type { IFeatureFlagStore } from '../../../infrastructure/storage/feature-flag-store.interface'
import type { FeatureFlagConfig } from '../feature-flag.interface'

// Mock Feature Flag Store
class MockFeatureFlagStore implements IFeatureFlagStore {
  private configs: Map<string, FeatureFlagConfig> = new Map()

  async get(realmId: string): Promise<FeatureFlagConfig | null> {
    return this.configs.get(realmId) || null
  }

  async set(config: FeatureFlagConfig): Promise<void> {
    this.configs.set(config.realmId, config)
  }

  async delete(realmId: string): Promise<void> {
    this.configs.delete(realmId)
  }

  async list(): Promise<FeatureFlagConfig[]> {
    return Array.from(this.configs.values())
  }

  async close(): Promise<void> {
    this.configs.clear()
  }

  // Test helper
  clear(): void {
    this.configs.clear()
  }
}

describe('FeatureFlagService', () => {
  let store: MockFeatureFlagStore
  let service: FeatureFlagService

  beforeEach(() => {
    store = new MockFeatureFlagStore()
    service = new FeatureFlagService(store)
  })

  describe('enable/disable', () => {
    it('should enable feature flag', async () => {
      await service.enable('realm-1')

      const enabled = await service.isEnabled('realm-1')
      expect(enabled).toBe(true)
    })

    it('should disable feature flag', async () => {
      await service.enable('realm-1')
      await service.disable('realm-1')

      const enabled = await service.isEnabled('realm-1')
      expect(enabled).toBe(false)
    })

    it('should create config when enabling for the first time', async () => {
      await service.enable('realm-1')

      const config = await service.getConfig('realm-1')
      expect(config).toBeDefined()
      expect(config!.enabled).toBe(true)
    })

    it('should update existing config when enabling', async () => {
      await service.enable('realm-1')
      const config1 = await service.getConfig('realm-1')

      // 等待 1ms 确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 1))

      await service.disable('realm-1')
      await service.enable('realm-1')

      const config2 = await service.getConfig('realm-1')
      expect(config2!.enabled).toBe(true)
      expect(config2!.updatedAt.getTime()).toBeGreaterThanOrEqual(config1!.updatedAt.getTime())
    })
  })

  describe('isEnabled', () => {
    it('should return false for non-existent config', async () => {
      const enabled = await service.isEnabled('non-existent')
      expect(enabled).toBe(false)
    })

    it('should return true for enabled config', async () => {
      await service.enable('realm-1')
      const enabled = await service.isEnabled('realm-1')
      expect(enabled).toBe(true)
    })

    it('should return false for disabled config', async () => {
      await service.enable('realm-1')
      await service.disable('realm-1')
      const enabled = await service.isEnabled('realm-1')
      expect(enabled).toBe(false)
    })
  })

  // Removed: getMode/setMode tests - Backend Mode deleted
  // Removed: setRolloutPercentage tests - Backend Mode deleted

  describe('getConfig', () => {
    it('should return null for non-existent config', async () => {
      const config = await service.getConfig('non-existent')
      expect(config).toBeNull()
    })

    it('should return config', async () => {
      await service.enable('realm-1')

      const config = await service.getConfig('realm-1')
      expect(config).toBeDefined()
      expect(config!.realmId).toBe('realm-1')
      expect(config!.enabled).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete feature flag lifecycle', async () => {
      // 1. Enable feature flag
      await service.enable('realm-1')
      expect(await service.isEnabled('realm-1')).toBe(true)

      // 2. Disable feature flag
      await service.disable('realm-1')
      expect(await service.isEnabled('realm-1')).toBe(false)

      // 3. Re-enable
      await service.enable('realm-1')
      expect(await service.isEnabled('realm-1')).toBe(true)
    })

    it('should handle multiple realms independently', async () => {
      await service.enable('realm-1')
      await service.enable('realm-2')

      expect(await service.isEnabled('realm-1')).toBe(true)
      expect(await service.isEnabled('realm-2')).toBe(true)

      await service.disable('realm-1')

      expect(await service.isEnabled('realm-1')).toBe(false)
      expect(await service.isEnabled('realm-2')).toBe(true)
    })
  })
})
