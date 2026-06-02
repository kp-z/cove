/**
 * SQLite Config Cache
 *
 * 基于 Prisma 的配置缓存实现
 */

import { PrismaClient } from '../../../generated/client'
import crypto from 'crypto'
import type { IConfigCache } from './config-cache.interface'
import type { RealmConfiguration } from '../gateway/backend-gateway.interface'

/**
 * SQLite 配置缓存
 */
export class SqliteConfigCache implements IConfigCache {
  constructor(private prisma: PrismaClient) {}

  /**
   * 保存配置
   */
  async set(realmId: string, config: RealmConfiguration): Promise<void> {
    const configJson = JSON.stringify(config)
    const checksum = this.calculateChecksum(configJson)

    // 获取当前版本
    const current = await this.prisma.configCache.findUnique({
      where: { realmId }
    })

    const newVersion = current ? current.version + 1 : 1

    await this.prisma.configCache.upsert({
      where: { realmId },
      create: {
        realmId,
        version: newVersion,
        config: configJson,
        checksum,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        version: newVersion,
        config: configJson,
        checksum,
        updatedAt: new Date()
      }
    })
  }

  /**
   * 获取配置
   */
  async get(realmId: string): Promise<RealmConfiguration | null> {
    const record = await this.prisma.configCache.findUnique({
      where: { realmId }
    })

    if (!record) {
      return null
    }

    try {
      return JSON.parse(record.config) as RealmConfiguration
    } catch (error) {
      console.error('Failed to parse config:', error)
      return null
    }
  }

  /**
   * 获取配置版本
   */
  async getVersion(realmId: string): Promise<number> {
    const record = await this.prisma.configCache.findUnique({
      where: { realmId },
      select: { version: true }
    })

    return record?.version ?? 0
  }

  /**
   * 获取配置校验和
   */
  async getChecksum(realmId: string): Promise<string | null> {
    const record = await this.prisma.configCache.findUnique({
      where: { realmId },
      select: { checksum: true }
    })

    return record?.checksum ?? null
  }

  /**
   * 验证配置完整性
   */
  async verifyChecksum(realmId: string, expectedChecksum: string): Promise<boolean> {
    const actualChecksum = await this.getChecksum(realmId)
    return actualChecksum === expectedChecksum
  }

  /**
   * 删除配置
   */
  async delete(realmId: string): Promise<void> {
    await this.prisma.configCache.delete({
      where: { realmId }
    }).catch(() => {
      // Ignore if not found
    })
  }

  /**
   * 清空所有配置
   */
  async clear(): Promise<void> {
    await this.prisma.configCache.deleteMany()
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect()
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }
}
