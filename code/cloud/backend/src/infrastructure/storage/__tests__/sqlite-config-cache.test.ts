/**
 * SQLite Config Cache Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { SqliteConfigCache } from '../sqlite-config-cache'
import type { RealmConfiguration } from '../../gateway/backend-gateway.interface'

describe('SqliteConfigCache', () => {
  let prisma: PrismaClient
  let cache: SqliteConfigCache

  beforeEach(async () => {
    prisma = new PrismaClient()
    cache = new SqliteConfigCache(prisma)
    await prisma.configCache.deleteMany()
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })

  const createMockConfig = (): RealmConfiguration => ({
    realmId: 'realm-1',
    version: 1,
    agents: [
      {
        id: 'agent-1',
        name: 'Test Agent',
        displayName: 'Test Agent',
        status: 'active',
        scope: 'user',
        projectIds: [],
        config: {
          model: 'claude-3-opus',
          systemPrompt: 'You are a helpful assistant',
          temperature: 0.7,
          maxTokens: 1000
        }
      }
    ],
    devices: [],
    settings: {}
  })

  describe('set and get', () => {
    it('should save and retrieve config', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const retrieved = await cache.get('realm-1')
      expect(retrieved).toBeDefined()
      expect(retrieved!.realmId).toBe('realm-1')
      expect(retrieved!.agents).toHaveLength(1)
    })

    it('should return null for non-existent config', async () => {
      const retrieved = await cache.get('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should update config and increment version', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const version1 = await cache.getVersion('realm-1')
      expect(version1).toBe(1)

      // Update config
      config.agents.push({
        id: 'agent-2',
        name: 'Test Agent 2',
        displayName: 'Test Agent 2',
        status: 'active',
        scope: 'user',
        projectIds: [],
        config: {
          model: 'claude-3-sonnet',
          systemPrompt: 'You are a helpful assistant',
          temperature: 0.7,
          maxTokens: 1000
        }
      })
      await cache.set('realm-1', config)

      const version2 = await cache.getVersion('realm-1')
      expect(version2).toBe(2)

      const retrieved = await cache.get('realm-1')
      expect(retrieved!.agents).toHaveLength(2)
    })
  })

  describe('getVersion', () => {
    it('should return version', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const version = await cache.getVersion('realm-1')
      expect(version).toBe(1)
    })

    it('should return 0 for non-existent config', async () => {
      const version = await cache.getVersion('non-existent')
      expect(version).toBe(0)
    })
  })

  describe('getChecksum', () => {
    it('should return checksum', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const checksum = await cache.getChecksum('realm-1')
      expect(checksum).toBeDefined()
      expect(checksum).toHaveLength(64) // SHA-256 hex string
    })

    it('should return null for non-existent config', async () => {
      const checksum = await cache.getChecksum('non-existent')
      expect(checksum).toBeNull()
    })

    it('should change checksum when config changes', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const checksum1 = await cache.getChecksum('realm-1')

      // Update config
      config.agents[0].config.temperature = 0.9
      await cache.set('realm-1', config)

      const checksum2 = await cache.getChecksum('realm-1')
      expect(checksum2).not.toBe(checksum1)
    })
  })

  describe('verifyChecksum', () => {
    it('should verify correct checksum', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const checksum = await cache.getChecksum('realm-1')
      const isValid = await cache.verifyChecksum('realm-1', checksum!)
      expect(isValid).toBe(true)
    })

    it('should reject incorrect checksum', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      const isValid = await cache.verifyChecksum('realm-1', 'invalid-checksum')
      expect(isValid).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete config', async () => {
      const config = createMockConfig()
      await cache.set('realm-1', config)

      await cache.delete('realm-1')

      const retrieved = await cache.get('realm-1')
      expect(retrieved).toBeNull()
    })

    it('should not throw when deleting non-existent config', async () => {
      await expect(cache.delete('non-existent')).resolves.not.toThrow()
    })
  })

  describe('clear', () => {
    it('should clear all configs', async () => {
      await cache.set('realm-1', createMockConfig())
      await cache.set('realm-2', createMockConfig())

      await cache.clear()

      const config1 = await cache.get('realm-1')
      const config2 = await cache.get('realm-2')
      expect(config1).toBeNull()
      expect(config2).toBeNull()
    })
  })
})
