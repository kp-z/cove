/**
 * ServerEntity - 服务器/工作空间实体（聚合根）
 *
 * Server 是 Cove 的顶层容器，代表一个工作空间或团队空间。
 * 类似于 Slack Workspace 或 Discord Server。
 *
 * 业务规则：
 * - server_id 不能为空
 * - name 不能为空且长度在 1-50 之间
 * - owner_id 不能为空
 * - status 只能是 active | suspended | archived
 * - visibility 只能是 public | private
 * - Entity 是不可变的（更新返回新实例）
 */

export type ServerStatus = 'active' | 'suspended' | 'archived';
export type ServerVisibility = 'public' | 'private';
export type MemberRole = 'member' | 'guest';

const VALID_SERVER_STATUSES: readonly ServerStatus[] = ['active', 'suspended', 'archived'];
const VALID_SERVER_VISIBILITIES: readonly ServerVisibility[] = ['public', 'private'];
const VALID_MEMBER_ROLES: readonly MemberRole[] = ['member', 'guest'];

/**
 * Server 设置
 */
export interface ServerSettings {
  readonly allow_public_channels: boolean;
  readonly allow_private_channels: boolean;
  readonly allow_dm: boolean;
  readonly require_approval: boolean;
  readonly default_member_role: MemberRole;
}

/**
 * Server 资源限制
 */
export interface ServerLimits {
  readonly max_members: number;
  readonly max_projects: number;
  readonly max_channels: number;
  readonly max_agents: number;
  readonly max_storage_gb: number;
}

/**
 * ServerEntity Props（内部使用 camelCase）
 */
export interface ServerEntityProps {
  readonly server_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly owner_id: string;
  readonly status: ServerStatus;
  readonly visibility: ServerVisibility;
  readonly settings: ServerSettings;
  readonly limits: ServerLimits;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly icon?: string;
    readonly banner?: string;
  };
}

/**
 * ServerEntity JSON（序列化格式，使用 snake_case）
 */
export interface ServerEntityJSON {
  readonly server_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly owner_id: string;
  readonly status: ServerStatus;
  readonly visibility: ServerVisibility;
  readonly settings: {
    readonly allow_public_channels: boolean;
    readonly allow_private_channels: boolean;
    readonly allow_dm: boolean;
    readonly require_approval: boolean;
    readonly default_member_role: MemberRole;
  };
  readonly limits: {
    readonly max_members: number;
    readonly max_projects: number;
    readonly max_channels: number;
    readonly max_agents: number;
    readonly max_storage_gb: number;
  };
  readonly created_at: string;
  readonly updated_at: string;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly icon?: string;
    readonly banner?: string;
  };
}

export class ServerEntity {
  private constructor(private readonly props: ServerEntityProps) {
    this.validate();
  }

  static create(props: ServerEntityProps): ServerEntity {
    return new ServerEntity(props);
  }

  static fromJSON(json: ServerEntityJSON): ServerEntity {
    return ServerEntity.create({
      server_id: json.server_id,
      name: json.name,
      display_name: json.display_name,
      description: json.description,
      owner_id: json.owner_id,
      status: json.status,
      visibility: json.visibility,
      settings: json.settings,
      limits: json.limits,
      created_at: new Date(json.created_at),
      updated_at: new Date(json.updated_at),
      meta: json.meta,
    });
  }

  private validate(): void {
    // Validate server_id
    if (!this.props.server_id || this.props.server_id.trim() === '') {
      throw new Error('Server ID cannot be empty');
    }

    // Validate name
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error('Server name cannot be empty');
    }
    if (this.props.name.length > 50) {
      throw new Error('Server name cannot exceed 50 characters');
    }

    // Validate display_name
    if (!this.props.display_name || this.props.display_name.trim() === '') {
      throw new Error('Server display name cannot be empty');
    }
    if (this.props.display_name.length > 100) {
      throw new Error('Server display name cannot exceed 100 characters');
    }

    // Validate owner_id
    if (!this.props.owner_id || this.props.owner_id.trim() === '') {
      throw new Error('Owner ID cannot be empty');
    }

    // Validate status
    if (!VALID_SERVER_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid server status: ${this.props.status}. Must be one of: ${VALID_SERVER_STATUSES.join(', ')}`);
    }

    // Validate visibility
    if (!VALID_SERVER_VISIBILITIES.includes(this.props.visibility)) {
      throw new Error(`Invalid server visibility: ${this.props.visibility}. Must be one of: ${VALID_SERVER_VISIBILITIES.join(', ')}`);
    }

    // Validate default_member_role
    if (!VALID_MEMBER_ROLES.includes(this.props.settings.default_member_role)) {
      throw new Error(`Invalid default member role: ${this.props.settings.default_member_role}. Must be one of: ${VALID_MEMBER_ROLES.join(', ')}`);
    }

    // Validate limits
    if (this.props.limits.max_members <= 0) {
      throw new Error('Max members must be greater than 0');
    }
    if (this.props.limits.max_projects < 0) {
      throw new Error('Max projects cannot be negative');
    }
    if (this.props.limits.max_channels < 0) {
      throw new Error('Max channels cannot be negative');
    }
    if (this.props.limits.max_agents < 0) {
      throw new Error('Max agents cannot be negative');
    }
    if (this.props.limits.max_storage_gb <= 0) {
      throw new Error('Max storage must be greater than 0');
    }
  }

  // --- Getters ---

  get server_id(): string { return this.props.server_id; }
  get name(): string { return this.props.name; }
  get display_name(): string { return this.props.display_name; }
  get description(): string | undefined { return this.props.description; }
  get owner_id(): string { return this.props.owner_id; }
  get status(): ServerStatus { return this.props.status; }
  get visibility(): ServerVisibility { return this.props.visibility; }
  get settings(): ServerSettings { return this.props.settings; }
  get limits(): ServerLimits { return this.props.limits; }
  get created_at(): Date { return this.props.created_at; }
  get updated_at(): Date { return this.props.updated_at; }
  get meta(): ServerEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isActive(): boolean { return this.props.status === 'active'; }
  isSuspended(): boolean { return this.props.status === 'suspended'; }
  isArchived(): boolean { return this.props.status === 'archived'; }

  canAcceptMembers(): boolean { return this.props.status === 'active'; }
  canCreateProjects(): boolean { return this.props.status === 'active'; }

  // --- Visibility checks ---

  isPublic(): boolean { return this.props.visibility === 'public'; }
  isPrivate(): boolean { return this.props.visibility === 'private'; }

  // --- Settings checks ---

  allowsPublicChannels(): boolean { return this.props.settings.allow_public_channels; }
  allowsPrivateChannels(): boolean { return this.props.settings.allow_private_channels; }
  allowsDM(): boolean { return this.props.settings.allow_dm; }
  requiresApproval(): boolean { return this.props.settings.require_approval; }

  // --- Immutable updates ---

  updateStatus(status: ServerStatus): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      status,
      updated_at: new Date(),
    });
  }

  suspend(): ServerEntity {
    if (this.props.status !== 'active') {
      throw new Error('Only active servers can be suspended');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'suspended',
      updated_at: new Date(),
    });
  }

  activate(): ServerEntity {
    if (this.props.status !== 'suspended') {
      throw new Error('Only suspended servers can be activated');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'active',
      updated_at: new Date(),
    });
  }

  archive(): ServerEntity {
    if (this.props.status === 'archived') {
      throw new Error('Server is already archived');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'archived',
      updated_at: new Date(),
    });
  }

  unarchive(): ServerEntity {
    if (this.props.status !== 'archived') {
      throw new Error('Only archived servers can be unarchived');
    }
    return ServerEntity.create({
      ...this.props,
      status: 'active',
      updated_at: new Date(),
    });
  }

  updateName(name: string): ServerEntity {
    if (!name || name.trim() === '') {
      throw new Error('Server name cannot be empty');
    }
    if (name.length > 50) {
      throw new Error('Server name cannot exceed 50 characters');
    }
    return ServerEntity.create({
      ...this.props,
      name: name.trim(),
      updated_at: new Date(),
    });
  }

  updateDisplayName(display_name: string): ServerEntity {
    if (!display_name || display_name.trim() === '') {
      throw new Error('Server display name cannot be empty');
    }
    if (display_name.length > 100) {
      throw new Error('Server display name cannot exceed 100 characters');
    }
    return ServerEntity.create({
      ...this.props,
      display_name: display_name.trim(),
      updated_at: new Date(),
    });
  }

  updateDescription(description: string | undefined): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      description: description?.trim(),
      updated_at: new Date(),
    });
  }

  updateVisibility(visibility: ServerVisibility): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      visibility,
      updated_at: new Date(),
    });
  }

  updateSettings(settings: Partial<ServerSettings>): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      settings: {
        ...this.props.settings,
        ...settings,
      },
      updated_at: new Date(),
    });
  }

  updateLimits(limits: Partial<ServerLimits>): ServerEntity {
    const newLimits = {
      ...this.props.limits,
      ...limits,
    };

    // Validate new limits
    if (newLimits.max_members <= 0) {
      throw new Error('Max members must be greater than 0');
    }
    if (newLimits.max_projects < 0) {
      throw new Error('Max projects cannot be negative');
    }
    if (newLimits.max_channels < 0) {
      throw new Error('Max channels cannot be negative');
    }
    if (newLimits.max_agents < 0) {
      throw new Error('Max agents cannot be negative');
    }
    if (newLimits.max_storage_gb <= 0) {
      throw new Error('Max storage must be greater than 0');
    }

    return ServerEntity.create({
      ...this.props,
      limits: newLimits,
      updated_at: new Date(),
    });
  }

  updateMeta(meta: Partial<ServerEntityProps['meta']>): ServerEntity {
    return ServerEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        ...meta,
      },
      updated_at: new Date(),
    });
  }

  // --- Equality (by ID) ---

  equals(other: ServerEntity): boolean {
    return this.props.server_id === other.props.server_id;
  }

  // --- Serialization ---

  toJSON(): ServerEntityJSON {
    return {
      server_id: this.props.server_id,
      name: this.props.name,
      display_name: this.props.display_name,
      description: this.props.description,
      owner_id: this.props.owner_id,
      status: this.props.status,
      visibility: this.props.visibility,
      settings: this.props.settings,
      limits: this.props.limits,
      created_at: this.props.created_at.toISOString(),
      updated_at: this.props.updated_at.toISOString(),
      meta: this.props.meta,
    };
  }
}
