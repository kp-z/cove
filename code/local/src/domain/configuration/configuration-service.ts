/**
 * Configuration Service Implementation
 *
 * 配置同步服务：负责配置的同步、验证和管理
 */

import type { IConfigurationService, SyncResult } from './configuration-service.interface'
import type { BackendGateway, RealmConfiguration } from '../../infrastructure/gateway/backend-gateway.interface'
import type { IConfigCache } from '../../infrastructure/storage/config-cache.interface'
import { ConfigurationValidator } from './configuration-validator'

/**
 * 配置服务实现
 */
export class ConfigurationService implements IConfigurationService {
  private validator: ConfigurationValidator
  private validationTimer?: NodeJS.Timeout

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly configCache: IConfigCache
  ) {
    this.validator = new ConfigurationValidator()
  }

  /**
   * 同步配置
   */
  async syncConfig(realmId: string): Promise<SyncResult> {
    try {
      // 1. 获取本地版本和校验和
      const localVersion = await this.configCache.getVersion(realmId)
      const localChecksum = await this.configCache.getChecksum(realmId)

      // 2. 从 Backend 获取远程配置（通过 BackendGateway）
      const remoteConfig = await this.backendGateway.fetchRealmConfiguration(realmId)

      // 3. 验证远程配置
      const validationResult = this.validator.validate(remoteConfig)
      if (!validationResult.valid) {
        return {
          success: false,
          version: localVersion,
          checksum: localChecksum || '',
          error: `Invalid remote config: ${validationResult.errors.join(', ')}`
        }
      }

      // 4. 验证校验和
      if (!this.validator.verifyChecksum(remoteConfig)) {
        return {
          success: false,
          version: localVersion,
          checksum: localChecksum || '',
          error: 'Remote config checksum mismatch'
        }
      }

      // 5. 检查是否需要同步
      if (localChecksum === remoteConfig.checksum) {
        // 校验和匹配，无需同步
        return {
          success: true,
          version: remoteConfig.version,
          checksum: remoteConfig.checksum
        }
      }

      // 6. 保存到本地缓存
      await this.configCache.set(realmId, remoteConfig)

      return {
        success: true,
        version: remoteConfig.version,
        checksum: remoteConfig.checksum
      }
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
   * 启动定期校验
   */
  startPeriodicValidation(intervalMs: number = 300000): void {
    if (this.validationTimer) {
      return
    }

    this.validationTimer = setInterval(async () => {
      // 获取所有 realmId（这里简化处理，实际需要维护 realmId 列表）
      // 暂时跳过，因为我们没有维护 realmId 列表
      console.log('Periodic validation triggered')
    }, intervalMs)
  }

  /**
   * 停止定期校验
   */
  stopPeriodicValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer)
      this.validationTimer = undefined
    }
  }
}
