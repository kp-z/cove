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
   * 要求用户拥有指定权限，否则抛出错误
   * @throws {UnauthorizedRealmAccessError} 用户不是 Realm 成员
   * @throws {InsufficientPermissionError} 用户缺少所需权限
   */
  requirePermission(
    userId: string,
    realmId: string,
    permission: RealmPermission
  ): Promise<void>;

  /**
   * 要求用户拥有任一权限，否则抛出错误
   * @throws {UnauthorizedRealmAccessError} 用户不是 Realm 成员
   * @throws {InsufficientPermissionError} 用户缺少所有权限
   */
  requireAnyPermission(
    userId: string,
    realmId: string,
    permissions: RealmPermission[]
  ): Promise<void>;

  /**
   * 要求用户拥有全部权限，否则抛出错误
   * @throws {UnauthorizedRealmAccessError} 用户不是 Realm 成员
   * @throws {InsufficientPermissionError} 用户缺少某些权限
   */
  requireAllPermissions(
    userId: string,
    realmId: string,
    permissions: RealmPermission[]
  ): Promise<void>;

  /**
   * 检查用户是否拥有指定权限
   * @returns true 如果用户拥有权限，false 否则
   */
  hasPermission(
    userId: string,
    realmId: string,
    permission: RealmPermission
  ): Promise<boolean>;

  /**
   * 清除权限缓存
   * @param userId 可选，指定用户 ID 则只清除该用户的缓存
   */
  clearCache(userId?: string): void;
}
