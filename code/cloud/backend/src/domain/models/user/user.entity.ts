/**
 * UserEntity - 用户实体（聚合根）
 *
 * 人类用户的身份和权限实体。
 *
 * 业务规则：
 * - userId 不能为空
 * - username 不能为空
 * - email 必须是有效格式
 * - role 只能是 owner | admin | user | visitor
 * - Entity 是不可变的（更新返回新实例）
 */

import bcrypt from 'bcrypt';
import { Avatar } from '../../types/avatar.types';

export type UserRole = 'owner' | 'admin' | 'user' | 'visitor';
export type UserStatus = 'active' | 'suspended' | 'deleted';

const VALID_ROLES: readonly UserRole[] = ['owner', 'admin', 'user', 'visitor'];
const VALID_STATUSES: readonly UserStatus[] = ['active', 'suspended', 'deleted'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserPreference {
  readonly pinned_channels?: readonly string[];
}

export interface UserEntityProps {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status?: UserStatus;
  readonly avatar?: Avatar;
  readonly permissions?: readonly string[];
  readonly preference?: UserPreference;
  readonly passwordHash?: string;  // 密码哈希（可选，向后兼容）
  readonly lastLoginAt?: Date;
  readonly failedLoginAttempts?: number;
  readonly lockedUntil?: Date;
  readonly createdAt: Date;
}

export interface UserEntityJSON {
  readonly user_id: string;
  readonly username: string;
  readonly display_name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly avatar?: Avatar;
  readonly permissions: readonly string[];
  readonly preference?: UserPreference;
  readonly last_login_at?: string;
  readonly failed_login_attempts: number;
  readonly locked_until?: string;
  readonly created_at: string;
}

export class UserEntity {
  private constructor(private readonly props: UserEntityProps) {
    this.validate();
  }

  static create(props: UserEntityProps): UserEntity {
    // Validate username format
    UserEntity.validateUsername(props.username);
    return new UserEntity(props);
  }

  static fromJSON(json: UserEntityJSON): UserEntity {
    return UserEntity.create({
      userId: json.user_id,
      username: json.username,
      displayName: json.display_name,
      email: json.email,
      role: json.role,
      status: json.status,
      avatar: json.avatar,
      permissions: json.permissions,
      preference: json.preference,
      lastLoginAt: json.last_login_at ? new Date(json.last_login_at) : undefined,
      failedLoginAttempts: json.failed_login_attempts,
      lockedUntil: json.locked_until ? new Date(json.locked_until) : undefined,
      createdAt: new Date(json.created_at),
    });
  }

  private validate(): void {
    if (!this.props.userId || this.props.userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    if (!this.props.username || this.props.username.trim() === '') {
      throw new Error('Username cannot be empty');
    }
    if (!EMAIL_REGEX.test(this.props.email)) {
      throw new Error('Invalid email format');
    }
    if (!VALID_ROLES.includes(this.props.role)) {
      throw new Error(`Invalid role: ${this.props.role}. Must be one of: ${VALID_ROLES.join(', ')}`);
    }
    if (this.props.status && !VALID_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid status: ${this.props.status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  // --- Getters ---

  get userId(): string { return this.props.userId; }
  get username(): string { return this.props.username; }
  get displayName(): string { return this.props.displayName; }
  get email(): string { return this.props.email; }
  get role(): UserRole { return this.props.role; }
  get status(): UserStatus { return this.props.status ?? 'active'; }
  get avatar(): Avatar | undefined { return this.props.avatar; }
  get permissions(): readonly string[] { return this.props.permissions ?? []; }
  get preference(): UserPreference { return this.props.preference ?? {}; }
  get passwordHash(): string | undefined { return this.props.passwordHash; }
  get lastLoginAt(): Date | undefined { return this.props.lastLoginAt; }
  get failedLoginAttempts(): number { return this.props.failedLoginAttempts ?? 0; }
  get lockedUntil(): Date | undefined { return this.props.lockedUntil; }
  get createdAt(): Date { return this.props.createdAt; }

  // --- Status checks ---

  isActive(): boolean { return this.status === 'active'; }
  isSuspended(): boolean { return this.status === 'suspended'; }
  isDeleted(): boolean { return this.status === 'deleted'; }
  isLocked(): boolean {
    if (!this.props.lockedUntil) return false;
    return this.props.lockedUntil > new Date();
  }

  // --- Role checks ---

  isOwner(): boolean { return this.props.role === 'owner'; }
  isAdmin(): boolean { return this.props.role === 'admin'; }
  hasAdminPrivileges(): boolean { return this.props.role === 'owner' || this.props.role === 'admin'; }

  // --- Immutable updates ---

  updateDisplayName(displayName: string): UserEntity {
    return UserEntity.create({ ...this.props, displayName });
  }

  updateRole(role: UserRole): UserEntity {
    return UserEntity.create({ ...this.props, role });
  }

  updateEmail(email: string): UserEntity {
    return UserEntity.create({ ...this.props, email });
  }

  updateAvatar(avatar: Avatar): UserEntity {
    return UserEntity.create({ ...this.props, avatar });
  }

  updatePreference(preference: UserPreference): UserEntity {
    // Validate: max 10 pinned channels
    if (preference.pinned_channels && preference.pinned_channels.length > 10) {
      throw new Error('Cannot pin more than 10 channels');
    }
    return UserEntity.create({ ...this.props, preference });
  }

  updateStatus(status: UserStatus): UserEntity {
    return UserEntity.create({ ...this.props, status });
  }

  updateLastLoginAt(lastLoginAt: Date): UserEntity {
    return UserEntity.create({ ...this.props, lastLoginAt, failedLoginAttempts: 0 });
  }

  incrementFailedLoginAttempts(): UserEntity {
    const attempts = this.failedLoginAttempts + 1;
    return UserEntity.create({ ...this.props, failedLoginAttempts: attempts });
  }

  lockAccount(durationMinutes: number): UserEntity {
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    return UserEntity.create({ ...this.props, lockedUntil });
  }

  unlockAccount(): UserEntity {
    return UserEntity.create({ ...this.props, lockedUntil: undefined, failedLoginAttempts: 0 });
  }

  activate(): UserEntity {
    return UserEntity.create({ ...this.props, status: 'active' });
  }

  suspend(): UserEntity {
    return UserEntity.create({ ...this.props, status: 'suspended' });
  }

  softDelete(): UserEntity {
    return UserEntity.create({ ...this.props, status: 'deleted' });
  }

  // --- Username validation ---

  static validateUsername(username: string): void {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
    }
  }

  // --- Password management ---

  static validatePasswordComplexity(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  async setPassword(plainPassword: string): Promise<UserEntity> {
    UserEntity.validatePasswordComplexity(plainPassword);
    const hash = await bcrypt.hash(plainPassword, 10);
    return UserEntity.create({ ...this.props, passwordHash: hash });
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    if (!this.props.passwordHash) {
      return false;
    }
    return await bcrypt.compare(plainPassword, this.props.passwordHash);
  }

  // --- Equality (by ID) ---

  equals(other: UserEntity): boolean {
    return this.props.userId === other.props.userId;
  }

  // --- Serialization ---

  toJSON(): UserEntityJSON {
    return {
      user_id: this.props.userId,
      username: this.props.username,
      display_name: this.props.displayName,
      email: this.props.email,
      role: this.props.role,
      status: this.status,
      avatar: this.props.avatar,
      permissions: this.permissions,
      preference: this.preference,
      last_login_at: this.props.lastLoginAt?.toISOString(),
      failed_login_attempts: this.failedLoginAttempts,
      locked_until: this.props.lockedUntil?.toISOString(),
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
