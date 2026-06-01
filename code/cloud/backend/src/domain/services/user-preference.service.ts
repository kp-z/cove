/**
 * User Preference Service
 *
 * 用户偏好服务：管理用户的个性化设置
 *
 * 职责：
 * - 管理用户的 Realm 偏好（上次访问、固定、排序）
 * - 管理用户的 Channel 偏好
 * - 提供偏好的读取和更新接口
 *
 * 设计原则：
 * - 单一职责：只管理用户偏好
 * - 低耦合：不依赖 Realm 或 Device 服务
 * - 易测试：可以独立测试
 */

import type { IUserRepository } from '../../application/interfaces/repositories/user.repository.interface';
import type { ILogger } from '../../application/interfaces/logger.interface';

/**
 * 用户偏好接口
 */
export interface UserPreference {
  readonly pinned_channels?: readonly string[];
  readonly last_accessed_realm_id?: string;
  readonly pinned_realm_ids?: readonly string[];
  readonly realm_order?: readonly string[];
}

/**
 * 用户偏好服务
 */
export class UserPreferenceService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: ILogger
  ) {}

  /**
   * 获取用户偏好
   */
  async getPreferences(userId: string): Promise<UserPreference> {
    try {
      const user = await this.userRepository.findById(userId, 'default');

      if (!user) {
        this.logger.warn('User not found when getting preferences', { userId });
        return {};
      }

      return user.preference || {};
    } catch (error) {
      this.logger.error('Failed to get user preferences', error as Error, { userId });
      throw error;
    }
  }

  /**
   * 更新最后访问的 Realm
   */
  async updateLastAccessedRealm(userId: string, realmId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId, 'default');
      if (!user) {
        throw new Error('User not found');
      }

      const prefs = user.preference || {};
      const updatedUser = user.updatePreference({
        ...prefs,
        last_accessed_realm_id: realmId,
      });

      await this.userRepository.update(updatedUser, 'default');

      this.logger.info('Updated last accessed realm', { userId, realmId });
    } catch (error) {
      this.logger.error('Failed to update last accessed realm', error as Error, { userId, realmId });
      throw error;
    }
  }

  /**
   * 更新 Realm 排序
   */
  async updateRealmOrder(userId: string, realmIds: string[]): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId, 'default');
      if (!user) {
        throw new Error('User not found');
      }

      const prefs = user.preference || {};
      const updatedUser = user.updatePreference({
        ...prefs,
        realm_order: realmIds,
      });

      await this.userRepository.update(updatedUser, 'default');

      this.logger.info('Updated realm order', { userId, count: realmIds.length });
    } catch (error) {
      this.logger.error('Failed to update realm order', error as Error, { userId });
      throw error;
    }
  }

  /**
   * 更新固定的 Realm 列表
   */
  async updatePinnedRealms(userId: string, realmIds: string[]): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId, 'default');
      if (!user) {
        throw new Error('User not found');
      }

      const prefs = user.preference || {};
      const updatedUser = user.updatePreference({
        ...prefs,
        pinned_realm_ids: realmIds,
      });

      await this.userRepository.update(updatedUser, 'default');

      this.logger.info('Updated pinned realms', { userId, count: realmIds.length });
    } catch (error) {
      this.logger.error('Failed to update pinned realms', error as Error, { userId });
      throw error;
    }
  }

  /**
   * 更新固定的 Channel 列表
   */
  async updatePinnedChannels(userId: string, channelIds: string[]): Promise<void> {
    try {
      // 验证数量限制
      if (channelIds.length > 10) {
        throw new Error('Cannot pin more than 10 channels');
      }

      const user = await this.userRepository.findById(userId, 'default');
      if (!user) {
        throw new Error('User not found');
      }

      const prefs = user.preference || {};
      const updatedUser = user.updatePreference({
        ...prefs,
        pinned_channels: channelIds,
      });

      await this.userRepository.update(updatedUser, 'default');

      this.logger.info('Updated pinned channels', { userId, count: channelIds.length });
    } catch (error) {
      this.logger.error('Failed to update pinned channels', error as Error, { userId });
      throw error;
    }
  }

  /**
   * 批量更新用户偏好
   */
  async updatePreferences(userId: string, updates: Partial<UserPreference>): Promise<void> {
    try {
      // 验证 pinned_channels 数量限制
      if (updates.pinned_channels && updates.pinned_channels.length > 10) {
        throw new Error('Cannot pin more than 10 channels');
      }

      const user = await this.userRepository.findById(userId, 'default');
      if (!user) {
        throw new Error('User not found');
      }

      const prefs = user.preference || {};
      const updatedUser = user.updatePreference({
        ...prefs,
        ...updates,
      });

      await this.userRepository.update(updatedUser, 'default');

      this.logger.info('Updated user preferences', { userId, updates: Object.keys(updates) });
    } catch (error) {
      this.logger.error('Failed to update user preferences', error as Error, { userId });
      throw error;
    }
  }
}
