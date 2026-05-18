/**
 * IServerRepository - Server Repository 接口
 *
 * 职责：
 * - 提供 Server 实体的持久化操作
 * - 支持多 Server 数据隔离
 * - 提供查询方法（按 ID、owner、status 等）
 */

import { ServerEntity, ServerStatus } from '../../../domain/models/server/server.entity';

export interface IServerRepository {
  /**
   * 根据 ID 查找 Server
   * @param serverId - Server ID
   * @returns Server 实体，如果不存在返回 null
   */
  findById(serverId: string): Promise<ServerEntity | null>;

  /**
   * 根据 owner 查找所有 Server
   * @param ownerId - Owner ID
   * @returns Server 实体数组
   */
  findByOwner(ownerId: string): Promise<ServerEntity[]>;

  /**
   * 根据状态查找 Server
   * @param status - Server 状态
   * @returns Server 实体数组
   */
  findByStatus(status: ServerStatus): Promise<ServerEntity[]>;

  /**
   * 查找所有 Server
   * @returns Server 实体数组
   */
  findAll(): Promise<ServerEntity[]>;

  /**
   * 保存新 Server
   * @param server - Server 实体
   * @param serverId - Server ID（用于数据隔离）
   */
  save(server: ServerEntity, serverId: string): Promise<void>;

  /**
   * 更新 Server
   * @param server - Server 实体
   * @param serverId - Server ID（用于数据隔离）
   */
  update(server: ServerEntity, serverId: string): Promise<void>;

  /**
   * 删除 Server
   * @param serverId - Server ID
   */
  delete(serverId: string): Promise<void>;

  /**
   * 检查 Server 是否存在
   * @param serverId - Server ID
   * @returns 是否存在
   */
  exists(serverId: string): Promise<boolean>;
}
