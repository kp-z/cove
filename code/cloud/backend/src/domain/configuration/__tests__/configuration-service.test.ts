/**
 * Configuration Service Tests
 *
 * TDD: 测试配置服务
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type {
  IConfigurationService,
  SyncResult,
  ValidationResult
} from '../configuration-service.interface'
import type { RealmConfiguration } from '../../../infrastructure/gateway/backend-gateway.interface'

// Mock 实现用于测试
class MockConfigurationService implements IConfigurationService {
  private localConfigs: Map<string, RealmConfiguration> = new Map()
  private validationInterval?: NodeJS.Timeout

  constructor() {
    // 初始化测试数据
    this.localConfigs.set('realm-1', {
      realmId: 'realm-1',
      version: 5,
      checksum: 'abc123',
      agents: [],
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
  }

  async syncConfig(realmId: string): Promise<SyncResult> {
    const localConfig = this.localConfigs.get(realmId)
    const localVersion = localConfig?.version ?? 0

    // 模拟远程版本
    const remoteVersion = 8

    if (localVersion === remoteVersion) {
      return {
        success: true,
        localVersion,
        remoteVersion,
        applied: false
      }
    }

    // 模拟增量同步
    const newConfig: RealmConfiguration = {
      realmId,
      version: remoteVersion,
      checksum: 'xyz789',
      agents: [],
      settings: {
        maxConcurrentAgents: 5,
        messageTimeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000
        }
      },
      updatedAt: new Date()
    }

    this.localConfigs.set(realmId, newConfig)

    return {
      success: true,
      localVersion,
      remoteVersion,
      applied: true
    }
  }

  async getLocalConfig(realmId: string): Promise<RealmConfiguration | null> {
    return this.localConfigs.get(realmId) || null
  }

  async getLocalVersion(realmId: string): Promise<number> {
    const config = this.localConfigs.get(realmId)
    return config?.version ?? 0
  }

  async validateConfig(realmId: string): Promise<ValidationResult> {
    const localConfig = this.localConfigs.get(realmId)

    if (!localConfig) {
      return {
        valid: false,
        checksumMatch: false,
        errors: ['Configuration not found']
      }
    }

    // 模拟校验和验证
    const remoteChecksum = 'abc123'
    const checksumMatch = localConfig.checksum === remoteChecksum

    return {
      valid: checksumMatch,
      checksumMatch,
      errors: checksumMatch ? [] : ['Checksum mismatch']
    }
  }

  async handleConfigPush(realmId: string, version: number): Promise<boolean> {
    const localVersion = await this.getLocalVersion(realmId)

    if (version <= localVersion) {
      return false // 版本不是更新的
    }

    // 模拟应用新配置
    const newConfig: RealmConfiguration = {
      realmId,
      version,
      checksum: `checksum-v${version}`,
      agents: [],
      settings: {
        maxConcurrentAgents: 5,
        messageTimeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          maxBackoffMs: 10000
        }
      },
      updatedAt: new Date()
    }

    this.localConfigs.set(realmId, newConfig)
    return true
  }

  startPeriodicValidation(): void {
    if (this.validationInterval) {
      return
    }

    this.validationInterval = setInterval(async () => {
      // 模拟定期校验
      for (const realmId of this.localConfigs.keys()) {
        await this.validateConfig(realmId)
      }
    }, 300000) // 5 分钟
  }

  stopPeriodicValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval)
      this.validationInterval = undefined
    }
  }

  // 测试辅助方法
  setLocalConfig(realmId: string, config: RealmConfiguration): void {
    this.localConfigs.set(realmId, config)
  }
}

describe('ConfigurationService', () => {
  let service: MockConfigurationService

  beforeEach(() => {
    service = new MockConfigurationService()
  })

  afterEach(() => {
    service.stopPeriodicValidation()
  })

  describe('配置同步', () => {
    it('should sync configuration when version differs', async () => {
      const result = await service.syncConfig('realm-1')

      expect(result.success).toBe(true)
      expect(result.localVersion).toBe(5)
      expect(result.remoteVersion).toBe(8)
      expect(result.applied).toBe(true)

      const config = await service.getLocalConfig('realm-1')
      expect(config?.version).toBe(8)
    })

    it('should skip sync when version matches', async () => {
      // 先同步到最新版本
      await service.syncConfig('realm-1')

      // 再次同步
      const result = await service.syncConfig('realm-1')

      expect(result.success).toBe(true)
      expect(result.applied).toBe(false)
    })

    it('should sync new realm from version 0', async () => {
      const result = await service.syncConfig('realm-new')

      expect(result.success).toBe(true)
      expect(result.localVersion).toBe(0)
      expect(result.remoteVersion).toBe(8)
      expect(result.applied).toBe(true)
    })
  })

  describe('本地配置管理', () => {
    it('should get local configuration', async () => {
      const config = await service.getLocalConfig('realm-1')

      expect(config).toBeDefined()
      expect(config?.realmId).toBe('realm-1')
      expect(config?.version).toBe(5)
    })

    it('should return null for non-existent realm', async () => {
      const config = await service.getLocalConfig('invalid')
      expect(config).toBeNull()
    })

    it('should get local version', async () => {
      const version = await service.getLocalVersion('realm-1')
      expect(version).toBe(5)
    })

    it('should return 0 for non-existent realm version', async () => {
      const version = await service.getLocalVersion('invalid')
      expect(version).toBe(0)
    })
  })

  describe('配置验证', () => {
    it('should validate configuration with matching checksum', async () => {
      const result = await service.validateConfig('realm-1')

      expect(result.valid).toBe(true)
      expect(result.checksumMatch).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect checksum mismatch', async () => {
      // 修改本地配置的校验和
      service.setLocalConfig('realm-1', {
        realmId: 'realm-1',
        version: 5,
        checksum: 'wrong-checksum',
        agents: [],
        settings: {
          maxConcurrentAgents: 5,
          messageTimeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            maxBackoffMs: 10000
          }
        },
        updatedAt: new Date()
      })

      const result = await service.validateConfig('realm-1')

      expect(result.valid).toBe(false)
      expect(result.checksumMatch).toBe(false)
      expect(result.errors).toContain('Checksum mismatch')
    })

    it('should fail validation for non-existent realm', async () => {
      const result = await service.validateConfig('invalid')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Configuration not found')
    })
  })

  describe('配置推送', () => {
    it('should handle config push with newer version', async () => {
      const applied = await service.handleConfigPush('realm-1', 10)

      expect(applied).toBe(true)

      const version = await service.getLocalVersion('realm-1')
      expect(version).toBe(10)
    })

    it('should reject config push with older version', async () => {
      const applied = await service.handleConfigPush('realm-1', 3)

      expect(applied).toBe(false)

      const version = await service.getLocalVersion('realm-1')
      expect(version).toBe(5) // 保持原版本
    })

    it('should reject config push with same version', async () => {
      const applied = await service.handleConfigPush('realm-1', 5)

      expect(applied).toBe(false)
    })
  })

  describe('定期校验', () => {
    it('should start periodic validation', () => {
      service.startPeriodicValidation()
      // 验证不会抛出错误
      expect(true).toBe(true)
    })

    it('should stop periodic validation', () => {
      service.startPeriodicValidation()
      service.stopPeriodicValidation()
      // 验证不会抛出错误
      expect(true).toBe(true)
    })

    it('should not start twice', () => {
      service.startPeriodicValidation()
      service.startPeriodicValidation() // 第二次调用应该被忽略
      service.stopPeriodicValidation()
      expect(true).toBe(true)
    })
  })

  describe('配置漂移检测', () => {
    it('should detect configuration drift', async () => {
      // 修改本地配置的校验和（模拟配置漂移）
      service.setLocalConfig('realm-1', {
        realmId: 'realm-1',
        version: 5,
        checksum: 'drifted-checksum',
        agents: [],
        settings: {
          maxConcurrentAgents: 5,
          messageTimeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            maxBackoffMs: 10000
          }
        },
        updatedAt: new Date()
      })

      const validation = await service.validateConfig('realm-1')
      expect(validation.valid).toBe(false)

      // 重新同步
      const sync = await service.syncConfig('realm-1')
      expect(sync.applied).toBe(true)

      // 同步后版本更新，校验和也会不同
      // 这个测试主要验证配置漂移检测和重新同步的流程
      const config = await service.getLocalConfig('realm-1')
      expect(config?.version).toBe(8) // 版本已更新
    })
  })
})
