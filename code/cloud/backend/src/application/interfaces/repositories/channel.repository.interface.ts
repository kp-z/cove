/**
 * IChannelRepository - Channel Repository 接口
 *
 * Application Layer 通过此接口访问 Channel 数据。
 */

import { ChannelEntity, ChannelType } from '../../../domain/models/channel/channel.entity';

export interface IChannelRepository {
  /**
   * 根据 ID 查找 Channel
   * @param channelId - Channel ID
   * @param realmId - Realm ID
   * @returns Channel 实体，不存在返回 null
   */
  findById(channelId: string, realmId: string): Promise<ChannelEntity | null>;

  /**
   * 根据项目查找 Channels
   * @param projectId - Project ID
   * @param realmId - Realm ID
   * @returns Channel 实体数组
   */
  findByProject(projectId: string, realmId: string): Promise<ChannelEntity[]>;

  /**
   * 根据类型查找 Channels
   * @param type - Channel 类型
   * @param realmId - Realm ID
   * @returns Channel 实体数组
   */
  findByType(type: ChannelType, realmId: string): Promise<ChannelEntity[]>;

  /**
   * 根据成员查找 Channels
   * @param memberId - 成员 ID
   * @param realmId - Realm ID
   * @returns Channel 实体数组
   */
  findByMember(memberId: string, realmId: string): Promise<ChannelEntity[]>;

  /**
   * 查找与指定 agent 的 DM channel（用于唯一性检查）
   * @param agentId - Agent ID
   * @param realmId - Realm ID
   * @param userId - User ID (optional)
   * @returns DM Channel 实体，不存在返回 null
   */
  findAgentDMChannel(agentId: string, realmId: string, userId?: string): Promise<ChannelEntity | null>;

  /**
   * 根据 realmId 和 name 查找 Channel（使用唯一约束）
   * @param realmId - Realm ID
   * @param name - Channel 名称
   * @returns Channel 实体，不存在返回 null
   */
  findByRealmAndName(realmId: string, name: string): Promise<ChannelEntity | null>;

  /**
   * 查找所有 Channels
   * @param realmId - Realm ID
   * @returns Channel 实体数组
   */
  findAll(realmId: string): Promise<ChannelEntity[]>;

  /**
   * 保存新 Channel
   * @param channel - Channel 实体
   * @param realmId - Server ID（用于多 Server 数据隔离）
   */
  save(channel: ChannelEntity, realmId: string): Promise<void>;

  /**
   * 更新 Channel
   * @param channel - Channel 实体
   * @param realmId - Server ID（用于多 Server 数据隔离）
   */
  update(channel: ChannelEntity, realmId: string): Promise<void>;

  /**
   * 删除 Channel
   * @param channelId - Channel ID
   * @param realmId - Realm ID
   */
  delete(channelId: string, realmId: string): Promise<void>;

  /**
   * 检查 Channel 是否存在
   * @param channelId - Channel ID
   * @param realmId - Realm ID
   * @returns 是否存在
   */
  exists(channelId: string, realmId: string): Promise<boolean>;
}
