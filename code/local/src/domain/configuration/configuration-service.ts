/**
 * Configuration Service Implementation
 *
 * 配置同步服务：负责配置的同步、验证和管理（支持增量同步）
 */

import type { IConfigurationService, SyncResult } from './configuration-service.interface'
import type { BackendGateway, RealmConfiguration } from '../../infrastructure/gateway/backend-gateway.interface'
import type { IConfigCache } from '../../infrastructure/storage/config-cache.interface'
import { ConfigurationValidator } from './configuration-validator'

/**
 * 配置变更（Delta）
 */
interface ConfigDelta {
  version: number
  changes: Record<string, unknown>
  timestamp: Date
}

/**
 * 配置服务实现
 */
export class ConfigurationService implements IConfigurationService {
  private validator: ConfigurationValidator
  private validationTimer?: NodeJS.Timeout
  private realmIds: Set<string> = new Set()

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly configCache: IConfigCache
  ) {
    this.validator = new ConfigurationValidator()
  }

  /**
   * 同步配置（支持增量同步）
   */
  async syncConfig(realmId: string): Promise<SyncResult> {
    try {
      // 记录 realmId 用于定期校验
      this.realmIds.add(realmId)

      // 1. 获取本地版本和校验和
      const localVersion = await this.configCache.getVersion(realmId)
      const localChecksum = await this.configCache.getChecksum(realmId)

      // 2. 从 Backend 获取远程版本
      const remoteVersion = await this.backendGateway.getConfigVersion(realmId)

      // 3. 如果版本相同，检查校验和
      if (localVersion === remoteVersion && localChecksum) {
        // 获取远程配置验证校验和
        const remoteConfig = await this.backendGateway.fetchRealmConfiguration(realmId)

        if (localChecksum === remoteConfig.checksum) {
          // 校验和匹配，无需同步
          return {
            success: true,
            version: remoteVersion,
            checksum: remoteConfig.checksum
          }
        }
      }

      // 4. 需要同步 - 尝试增量同步
      if (localVersion > 0 && remoteVersion > localVersion) {
        // 尝试增量同步
        const incrementalResult = await this.incrementalSync(realmId, localVersion, remoteVersion)
        if (incrementalResult.success) {
          return incrementalResult
        }

        // 增量同步失败，回退到全量同步
        console.warn('Incremental sync failed, falling back to full sync')
      }

      // 5. 全量同步
      return await this.fullSync(realmId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        version: await this.configCache.getVersion(realmId),
        checksum: (await this.configCache.getChecksum(realmId)) || '',
        error: errorMessage
      }
    }
  }

  /**
   * 增量同步
   */
  private async incrementalSync(
    realmId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<SyncResult> {
    try {
      // 获取版本链（Delta 列表）
      const deltas = await this.getConfigDeltas(realmId, fromVersion, toVersion)

      if (!deltas || deltas.length === 0) {
        throw new Error('No deltas available')
      }

      // 获取当前配置
      let currentConfig = await this.configCache.get(realmId)
      if (!currentConfig) {
        throw new Error('Local config not found')
      }

      // 应用每个 Delta
      for (const delta of deltas) {
        currentConfig = this.applyDelta(currentConfig, delta)
      }

      // 验证最终配置
      const validationResult = this.validator.validate(currentConfig)
      if (!validationResult.valid) {
        throw new Error(`Invalid config after applying deltas: ${validationResult.errors.join(', ')}`)
      }

      // 验证校验和
      if (!this.validator.verifyChecksum(currentConfig)) {
        throw new Error('Checksum mismatch after applying deltas')
      }

      // 保存到本地缓存
      await this.configCache.set(realmId, currentConfig)

      return {
        success: true,
        version: currentConfig.version,
        checksum: currentConfig.checksum
      }
    } catch (error) {
      console.error('Incremental sync failed:', error)
      return {
        success: false,
        version: fromVersion,
        checksum: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 全量同步
   */
  private async fullSync(realmId: string): Promise<SyncResult> {
    // 从 Backend 获取完整配置
    const remoteConfig = await this.backendGateway.fetchRealmConfiguration(realmId)

    // 验证远程配置
    const validationResult = this.validator.validate(remoteConfig)
    if (!validationResult.valid) {
      return {
        success: false,
        version: await this.configCache.getVersion(realmId),
        checksum: (await this.configCache.getChecksum(realmId)) || '',
        error: `Invalid remote config: ${validationResult.errors.join(', ')}`
      }
    }

    // 验证校验和
    if (!this.validator.verifyChecksum(remoteConfig)) {
      return {
        success: false,
        version: await this.configCache.getVersion(realmId),
        checksum: (await this.configCache.getChecksum(realmId)) || '',
        error: 'Remote config checksum mismatch'
      }
    }

    // 保存到本地缓存
    await this.configCache.set(realmId, remoteConfig)

    return {
      success: true,
      version: remoteConfig.version,
      checksum: remoteConfig.checksum
    }
  }

  /**
   * 获取配置变更链（Delta）
   *
   * 注意：这需要 Backend 支持，这里提供接口
   */
  private async getConfigDeltas(
    realmId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<ConfigDelta[]> {
    // TODO: 实现从 Backend 获取 Delta 的逻辑
    // 这需要 Backend 提供相应的 API
    // 暂时返回空数组，回退到全量同步
    return []
  }

  /**
   * 应用配置变更（Delta）
   */
  private applyDelta(config: RealmConfiguration, delta: ConfigDelta): RealmConfiguration {
    return {
      ...config,
      version: delta.version,
      settings: {
        ...config.settings,
        ...delta.changes
      },
      updatedAt: delta.timestamp
    }
  }

  /**
   * 获取本地配置
   */
  async getConfig(realmId: string): Promise<RealmConfiguration | null> {
    return this.configCache.get(realmId)
  }

  /**
   * 获取本地配置版本
   */
  async getVersion(realmId: string): Promise<number> {
    return this.configCache.getVersion(realmId)
  }

  /**
   * 验证配置完整性
   */
  async validateConfig(realmId: string): Promise<boolean> {
    const config = await this.configCache.get(realmId)
    if (!config) {
      return false
    }

    // 验证配置格式
    const validationResult = this.validator.validate(config)
    if (!validationResult.valid) {
      return false
    }

    // 验证校验和
    return this.validator.verifyChecksum(config)
  }

  /**
   * 处理配置推送
   */
  async handleConfigPush(realmId: string, config: RealmConfiguration): Promise<void> {
    // 记录 realmId
    this.realmIds.add(realmId)

    // 验证配置
    const validationResult = this.validator.validate(config)
    if (!validationResult.valid) {
      throw new Error(`Invalid config: ${validationResult.errors.join(', ')}`)
    }

    // 验证校验和
    if (!this.validator.verifyChecksum(config)) {
      throw new Error('Config checksum mismatch')
    }

    // 保存到本地缓存
    await this.configCache.set(realmId, config)
  }

  /**
   * 启动定期校验（每 5 分钟检查配置一致性）
   */
  startPeriodicValidation(intervalMs: number = 300000): void {
    if (this.validationTimer) {
      return
    }

    this.validationTimer = setInterval(async () => {
      // 对所有已知的 realmId 进行校验
      for (const realmId of this.realmIds) {
        try {
          await this.checkConfigDrift(realmId)
        } catch (error) {
          console.error(`Periodic validation failed for realm ${realmId}:`, error)
        }
      }
    }, intervalMs)

    console.log(`Started periodic config validation (interval: ${intervalMs}ms)`)
  }

  /**
   * 停止定期校验
   */
  stopPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer)
      this.validationTimer = undefined
      console.log('Stopped periodic config validation')
    }
  }

  /**
   * 检查配置漂移
   */
  private async checkConfigDrift(realmId: string): Promise<void> {
    const localChecksum = await this.configCache.getChecksum(realmId)
    if (!localChecksum) {
      return
    }

    // 获取远程配置
    const remoteConfig = await this.backendGateway.fetchRealmConfiguration(realmId)

    // 检查校验和是否一致
    if (localChecksum !== remoteConfig.checksum) {
      console.warn(`Config drift detected for realm ${realmId}, re-syncing...`)
      await this.syncConfig(realmId)
    }
  }
}
