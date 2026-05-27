/**
 * RealmMemberVerificationService - Realm 成员验证服务
 *
 * 职责：
 * - 验证用户是否是指定 realm 的成员
 * - 提供缓存机制以提高性能
 * - 用于 middleware 和 service 层的访问控制
 */

import { IRealmMemberRepository } from '../../interfaces/repositories/realm-member.repository.interface';
import { ILogger } from '../../interfaces/logger.interface';
import { getRealmContext } from '../../context/realm-context-store';

export interface IRealmMemberVerificationService {
  /**
   * 验证用户是否是 realm 的成员
   * @param userId - 用户 ID
   * @param realmId - Realm ID
   * @returns true 如果用户是成员，false 否则
   */
  isMember(userId: string, realmId: string): Promise<boolean>;

  /**
   * 验证用户是否是 realm 的成员，如果不是则抛出错误
   * @param userId - 用户 ID
   * @param realmId - Realm ID
   * @throws RealmMembershipError 如果用户不是成员
   */
  verifyMembership(userId: string, realmId: string): Promise<void>;

  /**
   * 清除指定用户的缓存
   * @param userId - 用户 ID
   */
  clearCache(userId: string): void;

  /**
   * 清除所有缓存
   */
  clearAllCache(): void;
}

export class RealmMembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RealmMembershipError';
  }
}

export class RealmMemberVerificationService implements IRealmMemberVerificationService {
  private cache: Map<string, { isMember: boolean; timestamp: number }>;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache

  constructor(
    private readonly realmMemberRepository: IRealmMemberRepository,
    private readonly logger: ILogger
  ) {
    this.cache = new Map();
  }

  async isMember(userId: string, realmId: string): Promise<boolean> {
    const cacheKey = `${userId}:${realmId}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      this.logger.debug('Realm membership check (cached)', { userId, realmId, isMember: cached.isMember });
      return cached.isMember;
    }

    // Query database
    try {
      const isMember = await this.realmMemberRepository.existsByServerAndUser(realmId, userId);

      // Update cache
      this.cache.set(cacheKey, {
        isMember,
        timestamp: Date.now(),
      });

      this.logger.debug('Realm membership check (db)', { userId, realmId, isMember });
      return isMember;
    } catch (error) {
      this.logger.error('Failed to check realm membership', error instanceof Error ? error : new Error(String(error)), {
        userId,
        realmId,
      });
      // Fail closed: if we can't verify, deny access
      return false;
    }
  }

  async verifyMembership(userId: string, realmId: string): Promise<void> {
    const isMember = await this.isMember(userId, realmId);

    if (!isMember) {
      this.logger.warn('Realm membership verification failed', {
        userId,
        realmId,
      });
      throw new RealmMembershipError(
        `User ${userId} is not a member of realm ${realmId}`
      );
    }
  }

  clearCache(userId: string): void {
    // Remove all cache entries for this user
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));

    this.logger.debug('Cleared realm membership cache for user', { userId, count: keysToDelete.length });
  }

  clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug('Cleared all realm membership cache', { count: size });
  }
}
