/**
 * IRealmRepository - Server Repository 接口
 *
 * 职责：
 * - 提供 Realm 实体的持久化操作
 * - 支持多 Server 数据隔离
 * - 提供查询方法（按 ID、owner、status 等）
 */

import { RealmEntity, RealmStatus } from '../../../domain/models/realm/realm.entity';

export interface ServerQueryFilters {
  id?: string;
  ownerId?: string;
  status?: RealmStatus;
}

export interface IRealmRepository {
  /**
   * 统一查询接口 - 根据过滤条件查找 Server
   * @param filters - 查询过滤条件（可选）
   * @returns Realm 实体数组
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
  find(filters?: ServerQueryFilters): Promise<RealmEntity[]>;

  /**
   * 根据 name 查找 Server（用于唯一性检查）
   * @param name - Server name
   * @returns Realm 实体，如果不存在返回 null
   */
  findByName(name: string): Promise<RealmEntity | null>;

  /**
   * 保存新 Server
   * @param server - Realm 实体
   * @param realmId - Server ID（用于数据隔离）
   */
  save(server: RealmEntity, realmId: string): Promise<void>;

  /**
   * 更新 Server
   * @param server - Realm 实体
   * @param realmId - Server ID（用于数据隔离）
   */
  update(server: RealmEntity, realmId: string): Promise<void>;

  /**
   * 删除 Server
   * @param realmId - Server ID
   */
  delete(realmId: string): Promise<void>;

  /**
   * 检查 Server 是否存在
   * @param realmId - Server ID
   * @returns 是否存在
   */
  exists(realmId: string): Promise<boolean>;
}
