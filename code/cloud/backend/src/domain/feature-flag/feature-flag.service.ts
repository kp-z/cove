/**
 * Feature Flag Service
 *
 * Feature Flag 服务实现：整合存储层和缓存层
 */

import type {
  IFeatureFlag,
  FeatureFlagConfig,
  ExecutionMode
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
        mode: 'backend', // 默认使用 backend 模式
        rolloutPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.store.set(newConfig)
    }
  }

  async disable(realmId: string, flagName: string = this.DEFAULT_FLAG_NAME): Promise<void> {
    const config = await this.store.get(realmId)

    if (config) {
      config.enabled = false
      config.updatedAt = new Date()
      await this.store.set(config)
    }
  }

  async isEnabled(realmId: string, flagName: string = this.DEFAULT_FLAG_NAME): Promise<boolean> {
    const config = await this.store.get(realmId)
    return config?.enabled ?? false
  }

  async getMode(realmId: string): Promise<ExecutionMode> {
    const config = await this.store.get(realmId)
    return config?.mode ?? 'backend'
  }

  async setMode(realmId: string, mode: ExecutionMode): Promise<void> {
    const config = await this.store.get(realmId)

    if (config) {
      config.mode = mode
      config.updatedAt = new Date()
      await this.store.set(config)
    } else {
      // 创建新配置
      const newConfig: FeatureFlagConfig = {
        realmId,
        flagName: this.DEFAULT_FLAG_NAME,
        enabled: true,
        mode,
        rolloutPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.store.set(newConfig)
    }
  }

  async setRolloutPercentage(realmId: string, percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100')
    }

    const config = await this.store.get(realmId)

    if (config) {
      config.rolloutPercentage = percentage
      config.updatedAt = new Date()
      await this.store.set(config)
    } else {
      // 创建新配置
      const newConfig: FeatureFlagConfig = {
        realmId,
        flagName: this.DEFAULT_FLAG_NAME,
        enabled: true,
        mode: 'backend',
        rolloutPercentage: percentage,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await this.store.set(newConfig)
    }
  }

  async getConfig(realmId: string): Promise<FeatureFlagConfig | null> {
    return this.store.get(realmId)
  }
}
