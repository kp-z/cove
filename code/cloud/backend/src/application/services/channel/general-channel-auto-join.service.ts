/**
 * GeneralChannelAutoJoinService
 *
 * 职责：监听 user.created 和 agent.created 事件，自动将新成员加入 general 频道
 *
 * 设计原则：
 * - 高内聚：只负责自动加入 general 频道的逻辑
 * - 低耦合：通过事件总线解耦，不直接依赖 UserService 或 AgentService
 * - 单一职责：只处理 general 频道的自动加入
 */

import { IEventBus, DomainEvent } from '../../interfaces/event-bus.interface';
import { IChannelRepository } from '../../interfaces/repositories/channel.repository.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';

// 配置常量
const DEFAULT_CHANNEL_NAME = 'general';
const DEFAULT_REALM_ID = 'realm-nexus';
const CACHE_TTL_MS = 60000; // 1分钟缓存

export class GeneralChannelAutoJoinService {
  private unsubscribers: Array<() => void> = [];
  private generalChannelCache: Map<string, { channel: ChannelEntity; timestamp: number }> = new Map();

  constructor(
    private readonly eventBus: IEventBus,
    private readonly channelRepository: IChannelRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 启动服务，订阅事件
   */
  start(): void {
    this.logger.info('Starting GeneralChannelAutoJoinService...');

    // 订阅 user.created 事件
    const unsubUser = this.eventBus.subscribe('user.created', async (event: DomainEvent) => {
      await this.handleUserCreated(event);
    });

    // 订阅 agent.created 事件
    const unsubAgent = this.eventBus.subscribe('agent.created', async (event: DomainEvent) => {
      await this.handleAgentCreated(event);
    });

    this.unsubscribers.push(unsubUser, unsubAgent);

    this.logger.info('GeneralChannelAutoJoinService started successfully');
  }

  /**
   * 停止服务，取消订阅
   */
  stop(): void {
    this.logger.info('Stopping GeneralChannelAutoJoinService...');
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.logger.info('GeneralChannelAutoJoinService stopped');
  }

  /**
   * 处理 user.created 事件
   */
  private async handleUserCreated(event: DomainEvent): Promise<void> {
    try {
      const userId = event.aggregateId;
      const realmId = this.getRealmIdFromEvent(event);

      this.logger.info('Auto-joining user to general channel', { userId, realmId });

      await this.addMemberToGeneralChannel(userId, 'human', realmId);

      this.logger.info('User auto-joined to general channel successfully', { userId });
    } catch (error) {
      this.logger.error(
        'Failed to auto-join user to general channel',
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

      this.logger.info('Auto-joining agent to general channel', { agentId, realmId });

      await this.addMemberToGeneralChannel(agentId, 'agent', realmId);

      this.logger.info('Agent auto-joined to general channel successfully', { agentId });
    } catch (error) {
      this.logger.error(
        'Failed to auto-join agent to general channel',
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
   * 获取 general 频道（带缓存）
   */
  private async getGeneralChannel(realmId: string): Promise<ChannelEntity | null> {
    const cacheKey = `${realmId}:${DEFAULT_CHANNEL_NAME}`;
    const cached = this.generalChannelCache.get(cacheKey);

    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      this.logger.debug('Using cached general channel', { realmId });
      return cached.channel;
    }

    // 缓存失效或不存在，重新查询
    this.logger.debug('Cache miss, querying general channel', { realmId });
    const channels = await this.channelRepository.findAll(realmId);
    const generalChannel = channels.find(ch => ch.name === DEFAULT_CHANNEL_NAME);

    if (generalChannel) {
      // 更新缓存
      this.generalChannelCache.set(cacheKey, {
        channel: generalChannel,
        timestamp: Date.now(),
      });
    }

    return generalChannel || null;
  }

  /**
   * 清除缓存（在频道更新后调用）
   */
  private invalidateCache(realmId: string): void {
    const cacheKey = `${realmId}:${DEFAULT_CHANNEL_NAME}`;
    this.generalChannelCache.delete(cacheKey);
    this.logger.debug('Cache invalidated', { realmId });
  }

  /**
   * 添加成员到 general 频道
   */
  private async addMemberToGeneralChannel(
    memberId: string,
    memberType: 'human' | 'agent',
    realmId: string
  ): Promise<void> {
    // 查找 general 频道（使用缓存）
    const generalChannel = await this.getGeneralChannel(realmId);

    if (!generalChannel) {
      this.logger.warn('General channel not found, skipping auto-join', { realmId });
      return;
    }

    // 检查是否已经是成员
    if (generalChannel.hasMember(memberId)) {
      this.logger.debug('Member already in general channel', { memberId });
      return;
    }

    // 添加成员
    const updatedChannel = generalChannel.addMember({
      memberId,
      memberType,
      role: 'member',
      joinedAt: new Date(),
    });

    // 保存到数据库
    await this.channelRepository.update(updatedChannel, realmId);

    // 清除缓存，确保下次获取最新数据
    this.invalidateCache(realmId);

    this.logger.info('Member added to general channel', {
      memberId,
      memberType,
      channelId: generalChannel.channelId,
    });
  }

  /**
   * 批量添加现有成员到 general 频道
   * 用于初始化或修复数据
   */
  async addExistingMembersToGeneral(
    realmId: string,
    userIds: string[],
    agentIds: string[]
  ): Promise<{ added: number; skipped: number; errors: number }> {
    this.logger.info('Adding existing members to general channel', {
      realmId,
      userCount: userIds.length,
      agentCount: agentIds.length,
    });

    let added = 0;
    let skipped = 0;
    let errors = 0;

    // 添加用户
    for (const userId of userIds) {
      try {
        await this.addMemberToGeneralChannel(userId, 'human', realmId);
        added++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('already')) {
          skipped++;
        } else {
          errors++;
          this.logger.error(
            'Failed to add user to general',
            error instanceof Error ? error : new Error(String(error)),
            { userId }
          );
        }
      }
    }

    // 添加 agent
    for (const agentId of agentIds) {
      try {
        await this.addMemberToGeneralChannel(agentId, 'agent', realmId);
        added++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('already')) {
          skipped++;
        } else {
          errors++;
          this.logger.error(
            'Failed to add agent to general',
            error instanceof Error ? error : new Error(String(error)),
            { agentId }
          );
        }
      }
    }

    this.logger.info('Finished adding existing members to general channel', {
      added,
      skipped,
      errors,
    });

    return { added, skipped, errors };
  }
}
