/**
 * IServerRepository - Server Repository 接口
 *
 * 职责：
 * - 提供 Server 实体的持久化操作
 * - 支持多 Server 数据隔离
 * - 提供查询方法（按 ID、owner、status 等）
 */

import { ServerEntity, ServerStatus } from '../../../domain/models/server/server.entity';

export interface ServerQueryFilters {
  id?: string;
  ownerId?: string;
  status?: ServerStatus;
}

export interface IServerRepository {
  /**
   * 统一查询接口 - 根据过滤条件查找 Server
   * @param filters - 查询过滤条件（可选）
   * @returns Server 实体数组
   *
   * @example
   * // 查找单个 Server
   * find({ id: 'server-123' })
   *
   * // 按 owner 查找
   * find({ ownerId: 'user-456' })
   *
   * // 按状态查找
   * find({ status: 'active' })
   *
   * // 查找所有
   * find()
   */
  find(filters?: ServerQueryFilters): Promise<ServerEntity[]>;

  /**
   * 根据 name 查找 Server（用于唯一性检查）
   * @param name - Server name
   * @returns Server 实体，如果不存在返回 null
   */
  findByName(name: string): Promise<ServerEntity | null>;

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
