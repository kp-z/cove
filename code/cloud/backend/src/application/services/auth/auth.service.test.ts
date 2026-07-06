/**
 * AuthService - "记住我" 令牌有效期行为测试
 *
 * 背景：修复前端"记住我"登录状态不持久化的问题时发现，后端签发的 JWT
 * 有效期固定为 1 小时，与前端"记住我"勾选框完全没有关联，导致即使
 * 用户选择了"记住我"，登录状态也会在很短时间内过期并被强制退出。
 * 这里补充测试锁定修复后的行为：勾选"记住我"时签发长有效期令牌，
 * 不勾选时维持原有的默认（短）有效期。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { UserEntity } from '../../../domain/models/user/user.entity';
import type { IUserRepository, ILogger } from '../../interfaces';
import { AuditService } from '../audit/audit.service';

const JWT_SECRET = 'test-secret';

async function createTestUser(): Promise<UserEntity> {
  let user = UserEntity.create({
    userId: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    role: 'user',
    status: 'active',
    createdAt: new Date(),
  });
  user = await user.setPassword('Password123!');
  return user;
}

function createMockLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as ILogger;
}

function createMockUserRepository(user: UserEntity): IUserRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findByUsername: vi.fn().mockResolvedValue(user),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByRole: vi.fn().mockResolvedValue([]),
    usernameExists: vi.fn().mockResolvedValue(false),
    emailExists: vi.fn().mockResolvedValue(false),
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUserRepository;
}

function createMockAuditService(): AuditService {
  return { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

describe('AuthService - rememberMe 令牌有效期', () => {
  let user: UserEntity;
  let userRepository: IUserRepository;
  let logger: ILogger;
  let auditService: AuditService;

  beforeEach(async () => {
    user = await createTestUser();
    userRepository = createMockUserRepository(user);
    logger = createMockLogger();
    auditService = createMockAuditService();
  });

  it('generateToken 默认使用构造函数传入的短有效期', () => {
    const authService = new AuthService(
      userRepository,
      logger,
      auditService,
      undefined,
      undefined,
      JWT_SECRET,
      '1h',
      '30d'
    );

    const token = authService.generateToken(user);
    const payload = jwt.verify(token, JWT_SECRET) as { exp: number; iat: number };

    // 1 小时 = 3600 秒，允许少量误差
    expect(payload.exp - payload.iat).toBeCloseTo(3600, -1);
  });

  it('generateToken 传入 expiresInOverride 时使用覆盖的有效期', () => {
    const authService = new AuthService(
      userRepository,
      logger,
      auditService,
      undefined,
      undefined,
      JWT_SECRET,
      '1h',
      '30d'
    );

    const token = authService.generateToken(user, '30d');
    const payload = jwt.verify(token, JWT_SECRET) as { exp: number; iat: number };

    // 30 天 = 2592000 秒
    expect(payload.exp - payload.iat).toBeCloseTo(30 * 24 * 60 * 60, -2);
  });

  it('login 未勾选"记住我"时签发默认短有效期令牌', async () => {
    const authService = new AuthService(
      userRepository,
      logger,
      auditService,
      undefined,
      undefined,
      JWT_SECRET,
      '1h',
      '30d'
    );

    const result = await authService.login('testuser', 'Password123!', '127.0.0.1', 'vitest');
    const payload = jwt.verify(result.token, JWT_SECRET) as { exp: number; iat: number };

    expect(payload.exp - payload.iat).toBeCloseTo(3600, -1);
  });

  it('login 勾选"记住我"时签发长有效期令牌', async () => {
    const authService = new AuthService(
      userRepository,
      logger,
      auditService,
      undefined,
      undefined,
      JWT_SECRET,
      '1h',
      '30d'
    );

    const result = await authService.login('testuser', 'Password123!', '127.0.0.1', 'vitest', true);
    const payload = jwt.verify(result.token, JWT_SECRET) as { exp: number; iat: number };

    expect(payload.exp - payload.iat).toBeCloseTo(30 * 24 * 60 * 60, -2);
  });
});
