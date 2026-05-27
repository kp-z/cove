/**
 * AuthService - 认证服务
 *
 * 职责：
 * - 用户登录验证
 * - JWT 令牌生成和验证
 * - 初始管理员账号创建
 *
 * 高内聚：所有认证逻辑集中在这里
 */

import jwt from 'jsonwebtoken';
import { UserEntity, UserRole } from '../../../domain/models/user/user.entity';
import { IUserRepository, ILogger, IRealmRepository, IRealmMemberRepository } from '../../interfaces';
import { InvalidCredentialsError, InvalidTokenError, UserDisabledError } from './auth.errors';
import { AuditService } from '../audit/audit.service';
import { TRPCError } from '@trpc/server';
import { RealmMemberEntity } from '../../../domain/models/realm-member/realm-member.entity';
import { getRealmContext } from '../../context/realm-context-store';

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: UserEntity;
  defaultRealmId?: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: ILogger,
    private readonly auditService: AuditService,
    private readonly realmRepository?: IRealmRepository,
    private readonly realmMemberRepository?: IRealmMemberRepository,
    jwtSecret?: string,
    jwtExpiresIn?: string
  ) {
    const secret = jwtSecret || process.env.JWT_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      this.logger.warn('Using default JWT secret for development. NEVER use this in production!');
      this.jwtSecret = 'cove-dev-secret-only';
    } else {
      this.jwtSecret = secret;
    }

    this.jwtExpiresIn = jwtExpiresIn || process.env.JWT_EXPIRES_IN || '1h';
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    this.logger.info('Login attempt', { username });

    // 查找用户
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      this.logger.warn('Login failed: user not found', { username });
      throw new InvalidCredentialsError();
    }

    // 检查账号是否被锁定
    if (user.isLocked()) {
      this.logger.warn('Login failed: account locked', { username, lockedUntil: user.lockedUntil });
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Account is locked until ${user.lockedUntil?.toISOString()}. Please try again later.`,
      });
    }

    // 检查账号状态
    if (user.status === 'suspended') {
      this.logger.warn('Login failed: account suspended', { username });
      throw new UserDisabledError(username);
    }

    if (user.status === 'deleted') {
      this.logger.warn('Login failed: account deleted', { username });
      throw new UserDisabledError(username);
    }

    if (user.role === 'visitor') {
      this.logger.warn('Login failed: visitor account', { username });
      throw new UserDisabledError(username);
    }

    // 验证密码
    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      this.logger.warn('Login failed: invalid password', { username, attempts: user.failedLoginAttempts + 1 });

      // 增加失败次数
      let updatedUser = user.incrementFailedLoginAttempts();

      // 如果失败次数达到 3 次，锁定账号 15 分钟
      if (updatedUser.failedLoginAttempts >= 3) {
        updatedUser = updatedUser.lockAccount(15);
        this.logger.warn('Account locked due to too many failed attempts', {
          username,
          attempts: updatedUser.failedLoginAttempts,
          lockedUntil: updatedUser.lockedUntil
        });
      }

      await this.userRepository.update(updatedUser, 'default');
      throw new InvalidCredentialsError();
    }

    // 登录成功，更新最后登录时间并重置失败次数
    const loggedInUser = user.updateLastLoginAt(new Date());
    await this.userRepository.update(loggedInUser, 'default');

    // 确保用户已加入 Nexus（兜底检查）
    await this.ensureUserInPlatformRealm(loggedInUser.userId);

    // 获取用户的默认 realm（第一个加入的 realm）
    const defaultRealmId = await this.getUserDefaultRealm(loggedInUser.userId);

    // 生成 JWT
    const token = this.generateToken(loggedInUser);

    // Audit log
    await this.auditService.log(
      loggedInUser.userId,
      'user.login',
      'user',
      loggedInUser.userId,
      {
        metadata: { username: loggedInUser.username, role: loggedInUser.role },
      },
      ipAddress,
      userAgent
    );

    this.logger.info('Login successful', { userId: loggedInUser.userId, username: loggedInUser.username, defaultRealmId });

    return { token, user: loggedInUser, defaultRealmId };
  }

  /**
   * 验证 JWT 令牌
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // 验证 payload 结构
      if (!payload.userId || !payload.username || !payload.role) {
        throw new InvalidTokenError('Invalid token payload');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new InvalidTokenError('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * 生成 JWT 令牌
   */
  generateToken(user: UserEntity): string {
    const payload: JWTPayload = {
      userId: user.userId,
      username: user.username,
      role: user.role,
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as any,
    });
  }

  /**
   * 用户注册
   */
  async register(
    dto: {
      username: string;
      email: string;
      password: string;
      displayName: string;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: UserEntity; token: string; defaultRealmId?: string }> {
    this.logger.info('User registration attempt', { username: dto.username, email: dto.email });

    // 检查用户名是否已存在
    const usernameExists = await this.userRepository.usernameExists(dto.username);
    if (usernameExists) {
      this.logger.warn('Registration failed: username already exists', { username: dto.username });
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Username already exists',
      });
    }

    // 检查邮箱是否已存在
    const emailExists = await this.userRepository.emailExists(dto.email);
    if (emailExists) {
      this.logger.warn('Registration failed: email already exists', { email: dto.email });
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Email already exists',
      });
    }

    // 创建用户（role 固定为 'user'）
    const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let user = UserEntity.create({
      userId,
      username: dto.username,
      email: dto.email,
      displayName: dto.displayName,
      role: 'user',
      status: 'active',
      avatar: {
        url: 'storage/avatars/presets/default-user.svg',
        type: 'default' as const,
      },
      permissions: [],
      createdAt: new Date(),
    });

    // 设置密码（会自动验证复杂度和用户名格式）
    user = await user.setPassword(dto.password);

    // 保存用户
    await this.userRepository.save(user, 'default');

    // 自动加入 Nexus Realm
    await this.addUserToPlatformRealm(user.userId);

    // 获取用户的默认 realm（第一个加入的 realm）
    const defaultRealmId = await this.getUserDefaultRealm(user.userId);

    // 记录审计日志
    await this.auditService.log(
      user.userId,
      'user.register',
      'user',
      user.userId,
      {
        metadata: { username: user.username, email: user.email },
      },
      ipAddress,
      userAgent
    );

    // 生成 JWT token（自动登录）
    const token = this.generateToken(user);

    this.logger.info('User registration successful', { userId: user.userId, username: user.username, defaultRealmId });

    return { user, token, defaultRealmId };
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string, realmId: string): Promise<void> {
    this.logger.info('Changing password', { userId });

    const user = await this.userRepository.findById(userId, realmId);
    if (!user) {
      throw new Error('User not found');
    }

    // 验证旧密码
    const isValid = await user.verifyPassword(oldPassword);
    if (!isValid) {
      this.logger.warn('Password change failed: invalid old password', { userId });
      throw new InvalidCredentialsError();
    }

    // 设置新密码（会自动验证复杂度）
    const updatedUser = await user.setPassword(newPassword);
    await this.userRepository.update(updatedUser, 'default');

    // Audit log
    await this.auditService.log(
      userId,
      'user.password_change',
      'user',
      userId
    );

    this.logger.info('Password changed successfully', { userId });
  }

  /**
   * 请求密码重置（生成重置 token）
   */
  async requestPasswordReset(email: string): Promise<string> {
    this.logger.info('Password reset requested', { email });

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // 为了安全，不透露用户是否存在
      this.logger.warn('Password reset requested for non-existent email', { email });
      return 'reset-token-placeholder';
    }

    // 生成重置 token（有效期 1 小时）
    const resetToken = jwt.sign(
      { userId: user.userId, type: 'password_reset' },
      this.jwtSecret,
      { expiresIn: '1h' }
    );

    this.logger.info('Password reset token generated', { userId: user.userId, email });

    return resetToken;
  }

  /**
   * 重置密码（使用 token）
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    this.logger.info('Resetting password with token');

    try {
      const payload = jwt.verify(resetToken, this.jwtSecret) as any;

      if (payload.type !== 'password_reset') {
        throw new InvalidTokenError('Invalid reset token');
      }

      const user = await this.userRepository.findById(payload.userId, getRealmContext().realmId);
      if (!user) {
        throw new Error('User not found');
      }

      // 设置新密码（会自动验证复杂度）
      const updatedUser = await user.setPassword(newPassword);
      await this.userRepository.update(updatedUser, 'default');

      // Audit log
      await this.auditService.log(
        payload.userId,
        'user.password_reset',
        'user',
        payload.userId
      );

      this.logger.info('Password reset successfully', { userId: payload.userId });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new InvalidTokenError('Reset token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenError('Invalid reset token');
      }
      throw error;
    }
  }

  /**
   * 确保初始管理员账号存在且有密码
   */
  async ensureInitialAdmin(): Promise<void> {
    try {
      const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin123!';

      // 检查是否已有 owner 用户
      const owners = await this.userRepository.findByRole('owner');
      if (owners.length > 0) {
        // 检查是否有密码，没有则设置默认密码
        for (const owner of owners) {
          if (!owner.passwordHash) {
            this.logger.info('Setting default password for existing owner', { userId: owner.userId, username: owner.username });
            const updated = await owner.setPassword(adminPassword);
            await this.userRepository.update(updated, 'default');
            this.logger.info('Password set successfully for existing owner', { username: owner.username });
          }
        }
        return;
      }

      // 从环境变量读取初始管理员信息
      const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
      const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@cove.local';

      this.logger.info('Creating initial admin account', { username: adminUsername });

      // 创建初始管理员
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      let adminUser = UserEntity.create({
        userId,
        username: adminUsername,
        displayName: 'Administrator',
        email: adminEmail,
        role: 'owner',
        permissions: [],
        createdAt: new Date(),
      });

      // 设置密码
      adminUser = await adminUser.setPassword(adminPassword);

      // 保存到数据库
      await this.userRepository.save(adminUser, 'default');

      this.logger.info('Initial admin account created successfully', {
        userId: adminUser.userId,
        username: adminUser.username,
      });

      if (adminPassword === 'Admin123!') {
        this.logger.warn('⚠️  Initial admin is using default password. Please change it immediately!');
      }
    } catch (error) {
      this.logger.error('Failed to create initial admin', error as Error);
      throw error;
    }
  }

  /**
   * 添加用户到平台 Realm (Nexus)
   */
  private async addUserToPlatformRealm(userId: string): Promise<void> {
    if (!this.realmRepository || !this.realmMemberRepository) {
      this.logger.debug('Realm repositories not available, skipping platform realm join');
      return;
    }

    try {
      // 查找 Nexus Realm
      const platformRealm = await this.realmRepository.findByName('nexus');

      if (!platformRealm) {
        this.logger.warn('Platform realm (Nexus) not found, skipping auto-join');
        return;
      }

      // 检查用户是否已经是成员
      const existingMember = await this.realmMemberRepository.findByServerAndUser(
        platformRealm.realm_id,
        userId
      );

      if (existingMember) {
        this.logger.debug('User already member of platform realm', { userId, realmId: platformRealm.realm_id });
        return;
      }

      // 添加为 Realm 成员
      const memberId = `member-nexus-${userId}`;
      const member = RealmMemberEntity.create({
        member_id: memberId,
        realm_id: platformRealm.realm_id,
        user_id: userId,
        role: 'member',
        status: 'active',
        joined_at: new Date(),
        updated_at: new Date(),
        meta: {},
      });

      await this.realmMemberRepository.save(member, platformRealm.realm_id);

      this.logger.info('User added to platform realm', { userId, realmId: platformRealm.realm_id });
    } catch (error) {
      this.logger.error('Failed to add user to platform realm', error as Error);
      // Don't throw - this shouldn't block registration/login
    }
  }

  /**
   * 确保用户已加入平台 Realm (兜底检查)
   */
  private async ensureUserInPlatformRealm(userId: string): Promise<void> {
    if (!this.realmRepository || !this.realmMemberRepository) {
      return;
    }

    try {
      // 查找 Nexus Realm
      const platformRealm = await this.realmRepository.findByName('nexus');

      if (!platformRealm) {
        return;
      }

      // 检查用户是否已经是成员
      const existingMember = await this.realmMemberRepository.findByServerAndUser(
        platformRealm.realm_id,
        userId
      );

      if (!existingMember) {
        // 用户不是成员，添加进去
        await this.addUserToPlatformRealm(userId);
      }
    } catch (error) {
      this.logger.error('Failed to ensure user in platform realm', error as Error);
      // Don't throw - this shouldn't block login
    }
  }

  /**
   * 获取用户的默认 realm（第一个加入的 realm）
   */
  private async getUserDefaultRealm(userId: string): Promise<string | undefined> {
    if (!this.realmMemberRepository) {
      return undefined;
    }

    try {
      // 获取用户所有的 realm 成员关系，按加入时间排序
      const members = await this.realmMemberRepository.findByUser(userId);

      if (members.length === 0) {
        this.logger.warn('User has no realm memberships', { userId });
        return undefined;
      }

      // 返回第一个加入的 realm（按 joined_at 排序）
      const sortedMembers = members
        .filter((m: RealmMemberEntity) => m.status === 'active')
        .sort((a: RealmMemberEntity, b: RealmMemberEntity) => a.joinedAt.getTime() - b.joinedAt.getTime());

      if (sortedMembers.length === 0) {
        this.logger.warn('User has no active realm memberships', { userId });
        return undefined;
      }

      return sortedMembers[0]!.realmId;
    } catch (error) {
      this.logger.error('Failed to get user default realm', error as Error);
      return undefined;
    }
  }
}
