/**
 * DefaultChannelsInitializer
 *
 * 为新创建的 realm 自动创建默认 channels
 * 提供幂等的初始化逻辑，可安全地重复执行
 */

import { PrismaClient } from '@prisma/client';
import { ILogger } from '../../application/interfaces/logger.interface';

export interface DefaultChannelsInitializerOptions {
  prisma: PrismaClient;
  logger: ILogger;
}

export class DefaultChannelsInitializer {
  private readonly prisma: PrismaClient;
  private readonly logger: ILogger;

  constructor(options: DefaultChannelsInitializerOptions) {
    this.prisma = options.prisma;
    this.logger = options.logger;
  }

  /**
   * 为指定 realm 创建默认 channels
   * 幂等：如果 channel 已存在则跳过
   */
  async initializeForRealm(realmId: string, createdBy: string): Promise<void> {
    this.logger.info(`Initializing default channels for realm ${realmId}`);

    try {
      // 1. 创建 #general channel
      await this.ensureChannel({
        realmId,
        name: 'general',
        displayName: 'General',
        description: 'General discussion channel',
        visibility: 'public',
        createdBy,
      });

      // 2. 创建 #welcome channel
      await this.ensureChannel({
        realmId,
        name: 'welcome',
        displayName: 'Welcome',
        description: 'Welcome new members',
        visibility: 'public',
        createdBy,
      });

      this.logger.info(`Default channels initialized for realm ${realmId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize default channels for realm ${realmId}`, error as Error);
      throw error;
    }
  }

  /**
   * 确保 channel 存在，如果不存在则创建
   */
  private async ensureChannel(config: {
    realmId: string;
    name: string;
    displayName: string;
    description: string;
    visibility: string;
    createdBy: string;
  }): Promise<void> {
    // 检查 channel 是否已存在
    const existing = await this.prisma.channel.findFirst({
      where: {
        realmId: config.realmId,
        name: config.name,
      },
    });

    if (existing) {
      this.logger.debug(`Channel ${config.name} already exists, skipping`, {
        channelId: existing.id,
        realmId: config.realmId,
      });
      return;
    }

    // 创建 channel
    const channelId = `channel-${config.realmId.replace('realm-', '')}-${config.name}`;

    await this.prisma.channel.create({
      data: {
        id: channelId,
        realmId: config.realmId,
        name: config.name,
        displayName: config.displayName,
        description: config.description,
        type: config.visibility, // 'public' or 'private'
        status: 'active',
        createdById: config.createdBy,
        createdByType: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.info(`Created channel ${config.name} for realm ${config.realmId}`, {
      channelId,
    });
  }
}
