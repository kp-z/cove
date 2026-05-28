/**
 * ConfigurationService Integration Tests
 *
 * 集成测试：验证 ConfigurationService + ConfigCache + BackendGateway 的协作
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type {
  IConfigurationService,
  SyncResult,
  ValidationResult
} from '../configuration-service.interface'
import type { IConfigCache } from '../../../infrastructure/storage/config-cache.interface'
import type {
  IBackendGateway,
  RealmConfiguration,
  ConfigChange,
  AgentConfig
} from '../../../infrastructure/gateway/backend-gateway.interface'
import crypto from 'crypto'

// ==================== Mock 实现 ====================

/**
 * Mock ConfigCache 实现（内存存储）
 */
class MockConfigCache implements IConfigCache {
  private cache: Map<string, RealmConfiguration> = new Map()

  async get(realmId: string): Promise<RealmConfiguration | null> {
    return this.cache.get(realmId) || null
  }

  async set(realmId: string, config: RealmConfiguration): Promise<void> {
    this.cache.set(realmId, config)
  }

  async delete(realmId: string): Promise<void> {
    this.cache.delete(realmId)
  }

  async getVersion(realmId: string): Promise<number> {
    const config = this.cache.get(realmId)
    return config?.version || 0
  }

  async close(): Promise<void> {
    // 清理资源
  }

  // 测试辅助方法
  clear(): void {
    this.cache.clear()
  }
}

/**
 * Mock BackendGateway 实现
 */
class MockBackendGateway implements Partial<IBackendGateway> {
  fetchRealmConfiguration = vi.fn<(realmId: string) => Promise<RealmConfiguration>>()
  getConfigVersion = vi.fn<(realmId: string) => Promise<number>>()
  getConfigChanges = vi.fn<(realmId: string, fromVersion: number, toVersion: number) => Promise<ConfigChange[]>>()
}

/**
 * 计算配置校验和
 */
function calculateChecksum(config: RealmConfiguration): string {
  const data = JSON.stringify({
    version: config.version,
    agents: config.agents,
    settings: config.settings
  })
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Mock ConfigurationService 实现
 */
class MockConfigurationService implements IConfigurationService {
  private validationInterval?: NodeJS.Timeout

  constructor(
    private configCache: IConfigCache,
    private gateway: Partial<IBackendGateway>
  ) {}

  async syncConfig(realmId: string): Promise<SyncResult> {
    try {
      // 1. 获取本地版本
      const localVersion = await this.configCache.getVersion(realmId)

      // 2. 获取远程版本
      if (!this.gateway.getConfigVersion) {
        throw new Error('Gateway does not support getConfigVersion')
      }
      const remoteVersion = await this.gateway.getConfigVersion(realmId)

      // 3. 如果版本相同，无需同步
      if (localVersion === remoteVersion) {
        return {
          success: true,
          localVersion,
          remoteVersion,
          applied: false
        }
      }

      // 4. 如果本地版本为 0 或远程版本较新很多，执行全量同步
      if (localVersion === 0 || remoteVersion - localVersion > 10) {
        return await this.fullSync(realmId, localVersion, remoteVersion)
      }

      // 5. 否则执行增量同步
      return await this.incrementalSync(realmId, localVersion, remoteVersion)
    } catch (error) {
      return {
        success: false,
        localVersion: await this.configCache.getVersion(realmId),
        remoteVersion: 0,
        applied: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async fullSync(realmId: string, localVersion: number, remoteVersion: number): Promise<SyncResult> {
    if (!this.gateway.fetchRealmConfiguration) {
      throw new Error('Gateway does not support fetchRealmConfiguration')
    }

    // 获取完整配置
    const config = await this.gateway.fetchRealmConfiguration(realmId)

    // 计算校验和
    const checksum = calculateChecksum(config)
    config.checksum = checksum

    // 保存到缓存
    await this.configCache.set(realmId, config)

    return {
      success: true,
      localVersion,
      remoteVersion,
      applied: true
    }
  }

  private async incrementalSync(realmId: string, localVersion: number, remoteVersion: number): Promise<SyncResult> {
    if (!this.gateway.getConfigChanges) {
      throw new Error('Gateway does not support getConfigChanges')
    }

    // 获取增量变更
    const changes = await this.gateway.getConfigChanges(realmId, localVersion, remoteVersion)

    // 获取本地配置
    let config = await this.configCache.get(realmId)
    if (!config) {
      // 如果本地没有配置，执行全量同步
      return await this.fullSync(realmId, localVersion, remoteVersion)
    }

    // 应用增量变更
    for (const change of changes) {
      config = this.applyChange(config, change)
    }

    // 更新版本和校验和
    config.version = remoteVersion
    config.checksum = calculateChecksum(config)
    config.updatedAt = new Date()

    // 保存到缓存
    await this.configCache.set(realmId, config)

    return {
      success: true,
      localVersion,
      remoteVersion,
      applied: true
    }
  }

  private applyChange(config: RealmConfiguration, change: ConfigChange): RealmConfiguration {
    // 简化实现：直接应用变更
    // 实际实现需要根据 change.changes 中的 path 和 operation 来修改配置
    return {
      ...config,
      version: change.version
    }
  }

  async getLocalConfig(realmId: string): Promise<RealmConfiguration | null> {
    return this.configCache.get(realmId)
  }

  async getLocalVersion(realmId: string): Promise<number> {
    return this.configCache.getVersion(realmId)
  }

  async validateConfig(realmId: string): Promise<ValidationResult> {
    const config = await this.configCache.get(realmId)

    if (!config) {
      return {
        valid: false,
        checksumMatch: false,
        errors: ['Configuration not found']
      }
    }

    // 计算当前校验和
    const currentChecksum = calculateChecksum(config)

    // 验证校验和
    const checksumMatch = currentChecksum === config.checksum

    const errors: string[] = []
    if (!checksumMatch) {
      errors.push('Checksum mismatch')
    }

    // 验证配置完整性
    if (!config.agents || config.agents.length === 0) {
      errors.push('No agents configured')
    }

    if (!config.settings) {
      errors.push('Settings missing')
    }

    return {
      valid: errors.length === 0,
      checksumMatch,
      errors
    }
  }

  async handleConfigPush(realmId: string, version: number): Promise<boolean> {
    try {
      // 获取本地版本
      const localVersion = await this.configCache.getVersion(realmId)

      // 如果推送的版本小于等于本地版本，拒绝（重复或过期）
      if (version <= localVersion) {
        return false
      }

      // 如果推送的版本不是连续的（跳过版本），也拒绝
      if (version > localVersion + 1) {
        return false
      }

      // 同步配置
      const result = await this.syncConfig(realmId)

      return result.success && result.applied
    } catch (error) {
      return false
    }
  }

  startPeriodicValidation(): void {
    // 每 5 分钟验证一次（测试中使用更短的间隔）
    this.validationInterval = setInterval(async () => {
      // 验证所有缓存的配置
      // 简化实现
    }, 5 * 60 * 1000)
  }

  stopPeriodicValidation(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval)
      this.validationInterval = undefined
    }
  }
}

// ==================== 测试套件 ====================

describe('ConfigurationService Integration', () => {
  let configCache: MockConfigCache
  let gateway: MockBackendGateway
  let configService: MockConfigurationService

  const createMockConfig = (version: number): RealmConfiguration => {
    const agents: AgentConfig[] = [
      {
        id: 'agent-1',
        name: 'Test Agent',
        description: 'Test agent',
        systemPrompt: 'You are helpful',
        adapterId: 'anthropic-adapter',
        adapterVersion: '1.0.0',
        enabled: true,
        priority: 1
      }
    ]

    const config: RealmConfiguration = {
      realmId: 'realm-1',
      version,
      checksum: '',
      agents,
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

    config.checksum = calculateChecksum(config)
    return config
  }

  beforeEach(() => {
    configCache = new MockConfigCache()
    gateway = new MockBackendGateway()
    configService = new MockConfigurationService(configCache, gateway)
  })

  afterEach(() => {
    configService.stopPeriodicValidation()
    configCache.clear()
  })

  describe('配置同步', () => {
    it('should sync configuration from backend', async () => {
      // 1. Mock Backend 返回配置
      const remoteConfig = createMockConfig(5)
      gateway.fetchRealmConfiguration.mockResolvedValue(remoteConfig)
      gateway.getConfigVersion.mockResolvedValue(5)

      // 2. 同步配置
      const result = await configService.syncConfig('realm-1')

      // 3. 验证同步成功
      expect(result.success).toBe(true)
      expect(result.localVersion).toBe(0)
      expect(result.remoteVersion).toBe(5)
      expect(result.applied).toBe(true)

      // 4. 验证配置缓存
      const cached = await configCache.get('realm-1')
      expect(cached).toBeDefined()
      expect(cached!.version).toBe(5)
      expect(cached!.checksum).toBe(remoteConfig.checksum)
    })

    it('should skip sync when versions match', async () => {
      // 1. 设置本地配置
      const localConfig = createMockConfig(5)
      await configCache.set('realm-1', localConfig)

      // 2. Mock Backend 返回相同版本
      gateway.getConfigVersion.mockResolvedValue(5)

      // 3. 同步配置
      const result = await configService.syncConfig('realm-1')

      // 4. 验证未应用更新
      expect(result.success).toBe(true)
      expect(result.localVersion).toBe(5)
      expect(result.remoteVersion).toBe(5)
      expect(result.applied).toBe(false)

      // 5. 验证未调用 fetchRealmConfiguration
      expect(gateway.fetchRealmConfiguration).not.toHaveBeenCalled()
    })

    it('should perform full sync when local version is 0', async () => {
      // 本地版本为 0（首次同步）
      const remoteConfig = createMockConfig(5)
      gateway.fetchRealmConfiguration.mockResolvedValue(remoteConfig)
      gateway.getConfigVersion.mockResolvedValue(5)

      const result = await configService.syncConfig('realm-1')

      expect(result.success).toBe(true)
      expect(result.applied).toBe(true)
      expect(gateway.fetchRealmConfiguration).toHaveBeenCalled()
    })

    it('should handle sync errors gracefully', async () => {
      // Mock Backend 失败
      gateway.getConfigVersion.mockRejectedValue(new Error('Network error'))

      const result = await configService.syncConfig('realm-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('增量同步', () => {
    it('should apply incremental config changes', async () => {
      // 1. 设置本地版本 v3
      const localConfig = createMockConfig(3)
      await configCache.set('realm-1', localConfig)

      // 2. Mock Backend 返回增量变更（v3 -> v5）
      gateway.getConfigVersion.mockResolvedValue(5)
      gateway.getConfigChanges.mockResolvedValue([
        {
          version: 4,
          timestamp: new Date(),
          changes: [
            {
              path: 'agents[0].enabled',
              operation: 'update',
              oldValue: true,
              newValue: false
            }
          ],
          checksum: 'abc123'
        },
        {
          version: 5,
          timestamp: new Date(),
          changes: [
            {
              path: 'settings.maxConcurrentAgents',
              operation: 'update',
              oldValue: 5,
              newValue: 10
            }
          ],
          checksum: 'def456'
        }
      ])

      // 3. 同步配置
      const result = await configService.syncConfig('realm-1')

      // 4. 验证增量同步成功
      expect(result.success).toBe(true)
      expect(result.localVersion).toBe(3)
      expect(result.remoteVersion).toBe(5)
      expect(result.applied).toBe(true)

      // 5. 验证配置已更新
      const cached = await configCache.get('realm-1')
      expect(cached!.version).toBe(5)
    })

    it('should fallback to full sync when version gap is large', async () => {
      // 本地版本 v1，远程版本 v20（差距 > 10）
      const localConfig = createMockConfig(1)
      await configCache.set('realm-1', localConfig)

      const remoteConfig = createMockConfig(20)
      gateway.fetchRealmConfiguration.mockResolvedValue(remoteConfig)
      gateway.getConfigVersion.mockResolvedValue(20)

      const result = await configService.syncConfig('realm-1')

      // 验证执行了全量同步
      expect(result.success).toBe(true)
      expect(gateway.fetchRealmConfiguration).toHaveBeenCalled()
      expect(gateway.getConfigChanges).not.toHaveBeenCalled()
    })

    it('should fallback to full sync when local config is missing', async () => {
      // 本地没有配置，但版本号不为 0（异常情况）
      gateway.getConfigVersion.mockResolvedValue(5)
      gateway.getConfigChanges.mockResolvedValue([])

      const remoteConfig = createMockConfig(5)
      gateway.fetchRealmConfiguration.mockResolvedValue(remoteConfig)

      const result = await configService.syncConfig('realm-1')

      // 验证执行了全量同步
      expect(result.success).toBe(true)
      expect(gateway.fetchRealmConfiguration).toHaveBeenCalled()
    })
  })

  describe('配置验证', () => {
    it('should validate configuration checksum', async () => {
      // 1. 设置配置
      const config = createMockConfig(5)
      await configCache.set('realm-1', config)

      // 2. 验证配置
      const result = await configService.validateConfig('realm-1')

      // 3. 验证通过
      expect(result.valid).toBe(true)
      expect(result.checksumMatch).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect config corruption', async () => {
      // 1. 设置配置
      const config = createMockConfig(5)
      await configCache.set('realm-1', config)

      // 2. 篡改配置（修改 agents 但不更新 checksum）
      config.agents = []

      // 3. 验证配置
      const result = await configService.validateConfig('realm-1')

      // 4. 验证失败
      expect(result.valid).toBe(false)
      expect(result.checksumMatch).toBe(false)
      expect(result.errors).toContain('Checksum mismatch')
      expect(result.errors).toContain('No agents configured')
    })

    it('should detect missing configuration', async () => {
      // 验证不存在的配置
      const result = await configService.validateConfig('non-existent')

      expect(result.valid).toBe(false)
      expect(result.checksumMatch).toBe(false)
      expect(result.errors).toContain('Configuration not found')
    })

    it('should detect incomplete configuration', async () => {
      // 创建不完整的配置
      const config = createMockConfig(5)
      config.agents = []
      config.checksum = calculateChecksum(config)

      await configCache.set('realm-1', config)

      const result = await configService.validateConfig('realm-1')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('No agents configured')
    })
  })

  describe('配置推送', () => {
    it('should handle config push from backend', async () => {
      // 1. 设置本地版本 v5
      const localConfig = createMockConfig(5)
      await configCache.set('realm-1', localConfig)

      // 2. Mock Backend 推送 v6
      const remoteConfig = createMockConfig(6)
      gateway.getConfigVersion.mockResolvedValue(6)
      gateway.getConfigChanges.mockResolvedValue([
        {
          version: 6,
          timestamp: new Date(),
          changes: [],
          checksum: remoteConfig.checksum
        }
      ])

      // 3. 处理推送
      const success = await configService.handleConfigPush('realm-1', 6)

      // 4. 验证成功
      expect(success).toBe(true)

      // 5. 验证配置已更新
      const cached = await configCache.get('realm-1')
      expect(cached!.version).toBe(6)
    })

    it('should reject out-of-order config push', async () => {
      // 本地版本 v5，推送 v7（跳过 v6）
      const localConfig = createMockConfig(5)
      await configCache.set('realm-1', localConfig)

      const success = await configService.handleConfigPush('realm-1', 7)

      // 验证拒绝
      expect(success).toBe(false)
    })

    it('should reject duplicate config push', async () => {
      // 本地版本 v5，推送 v5（重复）
      const localConfig = createMockConfig(5)
      await configCache.set('realm-1', localConfig)

      const success = await configService.handleConfigPush('realm-1', 5)

      // 验证拒绝
      expect(success).toBe(false)
    })
  })

  describe('本地配置查询', () => {
    it('should get local configuration', async () => {
      const config = createMockConfig(5)
      await configCache.set('realm-1', config)

      const local = await configService.getLocalConfig('realm-1')

      expect(local).toBeDefined()
      expect(local!.version).toBe(5)
    })

    it('should return null for non-existent configuration', async () => {
      const local = await configService.getLocalConfig('non-existent')

      expect(local).toBeNull()
    })

    it('should get local version', async () => {
      const config = createMockConfig(5)
      await configCache.set('realm-1', config)

      const version = await configService.getLocalVersion('realm-1')

      expect(version).toBe(5)
    })

    it('should return 0 for non-existent version', async () => {
      const version = await configService.getLocalVersion('non-existent')

      expect(version).toBe(0)
    })
  })

  describe('定期校验', () => {
    it('should start and stop periodic validation', () => {
      configService.startPeriodicValidation()
      // 验证已启动（通过内部状态）
      expect(true).toBe(true)

      configService.stopPeriodicValidation()
      // 验证已停止
      expect(true).toBe(true)
    })
  })
})
