/**
 * DefaultChannelsAutoJoinService
 *
 * 职责：监听 user.created 和 agent.created 事件，自动将新成员加入默认频道
 *
 * 设计原则：
 * - 高内聚：只负责自动加入默认频道的逻辑
 * - 低耦合：通过事件总线解耦，不直接依赖 UserService 或 AgentService
 * - 单一职责：只处理默认频道的自动加入
 * - 可配置：支持配置多个默认频道
 */

import { IEventBus, DomainEvent } from '../../interfaces/event-bus.interface';
import { IChannelRepository } from '../../interfaces/repositories/channel.repository.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';

// 配置常量
const DEFAULT_CHANNELS = ['general', 'welcome']; // 默认频道列表
const DEFAULT_REALM_ID = 'realm-nexus';
const CACHE_TTL_MS = 60000; // 1分钟缓存

export class DefaultChannelsAutoJoinService {
  private unsubscribers: Array<() => void> = [];
  private channelCache: Map<string, { channel: ChannelEntity; timestamp: number }> = new Map();

  constructor(
    private readonly eventBus: IEventBus,
    private readonly channelRepository: IChannelRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 启动服务，订阅事件
   */
  start(): void {
    this.logger.debug('Starting DefaultChannelsAutoJoinService...');

    // 订阅 user.created 事件
    const unsubUser = this.eventBus.subscribe('user.created', async (event: DomainEvent) => {
      await this.handleUserCreated(event);
    });

    // 订阅 agent.created 事件
    const unsubAgent = this.eventBus.subscribe('agent.created', async (event: DomainEvent) => {
      await this.handleAgentCreated(event);
    });

    this.unsubscribers.push(unsubUser, unsubAgent);

    this.logger.debug('DefaultChannelsAutoJoinService started');
  }

  /**
   * 停止服务，取消订阅
   */
  stop(): void {
    this.logger.info('Stopping DefaultChannelsAutoJoinService...');
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.logger.info('DefaultChannelsAutoJoinService stopped');
  }

  /**
   * 处理 user.created 事件
   */
  private async handleUserCreated(event: DomainEvent): Promise<void> {
    try {
      const userId = event.aggregateId;
      const realmId = this.getRealmIdFromEvent(event);

      this.logger.info('Auto-joining user to default channels', { userId, realmId });

      await this.addMemberToDefaultChannels(userId, 'human', realmId);

      this.logger.info('User auto-joined to default channels successfully', { userId });
    } catch (error) {
      this.logger.error(
        'Failed to auto-join user to default channels',
        error instanceof Error ? error : new Error(String(error)),
        { userId: event.aggregateId }
      );
      // 不抛出错误，避免影响用户创建流程
    }
  }

  /**
   * 处理 agent.created 事件
   */
  private async handleAgentCreated(event: DomainEvent): Promise<void> {
    try {
      const agentId = event.aggregateId;
      const realmId = this.getRealmIdFromEvent(event);

      this.logger.info('Auto-joining agent to default channels', { agentId, realmId });

      await this.addMemberToDefaultChannels(agentId, 'agent', realmId);

      this.logger.info('Agent auto-joined to default channels successfully', { agentId });
    } catch (error) {
      this.logger.error(
        'Failed to auto-join agent to default channels',
        error instanceof Error ? error : new Error(String(error)),
        { agentId: event.aggregateId }
      );
      // 不抛出错误，避免影响 agent 创建流程
    }
  }

  /**
   * 从事件中提取 realmId，提供默认值
   */
  private getRealmIdFromEvent(event: DomainEvent): string {
    const realmId = event.metadata?.realmId as string | undefined;

    if (!realmId) {
      this.logger.warn('RealmId not found in event metadata, using default', {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        defaultRealmId: DEFAULT_REALM_ID,
      });
      return DEFAULT_REALM_ID;
    }

    return realmId;
  }

  /**
   * 获取指定频道（带缓存）
   */
  private async getChannelByName(channelName: string, realmId: string): Promise<ChannelEntity | null> {
    const cacheKey = `${realmId}:${channelName}`;
    const cached = this.channelCache.get(cacheKey);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      this.logger.debug('Using cached channel', { realmId, channelName });
      return cached.channel;
    }

    // 缓存失效或不存在，重新查询
    this.logger.debug('Cache miss, querying channel', { realmId, channelName });
    const channels = await this.channelRepository.findAll(realmId);
    const channel = channels.find(ch => ch.name === channelName);

    if (channel) {
      // 更新缓存
      this.channelCache.set(cacheKey, {
        channel,
        timestamp: Date.now(),
      });
    }

    return channel || null;
  }

  /**
   * 清除缓存（在频道更新后调用）
   */
  private invalidateCache(realmId: string, channelName: string): void {
    const cacheKey = `${realmId}:${channelName}`;
    this.channelCache.delete(cacheKey);
    this.logger.debug('Cache invalidated', { realmId, channelName });
  }

  /**
   * 添加成员到所有默认频道
   */
  private async addMemberToDefaultChannels(
    memberId: string,
    memberType: 'human' | 'agent',
    realmId: string
  ): Promise<void> {
    for (const channelName of DEFAULT_CHANNELS) {
      try {
        await this.addMemberToChannel(memberId, memberType, channelName, realmId);
      } catch (error) {
        this.logger.error(
          `Failed to add member to ${channelName} channel`,
          error instanceof Error ? error : new Error(String(error)),
          { memberId, channelName }
        );
        // 继续处理其他频道
      }
    }
  }

  /**
   * 添加成员到指定频道
   */
  private async addMemberToChannel(
    memberId: string,
    memberType: 'human' | 'agent',
    channelName: string,
    realmId: string
  ): Promise<void> {
    // 查找频道（使用缓存）
    const channel = await this.getChannelByName(channelName, realmId);

    if (!channel) {
      this.logger.warn(`Channel ${channelName} not found, skipping auto-join`, { realmId });
      return;
    }

    // 检查是否已经是成员
    if (channel.hasMember(memberId)) {
      this.logger.debug(`Member already in ${channelName} channel`, { memberId });
      return;
    }

    // 添加成员
    const updatedChannel = channel.addMember({
      memberId,
      memberType,
      role: 'member',
      joinedAt: new Date(),
    });

    // 保存到数据库
    await this.channelRepository.update(updatedChannel, realmId);

    // 清除缓存，确保下次获取最新数据
    this.invalidateCache(realmId, channelName);

    this.logger.info(`Member added to ${channelName} channel`, {
      memberId,
      memberType,
      channelId: channel.channelId,
    });
  }

  /**
   * 批量添加现有成员到默认频道
   * 用于初始化或修复数据
   */
  async addExistingMembersToDefaultChannels(
    realmId: string,
    userIds: string[],
    agentIds: string[]
  ): Promise<{ added: number; skipped: number; errors: number }> {
    this.logger.info('Adding existing members to default channels', {
      realmId,
      userCount: userIds.length,
      agentCount: agentIds.length,
      channels: DEFAULT_CHANNELS,
    });

    let added = 0;
    let skipped = 0;
    let errors = 0;

    // 添加用户
    for (const userId of userIds) {
      for (const channelName of DEFAULT_CHANNELS) {
        try {
          await this.addMemberToChannel(userId, 'human', channelName, realmId);
          added++;
        } catch (error) {
          if (error instanceof Error && error.message.includes('already')) {
            skipped++;
          } else {
            errors++;
            this.logger.error(
              `Failed to add user to ${channelName}`,
              error instanceof Error ? error : new Error(String(error)),
              { userId, channelName }
            );
          }
        }
      }
    }

    // 添加 agent
    for (const agentId of agentIds) {
      for (const channelName of DEFAULT_CHANNELS) {
        try {
          await this.addMemberToChannel(agentId, 'agent', channelName, realmId);
          added++;
        } catch (error) {
          if (error instanceof Error && error.message.includes('already')) {
            skipped++;
          } else {
            errors++;
            this.logger.error(
              `Failed to add agent to ${channelName}`,
              error instanceof Error ? error : new Error(String(error)),
              { agentId, channelName }
            );
          }
        }
      }
    }

    this.logger.info('Finished adding existing members to default channels', {
      added,
      skipped,
      errors,
    });

    return { added, skipped, errors };
  }
}
