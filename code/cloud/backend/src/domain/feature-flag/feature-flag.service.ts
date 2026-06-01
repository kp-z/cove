/**
 * Feature Flag Service
 *
 * Feature Flag 服务实现：整合存储层和缓存层
 */

import type {
  IFeatureFlag,
  FeatureFlagConfig
} from './feature-flag.interface'
import type { IFeatureFlagStore } from '../../infrastructure/storage/feature-flag-store.interface'

/**
 * Feature Flag 服务
 */
export class FeatureFlagService implements IFeatureFlag {
  private readonly DEFAULT_FLAG_NAME = 'llm-execution-mode'

  constructor(
    private store: IFeatureFlagStore
  ) {}

  async enable(realmId: string, flagName: string = this.DEFAULT_FLAG_NAME): Promise<void> {
    const config = await this.store.get(realmId)

    if (config) {
      // 更新现有配置
      config.enabled = true
      config.flagName = flagName
      config.updatedAt = new Date()
      await this.store.set(config)
    } else {
      // 创建新配置
      const newConfig: FeatureFlagConfig = {
        realmId,
        flagName,
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.store.set(newConfig)
    }
  }

  async disable(realmId: string, _flagName: string = this.DEFAULT_FLAG_NAME): Promise<void> {
    const config = await this.store.get(realmId)

    if (config) {
      config.enabled = false
      config.updatedAt = new Date()
      await this.store.set(config)
    }
  }

  async isEnabled(realmId: string, _flagName: string = this.DEFAULT_FLAG_NAME): Promise<boolean> {
    const config = await this.store.get(realmId)
    return config?.enabled ?? false
  }

  async getConfig(realmId: string): Promise<FeatureFlagConfig | null> {
    return this.store.get(realmId)
  }
}
