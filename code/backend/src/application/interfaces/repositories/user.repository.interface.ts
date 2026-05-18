/**
 * IUserRepository - User Repository 接口
 *
 * Application Layer 通过此接口访问 User 数据。
 */

import { UserEntity, UserRole } from '../../../domain/models/user/user.entity';

export interface IUserRepository {
  /**
   * 根据 ID 查找 User
   * @param userId - User ID
   * @returns User 实体，不存在返回 null
   */
  findById(userId: string): Promise<UserEntity | null>;

  /**
   * 根据 username 查找 User
   * @param username - Username
   * @returns User 实体，不存在返回 null
   */
  findByUsername(username: string): Promise<UserEntity | null>;

  /**
   * 根据 email 查找 User
   * @param email - Email
   * @returns User 实体，不存在返回 null
   */
  findByEmail(email: string): Promise<UserEntity | null>;

  /**
   * 根据角色查找 Users
   * @param role - User 角色
   * @returns User 实体数组
   */
  findByRole(role: UserRole): Promise<UserEntity[]>;

  /**
   * 查找所有 Users
   * @returns User 实体数组
   */
  findAll(): Promise<UserEntity[]>;

  /**
   * 保存新 User
   * @param user - User 实体
   * @param serverId - Server ID
   */
  save(user: UserEntity, serverId: string): Promise<void>;

  /**
   * 更新 User
   * @param user - User 实体
   * @param serverId - Server ID
   */
  update(user: UserEntity, serverId: string): Promise<void>;

  /**
   * 删除 User
   * @param userId - User ID
   */
  delete(userId: string): Promise<void>;

  /**
   * 检查 User 是否存在
   * @param userId - User ID
   * @returns 是否存在
   */
  exists(userId: string): Promise<boolean>;

  /**
   * 检查 username 是否已被使用
   * @param username - Username
   * @returns 是否已存在
   */
  usernameExists(username: string): Promise<boolean>;

  /**
   * 检查 email 是否已被使用
   * @param email - Email
   * @returns 是否已存在
   */
  emailExists(email: string): Promise<boolean>;
}
