"use strict";
/**
 * MemberEntity - 频道成员关系实体（聚合根）
 *
 * 表示 User 或 Agent 与 Channel 之间的成员关系，管理角色、权限、状态等。
 *
 * 业务规则：
 * - memberId 不能为空
 * - channelId 不能为空
 * - userId 不能为空
 * - role 只能是 owner | admin | member | guest
 * - status 只能是 joined | active | left | banned
 * - Entity 是不可变的（更新返回新实例）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberEntity = void 0;
const VALID_MEMBER_ROLES = ['owner', 'admin', 'member', 'guest'];
const VALID_MEMBER_STATUSES = ['joined', 'active', 'left', 'banned'];
const VALID_ONLINE_STATUSES = ['online', 'offline', 'away'];
class MemberEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new MemberEntity(props);
    }
    static fromJSON(json) {
        return MemberEntity.create({
            memberId: json.member_id,
            channelId: json.channel_id,
            userId: json.user_id,
            userType: json.user_type,
            role: json.role,
            permissions: json.permissions,
            status: json.status,
            onlineStatus: json.online_status,
            joinedAt: new Date(json.joined_at),
            lastActiveAt: new Date(json.last_active_at),
            leftAt: json.left_at ? new Date(json.left_at) : undefined,
            bannedAt: json.banned_at ? new Date(json.banned_at) : undefined,
            statistics: {
                messageCount: json.statistics.message_count,
                reactionCount: json.statistics.reaction_count,
                mentionCount: json.statistics.mention_count,
                threadCount: json.statistics.thread_count,
            },
            notificationSettings: {
                enabled: json.notification_settings.enabled,
                mentionOnly: json.notification_settings.mention_only,
                muteUntil: json.notification_settings.mute_until
                    ? new Date(json.notification_settings.mute_until)
                    : undefined,
            },
            meta: json.meta,
        });
    }
    validate() {
        if (!this.props.memberId || this.props.memberId.trim() === '') {
            throw new Error('Member ID cannot be empty');
        }
        if (!this.props.channelId || this.props.channelId.trim() === '') {
            throw new Error('Channel ID cannot be empty');
        }
        if (!this.props.userId || this.props.userId.trim() === '') {
            throw new Error('User ID cannot be empty');
        }
        if (!VALID_MEMBER_ROLES.includes(this.props.role)) {
            throw new Error(`Invalid member role: ${this.props.role}. Must be one of: ${VALID_MEMBER_ROLES.join(', ')}`);
        }
        if (!VALID_MEMBER_STATUSES.includes(this.props.status)) {
            throw new Error(`Invalid member status: ${this.props.status}. Must be one of: ${VALID_MEMBER_STATUSES.join(', ')}`);
        }
        if (!VALID_ONLINE_STATUSES.includes(this.props.onlineStatus)) {
            throw new Error(`Invalid online status: ${this.props.onlineStatus}. Must be one of: ${VALID_ONLINE_STATUSES.join(', ')}`);
        }
    }
    // --- Getters ---
    get memberId() { return this.props.memberId; }
    get channelId() { return this.props.channelId; }
    get userId() { return this.props.userId; }
    get userType() { return this.props.userType; }
    get role() { return this.props.role; }
    get permissions() { return this.props.permissions; }
    get status() { return this.props.status; }
    get onlineStatus() { return this.props.onlineStatus; }
    get joinedAt() { return this.props.joinedAt; }
    get lastActiveAt() { return this.props.lastActiveAt; }
    get leftAt() { return this.props.leftAt; }
    get bannedAt() { return this.props.bannedAt; }
    get statistics() { return this.props.statistics; }
    get notificationSettings() { return this.props.notificationSettings; }
    get meta() { return this.props.meta; }
    // --- Role checks ---
    isOwner() { return this.props.role === 'owner'; }
    isAdmin() { return this.props.role === 'admin'; }
    isMember() { return this.props.role === 'member'; }
    isGuest() { return this.props.role === 'guest'; }
    hasAdminPrivileges() { return this.isOwner() || this.isAdmin(); }
    // --- Status checks ---
    isJoined() { return this.props.status === 'joined'; }
    isActive() { return this.props.status === 'active'; }
    hasLeft() { return this.props.status === 'left'; }
    isBanned() { return this.props.status === 'banned'; }
    isOnline() { return this.props.onlineStatus === 'online'; }
    isOffline() { return this.props.onlineStatus === 'offline'; }
    isAway() { return this.props.onlineStatus === 'away'; }
    // --- Type checks ---
    isHuman() { return this.props.userType === 'human'; }
    isAgent() { return this.props.userType === 'agent'; }
    // --- Permission checks ---
    hasPermission(permission) {
        return this.props.permissions.includes(permission);
    }
    canReadMessages() {
        return this.hasPermission('read:message');
    }
    canWriteMessages() {
        return this.hasPermission('write:message');
    }
    canManageMembers() {
        return this.hasPermission('manage:member');
    }
    canManageChannel() {
        return this.hasPermission('manage:channel');
    }
    // --- Notification checks ---
    isMuted() {
        if (!this.props.notificationSettings.muteUntil)
            return false;
        return this.props.notificationSettings.muteUntil > new Date();
    }
    shouldNotify(isMention) {
        if (!this.props.notificationSettings.enabled)
            return false;
        if (this.isMuted())
            return false;
        if (this.props.notificationSettings.mentionOnly && !isMention)
            return false;
        return true;
    }
    // --- Immutable updates ---
    updateRole(role) {
        return MemberEntity.create({
            ...this.props,
            role,
        });
    }
    updatePermissions(permissions) {
        return MemberEntity.create({
            ...this.props,
            permissions,
        });
    }
    addPermission(permission) {
        if (this.hasPermission(permission))
            return this;
        return MemberEntity.create({
            ...this.props,
            permissions: [...this.props.permissions, permission],
        });
    }
    removePermission(permission) {
        if (!this.hasPermission(permission))
            return this;
        return MemberEntity.create({
            ...this.props,
            permissions: this.props.permissions.filter(p => p !== permission),
        });
    }
    updateStatus(status) {
        return MemberEntity.create({
            ...this.props,
            status,
        });
    }
    activate() {
        if (this.props.status !== 'joined') {
            throw new Error('Only joined members can be activated');
        }
        return MemberEntity.create({
            ...this.props,
            status: 'active',
            lastActiveAt: new Date(),
        });
    }
    leave() {
        if (this.props.status !== 'active' && this.props.status !== 'joined') {
            throw new Error('Only active or joined members can leave');
        }
        return MemberEntity.create({
            ...this.props,
            status: 'left',
            leftAt: new Date(),
            onlineStatus: 'offline',
        });
    }
    ban() {
        if (this.props.status === 'banned')
            return this;
        return MemberEntity.create({
            ...this.props,
            status: 'banned',
            bannedAt: new Date(),
            onlineStatus: 'offline',
        });
    }
    unban() {
        if (this.props.status !== 'banned') {
            throw new Error('Only banned members can be unbanned');
        }
        return MemberEntity.create({
            ...this.props,
            status: 'joined',
            bannedAt: undefined,
        });
    }
    updateOnlineStatus(onlineStatus) {
        return MemberEntity.create({
            ...this.props,
            onlineStatus,
            lastActiveAt: onlineStatus === 'online' ? new Date() : this.props.lastActiveAt,
        });
    }
    goOnline() {
        return this.updateOnlineStatus('online');
    }
    goOffline() {
        return this.updateOnlineStatus('offline');
    }
    goAway() {
        return this.updateOnlineStatus('away');
    }
    updateLastActive() {
        return MemberEntity.create({
            ...this.props,
            lastActiveAt: new Date(),
        });
    }
    incrementMessageCount() {
        return MemberEntity.create({
            ...this.props,
            statistics: {
                ...this.props.statistics,
                messageCount: this.props.statistics.messageCount + 1,
            },
            lastActiveAt: new Date(),
        });
    }
    incrementReactionCount() {
        return MemberEntity.create({
            ...this.props,
            statistics: {
                ...this.props.statistics,
                reactionCount: this.props.statistics.reactionCount + 1,
            },
            lastActiveAt: new Date(),
        });
    }
    incrementMentionCount() {
        return MemberEntity.create({
            ...this.props,
            statistics: {
                ...this.props.statistics,
                mentionCount: this.props.statistics.mentionCount + 1,
            },
        });
    }
    incrementThreadCount() {
        return MemberEntity.create({
            ...this.props,
            statistics: {
                ...this.props.statistics,
                threadCount: this.props.statistics.threadCount + 1,
            },
            lastActiveAt: new Date(),
        });
    }
    updateNotificationSettings(settings) {
        return MemberEntity.create({
            ...this.props,
            notificationSettings: settings,
        });
    }
    mute(until) {
        return MemberEntity.create({
            ...this.props,
            notificationSettings: {
                ...this.props.notificationSettings,
                muteUntil: until,
            },
        });
    }
    unmute() {
        return MemberEntity.create({
            ...this.props,
            notificationSettings: {
                ...this.props.notificationSettings,
                muteUntil: undefined,
            },
        });
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.memberId === other.props.memberId;
    }
    // --- Serialization ---
    toJSON() {
        return {
            member_id: this.props.memberId,
            channel_id: this.props.channelId,
            user_id: this.props.userId,
            user_type: this.props.userType,
            role: this.props.role,
            permissions: this.props.permissions,
            status: this.props.status,
            online_status: this.props.onlineStatus,
            joined_at: this.props.joinedAt.toISOString(),
            last_active_at: this.props.lastActiveAt.toISOString(),
            left_at: this.props.leftAt?.toISOString(),
            banned_at: this.props.bannedAt?.toISOString(),
            statistics: {
                message_count: this.props.statistics.messageCount,
                reaction_count: this.props.statistics.reactionCount,
                mention_count: this.props.statistics.mentionCount,
                thread_count: this.props.statistics.threadCount,
            },
            notification_settings: {
                enabled: this.props.notificationSettings.enabled,
                mention_only: this.props.notificationSettings.mentionOnly,
                mute_until: this.props.notificationSettings.muteUntil?.toISOString(),
            },
            meta: this.props.meta,
        };
    }
}
exports.MemberEntity = MemberEntity;
