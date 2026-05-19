/**
 * Server Member Role
 * 定义服务器成员的角色层级
 */
export type ServerRole = 'owner' | 'admin' | 'member' | 'guest';

/**
 * Server Member Status
 * 定义成员的状态
 */
export type MemberStatus = 'active' | 'suspended' | 'left';

/**
 * Server Permission
 * 定义服务器权限列表
 */
export enum ServerPermission {
  // Server 管理权限
  SERVER_MANAGE = 'server.manage',
  SERVER_DELETE = 'server.delete',
  SERVER_TRANSFER = 'server.transfer',

  // 成员管理权限
  MEMBER_INVITE = 'member.invite',
  MEMBER_REMOVE = 'member.remove',
  MEMBER_MANAGE_ROLES = 'member.manage_roles',
  MEMBER_VIEW = 'member.view',

  // 项目管理权限
  PROJECT_CREATE = 'project.create',
  PROJECT_DELETE = 'project.delete',
  PROJECT_MANAGE = 'project.manage',
  PROJECT_VIEW = 'project.view',

  // 频道管理权限
  CHANNEL_CREATE = 'channel.create',
  CHANNEL_DELETE = 'channel.delete',
  CHANNEL_MANAGE = 'channel.manage',
  CHANNEL_VIEW = 'channel.view',

  // 消息权限
  MESSAGE_SEND = 'message.send',
  MESSAGE_DELETE = 'message.delete',
  MESSAGE_VIEW = 'message.view',

  // 设备管理权限
  DEVICE_MANAGE = 'device.manage',
  DEVICE_VIEW = 'device.view',

  // Agent 管理权限
  AGENT_CREATE = 'agent.create',
  AGENT_DELETE = 'agent.delete',
  AGENT_MANAGE = 'agent.manage',
  AGENT_VIEW = 'agent.view',
}

/**
 * Role Permission Mapping
 * 定义每个角色的默认权限
 */
export const ROLE_PERMISSIONS: Record<ServerRole, ServerPermission[]> = {
  owner: [
    // Owner 拥有所有权限
    ServerPermission.SERVER_MANAGE,
    ServerPermission.SERVER_DELETE,
    ServerPermission.SERVER_TRANSFER,
    ServerPermission.MEMBER_INVITE,
    ServerPermission.MEMBER_REMOVE,
    ServerPermission.MEMBER_MANAGE_ROLES,
    ServerPermission.MEMBER_VIEW,
    ServerPermission.PROJECT_CREATE,
    ServerPermission.PROJECT_DELETE,
    ServerPermission.PROJECT_MANAGE,
    ServerPermission.PROJECT_VIEW,
    ServerPermission.CHANNEL_CREATE,
    ServerPermission.CHANNEL_DELETE,
    ServerPermission.CHANNEL_MANAGE,
    ServerPermission.CHANNEL_VIEW,
    ServerPermission.MESSAGE_SEND,
    ServerPermission.MESSAGE_DELETE,
    ServerPermission.MESSAGE_VIEW,
    ServerPermission.DEVICE_MANAGE,
    ServerPermission.DEVICE_VIEW,
    ServerPermission.AGENT_CREATE,
    ServerPermission.AGENT_DELETE,
    ServerPermission.AGENT_MANAGE,
    ServerPermission.AGENT_VIEW,
  ],
  admin: [
    // Admin 拥有管理权限（除了删除 Server 和转让所有权）
    ServerPermission.SERVER_MANAGE,
    ServerPermission.MEMBER_INVITE,
    ServerPermission.MEMBER_REMOVE,
    ServerPermission.MEMBER_MANAGE_ROLES,
    ServerPermission.MEMBER_VIEW,
    ServerPermission.PROJECT_CREATE,
    ServerPermission.PROJECT_DELETE,
    ServerPermission.PROJECT_MANAGE,
    ServerPermission.PROJECT_VIEW,
    ServerPermission.CHANNEL_CREATE,
    ServerPermission.CHANNEL_DELETE,
    ServerPermission.CHANNEL_MANAGE,
    ServerPermission.CHANNEL_VIEW,
    ServerPermission.MESSAGE_SEND,
    ServerPermission.MESSAGE_DELETE,
    ServerPermission.MESSAGE_VIEW,
    ServerPermission.DEVICE_MANAGE,
    ServerPermission.DEVICE_VIEW,
    ServerPermission.AGENT_CREATE,
    ServerPermission.AGENT_DELETE,
    ServerPermission.AGENT_MANAGE,
    ServerPermission.AGENT_VIEW,
  ],
  member: [
    // Member 拥有基本权限
    ServerPermission.MEMBER_VIEW,
    ServerPermission.PROJECT_VIEW,
    ServerPermission.CHANNEL_CREATE,
    ServerPermission.CHANNEL_VIEW,
    ServerPermission.MESSAGE_SEND,
    ServerPermission.MESSAGE_VIEW,
    ServerPermission.DEVICE_VIEW,
    ServerPermission.AGENT_CREATE,
    ServerPermission.AGENT_VIEW,
  ],
  guest: [
    // Guest 只有只读权限
    ServerPermission.MEMBER_VIEW,
    ServerPermission.PROJECT_VIEW,
    ServerPermission.CHANNEL_VIEW,
    ServerPermission.MESSAGE_VIEW,
    ServerPermission.DEVICE_VIEW,
    ServerPermission.AGENT_VIEW,
  ],
};

/**
 * Server Member Entity Props
 */
export interface ServerMemberEntityProps {
  member_id: string;
  server_id: string;
  user_id: string;
  role: ServerRole;
  custom_permissions?: ServerPermission[]; // 自定义权限，可覆盖角色默认权限
  status: MemberStatus;
  joined_at: Date;
  updated_at: Date;
  meta?: Record<string, unknown>;
}

/**
 * Server Member Entity JSON
 */
export type ServerMemberEntityJSON = {
  member_id: string;
  server_id: string;
  user_id: string;
  role: ServerRole;
  custom_permissions?: ServerPermission[];
  status: MemberStatus;
  joined_at: string;
  updated_at: string;
  meta?: Record<string, unknown>;
};

/**
 * Server Member Entity
 * 管理用户-服务器关系和权限
 */
export class ServerMemberEntity {
  private constructor(private readonly props: ServerMemberEntityProps) {
    this.validate();
  }

  /**
   * 创建 ServerMemberEntity
   */
  static create(props: ServerMemberEntityProps): ServerMemberEntity {
    return new ServerMemberEntity(props);
  }

  /**
   * 验证实体属性
   */
  private validate(): void {
    if (!this.props.member_id?.trim()) {
      throw new Error('Member ID is required');
    }
    if (!this.props.server_id?.trim()) {
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
  get memberId(): string {
    return this.props.member_id;
  }

  get serverId(): string {
    return this.props.server_id;
  }

  get userId(): string {
    return this.props.user_id;
  }

  get role(): ServerRole {
    return this.props.role;
  }

  get customPermissions(): ServerPermission[] | undefined {
    return this.props.custom_permissions;
  }

  get status(): MemberStatus {
    return this.props.status;
  }

  get joinedAt(): Date {
    return this.props.joined_at;
  }

  get updatedAt(): Date {
    return this.props.updated_at;
  }

  get meta(): Record<string, unknown> | undefined {
    return this.props.meta;
  }

  /**
   * 获取成员的所有权限
   * 如果有自定义权限，使用自定义权限；否则使用角色默认权限
   */
  getPermissions(): ServerPermission[] {
    if (this.props.custom_permissions && this.props.custom_permissions.length > 0) {
      return this.props.custom_permissions;
    }
    return ROLE_PERMISSIONS[this.props.role];
  }

  /**
   * 检查是否拥有指定权限
   */
  hasPermission(permission: ServerPermission): boolean {
    const permissions = this.getPermissions();
    return permissions.includes(permission);
  }

  /**
   * 检查是否拥有所有指定权限
   */
  hasAllPermissions(permissions: ServerPermission[]): boolean {
    const memberPermissions = this.getPermissions();
    return permissions.every((p) => memberPermissions.includes(p));
  }

  /**
   * 检查是否拥有任一指定权限
   */
  hasAnyPermission(permissions: ServerPermission[]): boolean {
    const memberPermissions = this.getPermissions();
    return permissions.some((p) => memberPermissions.includes(p));
  }

  /**
   * 检查是否是 Owner
   */
  isOwner(): boolean {
    return this.props.role === 'owner';
  }

  /**
   * 检查是否是 Admin 或更高权限
   */
  isAdminOrHigher(): boolean {
    return this.props.role === 'owner' || this.props.role === 'admin';
  }

  /**
   * 检查是否是活跃成员
   */
  isActive(): boolean {
    return this.props.status === 'active';
  }

  /**
   * 检查是否已离开
   */
  hasLeft(): boolean {
    return this.props.status === 'left';
  }

  /**
   * 检查是否被暂停
   */
  isSuspended(): boolean {
    return this.props.status === 'suspended';
  }

  /**
   * 更新角色
   */
  updateRole(role: ServerRole): ServerMemberEntity {
    return new ServerMemberEntity({
      ...this.props,
      role,
      updated_at: new Date(),
    });
  }

  /**
   * 设置自定义权限
   */
  setCustomPermissions(permissions: ServerPermission[]): ServerMemberEntity {
    return new ServerMemberEntity({
      ...this.props,
      custom_permissions: permissions,
      updated_at: new Date(),
    });
  }

  /**
   * 清除自定义权限（恢复角色默认权限）
   */
  clearCustomPermissions(): ServerMemberEntity {
    return new ServerMemberEntity({
      ...this.props,
      custom_permissions: undefined,
      updated_at: new Date(),
    });
  }

  /**
   * 暂停成员
   */
  suspend(): ServerMemberEntity {
    if (this.props.status === 'suspended') {
      throw new Error('Member is already suspended');
    }
    if (this.props.status === 'left') {
      throw new Error('Cannot suspend a member who has left');
    }
    return new ServerMemberEntity({
      ...this.props,
      status: 'suspended',
      updated_at: new Date(),
    });
  }

  /**
   * 恢复成员
   */
  activate(): ServerMemberEntity {
    if (this.props.status === 'active') {
      throw new Error('Member is already active');
    }
    if (this.props.status === 'left') {
      throw new Error('Cannot activate a member who has left');
    }
    return new ServerMemberEntity({
      ...this.props,
      status: 'active',
      updated_at: new Date(),
    });
  }

  /**
   * 离开服务器
   */
  leave(): ServerMemberEntity {
    if (this.props.status === 'left') {
      throw new Error('Member has already left');
    }
    if (this.props.role === 'owner') {
      throw new Error('Owner cannot leave the server. Transfer ownership first.');
    }
    return new ServerMemberEntity({
      ...this.props,
      status: 'left',
      updated_at: new Date(),
    });
  }

  /**
   * 更新元数据
   */
  updateMeta(meta: Record<string, unknown>): ServerMemberEntity {
    return new ServerMemberEntity({
      ...this.props,
      meta: { ...this.props.meta, ...meta },
      updated_at: new Date(),
    });
  }

  /**
   * 转换为 JSON
   */
  toJSON(): ServerMemberEntityJSON {
    return {
      member_id: this.props.member_id,
      server_id: this.props.server_id,
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
  static fromJSON(json: ServerMemberEntityJSON): ServerMemberEntity {
    return new ServerMemberEntity({
      member_id: json.member_id,
      server_id: json.server_id,
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
