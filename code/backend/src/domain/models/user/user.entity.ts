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

export type UserRole = 'owner' | 'admin' | 'user' | 'visitor';

const VALID_ROLES: readonly UserRole[] = ['owner', 'admin', 'user', 'visitor'];
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
  readonly avatar?: string;
  readonly permissions?: readonly string[];
  readonly preference?: UserPreference;
  readonly createdAt: Date;
}

export interface UserEntityJSON {
  readonly user_id: string;
  readonly username: string;
  readonly display_name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly avatar?: string;
  readonly permissions: readonly string[];
  readonly preference?: UserPreference;
  readonly created_at: string;
}

export class UserEntity {
  private constructor(private readonly props: UserEntityProps) {
    this.validate();
  }

  static create(props: UserEntityProps): UserEntity {
    return new UserEntity(props);
  }

  static fromJSON(json: UserEntityJSON): UserEntity {
    return UserEntity.create({
      userId: json.user_id,
      username: json.username,
      displayName: json.display_name,
      email: json.email,
      role: json.role,
      avatar: json.avatar,
      permissions: json.permissions,
      preference: json.preference,
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
  }

  // --- Getters ---

  get userId(): string { return this.props.userId; }
  get username(): string { return this.props.username; }
  get displayName(): string { return this.props.displayName; }
  get email(): string { return this.props.email; }
  get role(): UserRole { return this.props.role; }
  get avatar(): string | undefined { return this.props.avatar; }
  get permissions(): readonly string[] { return this.props.permissions ?? []; }
  get preference(): UserPreference { return this.props.preference ?? {}; }
  get createdAt(): Date { return this.props.createdAt; }

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

  updatePreference(preference: UserPreference): UserEntity {
    // Validate: max 10 pinned channels
    if (preference.pinned_channels && preference.pinned_channels.length > 10) {
      throw new Error('Cannot pin more than 10 channels');
    }
    return UserEntity.create({ ...this.props, preference });
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
      avatar: this.props.avatar,
      permissions: this.permissions,
      preference: this.preference,
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
