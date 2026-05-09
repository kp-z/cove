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

export type MemberRole = 'owner' | 'admin' | 'member' | 'guest';
export type MemberStatus = 'joined' | 'active' | 'left' | 'banned';
export type OnlineStatus = 'online' | 'offline' | 'away';
export type MemberType = 'human' | 'agent';

const VALID_MEMBER_ROLES: readonly MemberRole[] = ['owner', 'admin', 'member', 'guest'];
const VALID_MEMBER_STATUSES: readonly MemberStatus[] = ['joined', 'active', 'left', 'banned'];
const VALID_ONLINE_STATUSES: readonly OnlineStatus[] = ['online', 'offline', 'away'];

export interface MemberStatistics {
  readonly messageCount: number;
  readonly reactionCount: number;
  readonly mentionCount: number;
  readonly threadCount: number;
}

export interface NotificationSettings {
  readonly enabled: boolean;
  readonly mentionOnly: boolean;
  readonly muteUntil?: Date;
}

export interface MemberEntityProps {
  readonly memberId: string;
  readonly channelId: string;
  readonly userId: string;
  readonly userType: MemberType;
  readonly role: MemberRole;
  readonly permissions: readonly string[];
  readonly status: MemberStatus;
  readonly onlineStatus: OnlineStatus;
  readonly joinedAt: Date;
  readonly lastActiveAt: Date;
  readonly leftAt?: Date;
  readonly bannedAt?: Date;
  readonly statistics: MemberStatistics;
  readonly notificationSettings: NotificationSettings;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly invitedBy?: {
      readonly id: string;
      readonly type: MemberType;
    };
    readonly notes?: string;
  };
}

export interface MemberEntityJSON {
  readonly member_id: string;
  readonly channel_id: string;
  readonly user_id: string;
  readonly user_type: MemberType;
  readonly role: MemberRole;
  readonly permissions: readonly string[];
  readonly status: MemberStatus;
  readonly online_status: OnlineStatus;
  readonly joined_at: string;
  readonly last_active_at: string;
  readonly left_at?: string;
  readonly banned_at?: string;
  readonly statistics: {
    readonly message_count: number;
    readonly reaction_count: number;
    readonly mention_count: number;
    readonly thread_count: number;
  };
  readonly notification_settings: {
    readonly enabled: boolean;
    readonly mention_only: boolean;
    readonly mute_until?: string;
  };
  readonly meta: {
    readonly tags?: readonly string[];
    readonly invited_by?: {
      readonly id: string;
      readonly type: MemberType;
    };
    readonly notes?: string;
  };
}

export class MemberEntity {
  private constructor(private readonly props: MemberEntityProps) {
    this.validate();
  }

  static create(props: MemberEntityProps): MemberEntity {
    return new MemberEntity(props);
  }

  static fromJSON(json: MemberEntityJSON): MemberEntity {
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

  private validate(): void {
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

  get memberId(): string { return this.props.memberId; }
  get channelId(): string { return this.props.channelId; }
  get userId(): string { return this.props.userId; }
  get userType(): MemberType { return this.props.userType; }
  get role(): MemberRole { return this.props.role; }
  get permissions(): readonly string[] { return this.props.permissions; }
  get status(): MemberStatus { return this.props.status; }
  get onlineStatus(): OnlineStatus { return this.props.onlineStatus; }
  get joinedAt(): Date { return this.props.joinedAt; }
  get lastActiveAt(): Date { return this.props.lastActiveAt; }
  get leftAt(): Date | undefined { return this.props.leftAt; }
  get bannedAt(): Date | undefined { return this.props.bannedAt; }
  get statistics(): MemberStatistics { return this.props.statistics; }
  get notificationSettings(): NotificationSettings { return this.props.notificationSettings; }
  get meta(): MemberEntityProps['meta'] { return this.props.meta; }

  // --- Role checks ---

  isOwner(): boolean { return this.props.role === 'owner'; }
  isAdmin(): boolean { return this.props.role === 'admin'; }
  isMember(): boolean { return this.props.role === 'member'; }
  isGuest(): boolean { return this.props.role === 'guest'; }
  hasAdminPrivileges(): boolean { return this.isOwner() || this.isAdmin(); }

  // --- Status checks ---

  isJoined(): boolean { return this.props.status === 'joined'; }
  isActive(): boolean { return this.props.status === 'active'; }
  hasLeft(): boolean { return this.props.status === 'left'; }
  isBanned(): boolean { return this.props.status === 'banned'; }
  isOnline(): boolean { return this.props.onlineStatus === 'online'; }
  isOffline(): boolean { return this.props.onlineStatus === 'offline'; }
  isAway(): boolean { return this.props.onlineStatus === 'away'; }

  // --- Type checks ---

  isHuman(): boolean { return this.props.userType === 'human'; }
  isAgent(): boolean { return this.props.userType === 'agent'; }

  // --- Permission checks ---

  hasPermission(permission: string): boolean {
    return this.props.permissions.includes(permission);
  }

  canReadMessages(): boolean {
    return this.hasPermission('read:message');
  }

  canWriteMessages(): boolean {
    return this.hasPermission('write:message');
  }

  canManageMembers(): boolean {
    return this.hasPermission('manage:member');
  }

  canManageChannel(): boolean {
    return this.hasPermission('manage:channel');
  }

  // --- Notification checks ---

  isMuted(): boolean {
    if (!this.props.notificationSettings.muteUntil) return false;
    return this.props.notificationSettings.muteUntil > new Date();
  }

  shouldNotify(isMention: boolean): boolean {
    if (!this.props.notificationSettings.enabled) return false;
    if (this.isMuted()) return false;
    if (this.props.notificationSettings.mentionOnly && !isMention) return false;
    return true;
  }

  // --- Immutable updates ---

  updateRole(role: MemberRole): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      role,
    });
  }

  updatePermissions(permissions: readonly string[]): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      permissions,
    });
  }

  addPermission(permission: string): MemberEntity {
    if (this.hasPermission(permission)) return this;
    return MemberEntity.create({
      ...this.props,
      permissions: [...this.props.permissions, permission],
    });
  }

  removePermission(permission: string): MemberEntity {
    if (!this.hasPermission(permission)) return this;
    return MemberEntity.create({
      ...this.props,
      permissions: this.props.permissions.filter(p => p !== permission),
    });
  }

  updateStatus(status: MemberStatus): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      status,
    });
  }

  activate(): MemberEntity {
    if (this.props.status !== 'joined') {
      throw new Error('Only joined members can be activated');
    }
    return MemberEntity.create({
      ...this.props,
      status: 'active',
      lastActiveAt: new Date(),
    });
  }

  leave(): MemberEntity {
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

  ban(): MemberEntity {
    if (this.props.status === 'banned') return this;
    return MemberEntity.create({
      ...this.props,
      status: 'banned',
      bannedAt: new Date(),
      onlineStatus: 'offline',
    });
  }

  unban(): MemberEntity {
    if (this.props.status !== 'banned') {
      throw new Error('Only banned members can be unbanned');
    }
    return MemberEntity.create({
      ...this.props,
      status: 'joined',
      bannedAt: undefined,
    });
  }

  updateOnlineStatus(onlineStatus: OnlineStatus): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      onlineStatus,
      lastActiveAt: onlineStatus === 'online' ? new Date() : this.props.lastActiveAt,
    });
  }

  goOnline(): MemberEntity {
    return this.updateOnlineStatus('online');
  }

  goOffline(): MemberEntity {
    return this.updateOnlineStatus('offline');
  }

  goAway(): MemberEntity {
    return this.updateOnlineStatus('away');
  }

  updateLastActive(): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      lastActiveAt: new Date(),
    });
  }

  incrementMessageCount(): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        messageCount: this.props.statistics.messageCount + 1,
      },
      lastActiveAt: new Date(),
    });
  }

  incrementReactionCount(): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        reactionCount: this.props.statistics.reactionCount + 1,
      },
      lastActiveAt: new Date(),
    });
  }

  incrementMentionCount(): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        mentionCount: this.props.statistics.mentionCount + 1,
      },
    });
  }

  incrementThreadCount(): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        threadCount: this.props.statistics.threadCount + 1,
      },
      lastActiveAt: new Date(),
    });
  }

  updateNotificationSettings(settings: NotificationSettings): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      notificationSettings: settings,
    });
  }

  mute(until?: Date): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      notificationSettings: {
        ...this.props.notificationSettings,
        muteUntil: until,
      },
    });
  }

  unmute(): MemberEntity {
    return MemberEntity.create({
      ...this.props,
      notificationSettings: {
        ...this.props.notificationSettings,
        muteUntil: undefined,
      },
    });
  }

  // --- Equality (by ID) ---

  equals(other: MemberEntity): boolean {
    return this.props.memberId === other.props.memberId;
  }

  // --- Serialization ---

  toJSON(): MemberEntityJSON {
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
