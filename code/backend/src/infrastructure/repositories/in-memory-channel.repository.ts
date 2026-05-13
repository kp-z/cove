/**
 * InMemoryChannelRepository - Channel Repository 的内存实现
 *
 * MVP 阶段使用 Map 存储数据，后续可替换为 Prisma/TypeORM 实现。
 * 实现 IChannelRepository 接口，遵循依赖倒置原则。
 */

import { IChannelRepository } from '../../application/interfaces/repositories/channel.repository.interface';
import { ChannelEntity, ChannelType } from '../../domain/models/channel/channel.entity';

export class InMemoryChannelRepository implements IChannelRepository {
  private channels: Map<string, ChannelEntity> = new Map();

  /**
   * 根据 ID 查找 Channel
   */
  async findById(channelId: string): Promise<ChannelEntity | null> {
    const channel = this.channels.get(channelId);
    return channel || null;
  }

  /**
   * 根据项目查找 Channels
   */
  async findByProject(projectId: string): Promise<ChannelEntity[]> {
    return Array.from(this.channels.values())
      .filter(channel => channel.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 根据类型查找 Channels
   */
  async findByType(type: ChannelType): Promise<ChannelEntity[]> {
    return Array.from(this.channels.values())
      .filter(channel => channel.type === type)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 根据成员查找 Channels
   */
  async findByMember(memberId: string): Promise<ChannelEntity[]> {
    return Array.from(this.channels.values())
      .filter(channel => channel.hasMember(memberId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 查找所有 Channels
   */
  async findAll(): Promise<ChannelEntity[]> {
    return Array.from(this.channels.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * 保存新 Channel
   */
  async save(channel: ChannelEntity): Promise<void> {
    if (this.channels.has(channel.channelId)) {
      throw new Error(`Channel with ID ${channel.channelId} already exists`);
    }
    this.channels.set(channel.channelId, channel);
  }

  /**
   * 更新 Channel
   */
  async update(channel: ChannelEntity): Promise<void> {
    if (!this.channels.has(channel.channelId)) {
      throw new Error(`Channel with ID ${channel.channelId} not found`);
    }
    this.channels.set(channel.channelId, channel);
  }

  /**
   * 删除 Channel
   */
  async delete(channelId: string): Promise<void> {
    if (!this.channels.has(channelId)) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
    this.channels.delete(channelId);
  }

  /**
   * 检查 Channel 是否存在
   */
  async exists(channelId: string): Promise<boolean> {
    return this.channels.has(channelId);
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  clear(): void {
    this.channels.clear();
  }

  /**
   * 获取总数（仅用于测试/调试）
   */
  count(): number {
    return this.channels.size;
  }
}
