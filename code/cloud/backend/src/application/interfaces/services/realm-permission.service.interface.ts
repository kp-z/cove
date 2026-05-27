/**
 * IRealmPermissionService - Realm 权限检查服务接口
 *
 * 职责：
 * - 检查用户在 Realm 中的权限
 * - 提供统一的权限验证接口
 * - 支持权限缓存管理
 */

import { RealmPermission } from '../../../domain/models/realm-member/realm-member.entity';

export interface IRealmPermissionService {
  /**
   * 要求用户拥有指定权限，否则抛出异常
   * @param userId - 用户 ID
   * @param realmId - Realm ID
   * @param permission - 所需权限
   * @throws InsufficientPermissionError - 权限不足
   * @throws UnauthorizedRealmAccessError - 非成员
   */
  requirePermission(
    userId: string,
    realmId: string,
    permission: RealmPermission
  ): Promise<void>;

  /**
   * 要求用户拥有任一权限（OR 逻辑）
   * @param userId - 用户 ID
   * @param realmId - Realm ID
   * @param permissions - 权限列表，满足任一即可
   * @throws InsufficientPermissionError - 权限不足
   */
  requireAnyPermission(
    userId: string,
    realmId: string,
    permissions: RealmPermission[]
  ): Promise<void>;

  /**
   * 要求用户拥有所有权限（AND 逻辑）
   * @param userId - 用户 ID
   * @param realmId - Realm ID
   * @param permissions - 权限列表，必须全部满足
   * @throws InsufficientPermissionError - 权限不足
   */
  requireAllPermissions(
    userId: string,
    realmId: string,
    permissions: RealmPermission[]
  ): Promise<void>;

  /**
   * 检查用户是否拥有指定权限（不抛出异常）
   * @param userId - 用户 ID
   * @param realmId - Realm ID
   * @param permission - 所需权限
   * @returns 是否拥有权限
   */
  hasPermission(
    userId: string,
    realmId: string,
    permission: RealmPermission
  ): Promise<boolean>;

  /**
   * 清除权限缓存
   * @param userId - 可选，指定用户 ID 则只清除该用户的缓存
   */
  clearCache(userId?: string): void;
}
