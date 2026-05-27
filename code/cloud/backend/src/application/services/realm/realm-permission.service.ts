/**
 * RealmPermissionService - Realm 权限检查服务实现
 *
 * 职责：
 * - 检查用户在 Realm 中的权限
 * - 利用 RealmMemberEntity.hasPermission() 进行权限验证
 * - 提供缓存机制优化性能
 *
 * 设计原则：
 * - 单一职责：只负责权限检查
 * - 依赖倒置：依赖 Repository 接口
 * - 开闭原则：通过 RealmPermission 枚举扩展
 */

import { IRealmPermissionService } from '../../interfaces/services/realm-permission.service.interface';
import { IRealmMemberRepository } from '../../interfaces/repositories/realm-member.repository.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { RealmPermission, RealmMemberEntity } from '../../../domain/models/realm-member/realm-member.entity';
import { UnauthorizedRealmAccessError, InsufficientPermissionError } from './realm.errors';

export class RealmPermissionService implements IRealmPermissionService {
  private cache: Map<string, { member: RealmMemberEntity; timestamp: number }>;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  constructor(
    private readonly memberRepository: IRealmMemberRepository,
    private readonly logger: ILogger
  ) {
    this.cache = new Map();
  }

  async requirePermission(
    userId: string,
    realmId: string,
    permission: RealmPermission
  ): Promise<void> {
    const member = await this.getMember(userId, realmId);

    if (!member.isActive()) {
      this.logger.warn('User is not active in realm', { userId, realmId });
      throw new UnauthorizedRealmAccessError(realmId, userId);
    }

    if (!member.hasPermission(permission)) {
      this.logger.warn('Permission denied', {
        userId,
        realmId,
        permission,
        userRole: member.role,
      });
      throw new InsufficientPermissionError(userId, realmId, permission);
    }

    this.logger.debug('Permission granted', {
      userId,
      realmId,
      permission,
      userRole: member.role,
    });
  }

  async requireAnyPermission(
    userId: string,
    realmId: string,
    permissions: RealmPermission[]
  ): Promise<void> {
    const member = await this.getMember(userId, realmId);

    if (!member.isActive()) {
      throw new UnauthorizedRealmAccessError(realmId, userId);
    }

    if (!member.hasAnyPermission(permissions)) {
      this.logger.warn('User lacks any of the required permissions', {
        userId,
        realmId,
        permissions,
        userRole: member.role,
      });
      throw new InsufficientPermissionError(
        userId,
        realmId,
        permissions[0]! // 显示第一个权限作为示例
      );
    }
  }

  async requireAllPermissions(
    userId: string,
    realmId: string,
    permissions: RealmPermission[]
  ): Promise<void> {
    const member = await this.getMember(userId, realmId);

    if (!member.isActive()) {
      throw new UnauthorizedRealmAccessError(realmId, userId);
    }

    if (!member.hasAllPermissions(permissions)) {
      // 找出缺失的权限
      const missing = permissions.find(p => !member.hasPermission(p));
      this.logger.warn('User lacks some required permissions', {
        userId,
        realmId,
        permissions,
        missing,
        userRole: member.role,
      });
      throw new InsufficientPermissionError(userId, realmId, missing!);
    }
  }

  async hasPermission(
    userId: string,
    realmId: string,
    permission: RealmPermission
  ): Promise<boolean> {
    try {
      await this.requirePermission(userId, realmId, permission);
      return true;
    } catch (error) {
      if (
        error instanceof InsufficientPermissionError ||
        error instanceof UnauthorizedRealmAccessError
      ) {
        return false;
      }
      throw error;
    }
  }

  clearCache(userId?: string): void {
    if (userId) {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      this.logger.debug('Cleared permission cache for user', { userId, count: keysToDelete.length });
    } else {
      const count = this.cache.size;
      this.cache.clear();
      this.logger.debug('Cleared all permission cache', { count });
    }
  }

  /**
   * 获取用户在 Realm 中的成员实体（带缓存）
   * @private
   */
  private async getMember(userId: string, realmId: string): Promise<RealmMemberEntity> {
    const cacheKey = `${userId}:${realmId}`;
    const cached = this.cache.get(cacheKey);

    // 检查缓存
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug('Permission cache hit', { userId, realmId });
      return cached.member;
    }

    // 查询数据库
    this.logger.debug('Permission cache miss, querying database', { userId, realmId });
    const member = await this.memberRepository.findByServerAndUser(realmId, userId);

    if (!member) {
      throw new UnauthorizedRealmAccessError(realmId, userId);
    }

    // 更新缓存
    this.cache.set(cacheKey, { member, timestamp: Date.now() });
    return member;
  }
}
