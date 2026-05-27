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
   * @returns Channel 实体，不存在返回 null
   */
  findById(channelId: string, realmId: string): Promise<ChannelEntity | null>;

  /**
   * 根据项目查找 Channels
   * @param projectId - Project ID
   * @returns Channel 实体数组
   */
  findByProject(projectId: string): Promise<ChannelEntity[]>;

  /**
   * 根据类型查找 Channels
   * @param type - Channel 类型
   * @returns Channel 实体数组
   */
  findByType(type: ChannelType): Promise<ChannelEntity[]>;

  /**
   * 根据成员查找 Channels
   * @param memberId - 成员 ID
   * @returns Channel 实体数组
   */
  findByMember(memberId: string): Promise<ChannelEntity[]>;

  /**
   * 查找与指定 agent 的 DM channel（用于唯一性检查）
   * @param agentId - Agent ID
   * @returns DM Channel 实体，不存在返回 null
   */
  findAgentDMChannel(agentId: string): Promise<ChannelEntity | null>;

  /**
   * 查找所有 Channels
   * @returns Channel 实体数组
   */
  findAll(): Promise<ChannelEntity[]>;

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
   */
  delete(channelId: string, realmId: string): Promise<void>;

  /**
   * 检查 Channel 是否存在
   * @param channelId - Channel ID
   * @returns 是否存在
   */
  exists(channelId: string, realmId: string): Promise<boolean>;
}
