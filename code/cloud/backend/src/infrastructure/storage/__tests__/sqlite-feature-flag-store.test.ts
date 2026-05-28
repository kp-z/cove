/**
 * SQLite Feature Flag Store Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { SqliteFeatureFlagStore } from '../sqlite-feature-flag-store'
import type { FeatureFlagConfig } from '../../../domain/feature-flag/feature-flag.interface'

describe('SqliteFeatureFlagStore', () => {
  let prisma: PrismaClient
  let store: SqliteFeatureFlagStore

  beforeEach(async () => {
    prisma = new PrismaClient()
    store = new SqliteFeatureFlagStore(prisma)
    await prisma.featureFlagConfig.deleteMany()
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  const createMockConfig = (overrides?: Partial<FeatureFlagConfig>): FeatureFlagConfig => ({
    realmId: 'realm-1',
    flagName: 'test-flag',
    enabled: true,
    mode: 'backend',
    rolloutPercentage: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  })

  describe('set and get', () => {
    it('should save and retrieve config', async () => {
      const config = createMockConfig()
      await store.set(config)

      const retrieved = await store.get('realm-1')
      expect(retrieved).toBeDefined()
      expect(retrieved!.realmId).toBe('realm-1')
      expect(retrieved!.enabled).toBe(true)
    })

    it('should update existing config', async () => {
      const config = createMockConfig()
      await store.set(config)

      config.enabled = false
      config.mode = 'device'
      await store.set(config)

      const retrieved = await store.get('realm-1')
      expect(retrieved!.enabled).toBe(false)
      expect(retrieved!.mode).toBe('device')
    })

    it('should return null for non-existent config', async () => {
      const retrieved = await store.get('non-existent')
      expect(retrieved).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete config', async () => {
      const config = createMockConfig()
      await store.set(config)

      await store.delete('realm-1')

      const retrieved = await store.get('realm-1')
      expect(retrieved).toBeNull()
    })

    it('should not throw when deleting non-existent config', async () => {
      await expect(store.delete('non-existent')).resolves.not.toThrow()
    })
  })

  describe('list', () => {
    it('should list all configs', async () => {
      await store.set(createMockConfig({ realmId: 'realm-1' }))
      await store.set(createMockConfig({ realmId: 'realm-2' }))

      const configs = await store.list()
      expect(configs).toHaveLength(2)
    })

    it('should return empty array when no configs', async () => {
      const configs = await store.list()
      expect(configs).toHaveLength(0)
    })
  })
})
