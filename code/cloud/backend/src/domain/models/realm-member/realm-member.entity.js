"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealmMemberEntity = exports.REALM_ROLE_PERMISSIONS = exports.RealmPermission = void 0;
/**
 * Realm Permission
 * 定义服务器权限列表
 */
var RealmPermission;
(function (RealmPermission) {
    // Realm 管理权限
    RealmPermission["SERVER_MANAGE"] = "server.manage";
    RealmPermission["SERVER_DELETE"] = "server.delete";
    RealmPermission["SERVER_TRANSFER"] = "server.transfer";
    // 成员管理权限
    RealmPermission["MEMBER_INVITE"] = "member.invite";
    RealmPermission["MEMBER_REMOVE"] = "member.remove";
    RealmPermission["MEMBER_MANAGE_ROLES"] = "member.manage_roles";
    RealmPermission["MEMBER_VIEW"] = "member.view";
    // 项目管理权限
    RealmPermission["PROJECT_CREATE"] = "project.create";
    RealmPermission["PROJECT_DELETE"] = "project.delete";
    RealmPermission["PROJECT_MANAGE"] = "project.manage";
    RealmPermission["PROJECT_VIEW"] = "project.view";
    // 频道管理权限
    RealmPermission["CHANNEL_CREATE"] = "channel.create";
    RealmPermission["CHANNEL_DELETE"] = "channel.delete";
    RealmPermission["CHANNEL_MANAGE"] = "channel.manage";
    RealmPermission["CHANNEL_VIEW"] = "channel.view";
    // 消息权限
    RealmPermission["MESSAGE_SEND"] = "message.send";
    RealmPermission["MESSAGE_DELETE"] = "message.delete";
    RealmPermission["MESSAGE_VIEW"] = "message.view";
    // 设备管理权限
    RealmPermission["DEVICE_MANAGE"] = "device.manage";
    RealmPermission["DEVICE_VIEW"] = "device.view";
    // Agent 管理权限
    RealmPermission["AGENT_CREATE"] = "agent.create";
    RealmPermission["AGENT_DELETE"] = "agent.delete";
    RealmPermission["AGENT_MANAGE"] = "agent.manage";
    RealmPermission["AGENT_VIEW"] = "agent.view";
})(RealmPermission || (exports.RealmPermission = RealmPermission = {}));
/**
 * Role Permission Mapping
 * 定义每个角色的默认权限
 */
exports.REALM_ROLE_PERMISSIONS = {
    owner: [
        // Owner 拥有所有权限
        RealmPermission.SERVER_MANAGE,
        RealmPermission.SERVER_DELETE,
        RealmPermission.SERVER_TRANSFER,
        RealmPermission.MEMBER_INVITE,
        RealmPermission.MEMBER_REMOVE,
        RealmPermission.MEMBER_MANAGE_ROLES,
        RealmPermission.MEMBER_VIEW,
        RealmPermission.PROJECT_CREATE,
        RealmPermission.PROJECT_DELETE,
        RealmPermission.PROJECT_MANAGE,
        RealmPermission.PROJECT_VIEW,
        RealmPermission.CHANNEL_CREATE,
        RealmPermission.CHANNEL_DELETE,
        RealmPermission.CHANNEL_MANAGE,
        RealmPermission.CHANNEL_VIEW,
        RealmPermission.MESSAGE_SEND,
        RealmPermission.MESSAGE_DELETE,
        RealmPermission.MESSAGE_VIEW,
        RealmPermission.DEVICE_MANAGE,
        RealmPermission.DEVICE_VIEW,
        RealmPermission.AGENT_CREATE,
        RealmPermission.AGENT_DELETE,
        RealmPermission.AGENT_MANAGE,
        RealmPermission.AGENT_VIEW,
    ],
    admin: [
        // Admin 拥有管理权限（除了删除 Server 和转让所有权）
        RealmPermission.SERVER_MANAGE,
        RealmPermission.MEMBER_INVITE,
        RealmPermission.MEMBER_REMOVE,
        RealmPermission.MEMBER_MANAGE_ROLES,
        RealmPermission.MEMBER_VIEW,
        RealmPermission.PROJECT_CREATE,
        RealmPermission.PROJECT_DELETE,
        RealmPermission.PROJECT_MANAGE,
        RealmPermission.PROJECT_VIEW,
        RealmPermission.CHANNEL_CREATE,
        RealmPermission.CHANNEL_DELETE,
        RealmPermission.CHANNEL_MANAGE,
        RealmPermission.CHANNEL_VIEW,
        RealmPermission.MESSAGE_SEND,
        RealmPermission.MESSAGE_DELETE,
        RealmPermission.MESSAGE_VIEW,
        RealmPermission.DEVICE_MANAGE,
        RealmPermission.DEVICE_VIEW,
        RealmPermission.AGENT_CREATE,
        RealmPermission.AGENT_DELETE,
        RealmPermission.AGENT_MANAGE,
        RealmPermission.AGENT_VIEW,
    ],
    member: [
        // Member 拥有基本权限
        RealmPermission.MEMBER_VIEW,
        RealmPermission.PROJECT_VIEW,
        RealmPermission.CHANNEL_CREATE,
        RealmPermission.CHANNEL_VIEW,
        RealmPermission.MESSAGE_SEND,
        RealmPermission.MESSAGE_VIEW,
        RealmPermission.DEVICE_VIEW,
        RealmPermission.AGENT_CREATE,
        RealmPermission.AGENT_VIEW,
    ],
    guest: [
        // Guest 只有只读权限
        RealmPermission.MEMBER_VIEW,
        RealmPermission.PROJECT_VIEW,
        RealmPermission.CHANNEL_VIEW,
        RealmPermission.MESSAGE_VIEW,
        RealmPermission.DEVICE_VIEW,
        RealmPermission.AGENT_VIEW,
    ],
};
/**
 * Realm Member Entity
 * 管理用户-服务器关系和权限
 */
class RealmMemberEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    /**
     * 创建 RealmMemberEntity
     */
    static create(props) {
        return new RealmMemberEntity(props);
    }
    /**
     * 验证实体属性
     */
    validate() {
        if (!this.props.member_id?.trim()) {
            throw new Error('Member ID is required');
        }
        if (!this.props.realm_id?.trim()) {
            throw new Error('Server ID is required');
        }
        if (!this.props.user_id?.trim()) {
            throw new Error('User ID is required');
        }
        if (!['owner', 'admin', 'member', 'guest'].includes(this.props.role)) {
            throw new Error(`Invalid role: ${this.props.role}`);
        }
        if (!['active', 'suspended', 'left'].includes(this.props.status)) {
            throw new Error(`Invalid status: ${this.props.status}`);
        }
        if (!(this.props.joined_at instanceof Date)) {
            throw new Error('Joined at must be a Date');
        }
        if (!(this.props.updated_at instanceof Date)) {
            throw new Error('Updated at must be a Date');
        }
    }
    // Getters
    get memberId() {
        return this.props.member_id;
    }
    get realmId() {
        return this.props.realm_id;
    }
    get userId() {
        return this.props.user_id;
    }
    get role() {
        return this.props.role;
    }
    get customPermissions() {
        return this.props.custom_permissions;
    }
    get status() {
        return this.props.status;
    }
    get joinedAt() {
        return this.props.joined_at;
    }
    get updatedAt() {
        return this.props.updated_at;
    }
    get meta() {
        return this.props.meta;
    }
    /**
     * 获取成员的所有权限
     * 如果有自定义权限，使用自定义权限；否则使用角色默认权限
     */
    getPermissions() {
        if (this.props.custom_permissions && this.props.custom_permissions.length > 0) {
            return this.props.custom_permissions;
        }
        return exports.REALM_ROLE_PERMISSIONS[this.props.role];
    }
    /**
     * 检查是否拥有指定权限
     */
    hasPermission(permission) {
        const permissions = this.getPermissions();
        return permissions.includes(permission);
    }
    /**
     * 检查是否拥有所有指定权限
     */
    hasAllPermissions(permissions) {
        const memberPermissions = this.getPermissions();
        return permissions.every((p) => memberPermissions.includes(p));
    }
    /**
     * 检查是否拥有任一指定权限
     */
    hasAnyPermission(permissions) {
        const memberPermissions = this.getPermissions();
        return permissions.some((p) => memberPermissions.includes(p));
    }
    /**
     * 检查是否是 Owner
     */
    isOwner() {
        return this.props.role === 'owner';
    }
    /**
     * 检查是否是 Admin 或更高权限
     */
    isAdminOrHigher() {
        return this.props.role === 'owner' || this.props.role === 'admin';
    }
    /**
     * 检查是否是活跃成员
     */
    isActive() {
        return this.props.status === 'active';
    }
    /**
     * 检查是否已离开
     */
    hasLeft() {
        return this.props.status === 'left';
    }
    /**
     * 检查是否被暂停
     */
    isSuspended() {
        return this.props.status === 'suspended';
    }
    /**
     * 更新角色
     */
    updateRole(role) {
        return new RealmMemberEntity({
            ...this.props,
            role,
            updated_at: new Date(),
        });
    }
    /**
     * 设置自定义权限
     */
    setCustomPermissions(permissions) {
        return new RealmMemberEntity({
            ...this.props,
            custom_permissions: permissions,
            updated_at: new Date(),
        });
    }
    /**
     * 清除自定义权限（恢复角色默认权限）
     */
    clearCustomPermissions() {
        return new RealmMemberEntity({
            ...this.props,
            custom_permissions: undefined,
            updated_at: new Date(),
        });
    }
    /**
     * 暂停成员
     */
    suspend() {
        if (this.props.status === 'suspended') {
            throw new Error('Member is already suspended');
        }
        if (this.props.status === 'left') {
            throw new Error('Cannot suspend a member who has left');
        }
        return new RealmMemberEntity({
            ...this.props,
            status: 'suspended',
            updated_at: new Date(),
        });
    }
    /**
     * 恢复成员
     */
    activate() {
        if (this.props.status === 'active') {
            throw new Error('Member is already active');
        }
        if (this.props.status === 'left') {
            throw new Error('Cannot activate a member who has left');
        }
        return new RealmMemberEntity({
            ...this.props,
            status: 'active',
            updated_at: new Date(),
        });
    }
    /**
     * 离开服务器
     */
    leave() {
        if (this.props.status === 'left') {
            throw new Error('Member has already left');
        }
        if (this.props.role === 'owner') {
            throw new Error('Owner cannot leave the server. Transfer ownership first.');
        }
        return new RealmMemberEntity({
            ...this.props,
            status: 'left',
            updated_at: new Date(),
        });
    }
    /**
     * 更新元数据
     */
    updateMeta(meta) {
        return new RealmMemberEntity({
            ...this.props,
            meta: { ...this.props.meta, ...meta },
            updated_at: new Date(),
        });
    }
    /**
     * 转换为 JSON
     */
    toJSON() {
        return {
            member_id: this.props.member_id,
            realm_id: this.props.realm_id,
            user_id: this.props.user_id,
            role: this.props.role,
            custom_permissions: this.props.custom_permissions,
            status: this.props.status,
            joined_at: this.props.joined_at.toISOString(),
            updated_at: this.props.updated_at.toISOString(),
            meta: this.props.meta,
        };
    }
    /**
     * 从 JSON 创建实体
     */
    static fromJSON(json) {
        return new RealmMemberEntity({
            member_id: json.member_id,
            realm_id: json.realm_id,
            user_id: json.user_id,
            role: json.role,
            custom_permissions: json.custom_permissions,
            status: json.status,
            joined_at: new Date(json.joined_at),
            updated_at: new Date(json.updated_at),
            meta: json.meta,
        });
    }
}
exports.RealmMemberEntity = RealmMemberEntity;
