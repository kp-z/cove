"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserEntity = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const VALID_ROLES = ['owner', 'admin', 'user', 'visitor'];
const VALID_STATUSES = ['active', 'suspended', 'deleted'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
class UserEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        // Validate username format
        UserEntity.validateUsername(props.username);
        return new UserEntity(props);
    }
    static fromJSON(json) {
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
    validate() {
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
    get userId() { return this.props.userId; }
    get username() { return this.props.username; }
    get displayName() { return this.props.displayName; }
    get email() { return this.props.email; }
    get role() { return this.props.role; }
    get status() { return this.props.status ?? 'active'; }
    get avatar() { return this.props.avatar; }
    get permissions() { return this.props.permissions ?? []; }
    get preference() { return this.props.preference ?? {}; }
    get passwordHash() { return this.props.passwordHash; }
    get lastLoginAt() { return this.props.lastLoginAt; }
    get failedLoginAttempts() { return this.props.failedLoginAttempts ?? 0; }
    get lockedUntil() { return this.props.lockedUntil; }
    get createdAt() { return this.props.createdAt; }
    // --- Status checks ---
    isActive() { return this.status === 'active'; }
    isSuspended() { return this.status === 'suspended'; }
    isDeleted() { return this.status === 'deleted'; }
    isLocked() {
        if (!this.props.lockedUntil)
            return false;
        return this.props.lockedUntil > new Date();
    }
    // --- Role checks ---
    isOwner() { return this.props.role === 'owner'; }
    isAdmin() { return this.props.role === 'admin'; }
    hasAdminPrivileges() { return this.props.role === 'owner' || this.props.role === 'admin'; }
    // --- Immutable updates ---
    updateDisplayName(displayName) {
        return UserEntity.create({ ...this.props, displayName });
    }
    updateRole(role) {
        return UserEntity.create({ ...this.props, role });
    }
    updateEmail(email) {
        return UserEntity.create({ ...this.props, email });
    }
    updatePreference(preference) {
        // Validate: max 10 pinned channels
        if (preference.pinned_channels && preference.pinned_channels.length > 10) {
            throw new Error('Cannot pin more than 10 channels');
        }
        return UserEntity.create({ ...this.props, preference });
    }
    updateStatus(status) {
        return UserEntity.create({ ...this.props, status });
    }
    updateLastLoginAt(lastLoginAt) {
        return UserEntity.create({ ...this.props, lastLoginAt, failedLoginAttempts: 0 });
    }
    incrementFailedLoginAttempts() {
        const attempts = this.failedLoginAttempts + 1;
        return UserEntity.create({ ...this.props, failedLoginAttempts: attempts });
    }
    lockAccount(durationMinutes) {
        const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
        return UserEntity.create({ ...this.props, lockedUntil });
    }
    unlockAccount() {
        return UserEntity.create({ ...this.props, lockedUntil: undefined, failedLoginAttempts: 0 });
    }
    activate() {
        return UserEntity.create({ ...this.props, status: 'active' });
    }
    suspend() {
        return UserEntity.create({ ...this.props, status: 'suspended' });
    }
    softDelete() {
        return UserEntity.create({ ...this.props, status: 'deleted' });
    }
    // --- Username validation ---
    static validateUsername(username) {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            throw new Error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
        }
    }
    // --- Password management ---
    static validatePasswordComplexity(password) {
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
    async setPassword(plainPassword) {
        UserEntity.validatePasswordComplexity(plainPassword);
        const hash = await bcrypt_1.default.hash(plainPassword, 10);
        return UserEntity.create({ ...this.props, passwordHash: hash });
    }
    async verifyPassword(plainPassword) {
        if (!this.props.passwordHash) {
            return false;
        }
        return await bcrypt_1.default.compare(plainPassword, this.props.passwordHash);
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.userId === other.props.userId;
    }
    // --- Serialization ---
    toJSON() {
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
exports.UserEntity = UserEntity;
