/**
 * SQLite Feature Flag Store
 *
 * 基于 Prisma 的 Feature Flag 存储实现
 */

import { PrismaClient } from '@prisma/client'
import type { IFeatureFlagStore } from './feature-flag-store.interface'
import type { FeatureFlagConfig } from '../../domain/feature-flag/feature-flag.interface'

/**
 * SQLite Feature Flag 存储
 */
export class SqliteFeatureFlagStore implements IFeatureFlagStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * 获取配置
   */
  async get(realmId: string): Promise<FeatureFlagConfig | null> {
    const record = await this.prisma.featureFlagConfig.findUnique({
      where: { realmId }
    })

    if (!record) {
      return null
    }

    return {
      realmId: record.realmId,
      flagName: record.flagName,
      name: record.flagName, // Use flagName as name
      enabled: record.enabled,
      mode: record.mode as 'backend' | 'device',
      rolloutPercentage: record.rolloutPercentage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }
  }

  /**
   * 保存配置
   */
  async set(config: FeatureFlagConfig): Promise<void> {
    await this.prisma.featureFlagConfig.upsert({
      where: { realmId: config.realmId },
      create: {
        realmId: config.realmId,
        flagName: config.flagName,
        enabled: config.enabled,
        mode: config.mode,
        rolloutPercentage: config.rolloutPercentage,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      },
      update: {
        flagName: config.flagName,
        enabled: config.enabled,
        mode: config.mode,
        rolloutPercentage: config.rolloutPercentage,
        updatedAt: config.updatedAt
      }
    })
  }

  /**
   * 删除配置
   */
  async delete(realmId: string): Promise<void> {
    await this.prisma.featureFlagConfig.delete({
      where: { realmId }
    }).catch(() => {
      // Ignore if not found
    })
  }

  /**
   * 列出所有配置
   */
  async list(): Promise<FeatureFlagConfig[]> {
    const records = await this.prisma.featureFlagConfig.findMany()

    return records.map(record => ({
      realmId: record.realmId,
      flagName: record.flagName,
      name: record.flagName, // Use flagName as name
      enabled: record.enabled,
      mode: record.mode as 'backend' | 'device',
      rolloutPercentage: record.rolloutPercentage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    }))
  }

  /**
   * 关闭存储
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect()
  }
}
