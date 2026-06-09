/**
 * RealmMemberChannelAutoJoinService
 *
 * 职责：监听 server_member.added 事件，自动将新 realm 成员加入所有公开频道
 *
 * 设计原则：
 * - 高内聚：只负责 realm 成员加入时的频道自动加入逻辑
 * - 低耦合：通过事件总线解耦，不直接依赖 RealmService
 * - 单一职责：只处理 realm 成员加入时的频道自动加入
 */

import { IEventBus, DomainEvent } from '../../interfaces/event-bus.interface';
import { IChannelRepository } from '../../interfaces/repositories/channel.repository.interface';
import { ILogger } from '../../interfaces/logger.interface';

export class RealmMemberChannelAutoJoinService {
  private unsubscribers: Array<() => void> = [];

  constructor(
    private readonly eventBus: IEventBus,
    private readonly channelRepository: IChannelRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 启动服务，订阅事件
   */
  start(): void {
    this.logger.debug('Starting RealmMemberChannelAutoJoinService...');

    // 订阅 server_member.added 事件
    const unsubscribe = this.eventBus.subscribe('server_member.added', async (event: DomainEvent) => {
      await this.handleRealmMemberAdded(event);
    });

    this.unsubscribers.push(unsubscribe);

    this.logger.debug('RealmMemberChannelAutoJoinService started');
  }

  /**
   * 停止服务，取消订阅
   */
  stop(): void {
    this.logger.info('Stopping RealmMemberChannelAutoJoinService...');
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.logger.info('RealmMemberChannelAutoJoinService stopped');
  }

  /**
   * 处理 server_member.added 事件
   */
  private async handleRealmMemberAdded(event: DomainEvent): Promise<void> {
    try {
      const { realmId, userId, role } = event.payload as {
        realmId: string;
        userId: string;
        role: string;
      };

      this.logger.info('Auto-joining realm member to public channels', {
        userId,
        realmId,
        role,
      });

      await this.addMemberToPublicChannels(userId, realmId);

      this.logger.info('Realm member auto-joined to public channels successfully', {
        userId,
        realmId,
      });
    } catch (error) {
      this.logger.error(
        'Failed to auto-join realm member to public channels',
        error instanceof Error ? error : new Error(String(error)),
        { event }
      );
      // 不抛出错误，避免影响 realm 成员添加流程
    }
  }

  /**
   * 添加成员到所有公开频道
   */
  private async addMemberToPublicChannels(userId: string, realmId: string): Promise<void> {
    // 查找 realm 的所有公开频道
    const allChannels = await this.channelRepository.findAll(realmId);
    const publicChannels = allChannels.filter(ch => ch.type === 'public');

    this.logger.info('Found public channels for realm', {
      realmId,
      totalChannels: allChannels.length,
      publicChannels: publicChannels.length,
    });

    if (publicChannels.length === 0) {
      this.logger.warn('No public channels found in realm', { realmId });
      return;
    }

    // 添加成员到每个公开频道
    let added = 0;
    let skipped = 0;
    let errors = 0;

    for (const channel of publicChannels) {
      try {
        // 检查是否已经是成员
        if (channel.hasMember(userId)) {
          this.logger.debug('Member already in channel', {
            userId,
            channelId: channel.channelId,
            channelName: channel.name,
          });
          skipped++;
          continue;
        }

        // 添加成员
        const updatedChannel = channel.addMember({
          memberId: userId,
          memberType: 'human',
          role: 'member',
          joinedAt: new Date(),
        });

        // 保存到数据库
        await this.channelRepository.update(updatedChannel, realmId);

        this.logger.info('Member added to public channel', {
          userId,
          channelId: channel.channelId,
          channelName: channel.name,
        });

        added++;
      } catch (error) {
        errors++;
        this.logger.error(
          'Failed to add member to channel',
          error instanceof Error ? error : new Error(String(error)),
          {
            userId,
            channelId: channel.channelId,
            channelName: channel.name,
          }
        );
        // 继续处理其他频道
      }
    }

    this.logger.info('Finished adding member to public channels', {
      userId,
      realmId,
      added,
      skipped,
      errors,
    });
  }
}
