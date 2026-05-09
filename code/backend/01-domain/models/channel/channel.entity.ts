/**
 * ChannelEntity - 频道实体（聚合根）
 *
 * 频道是消息、任务、对话的容器，支持多种类型（public/private/dm/thread）。
 *
 * 业务规则：
 * - channelId 不能为空
 * - name 不能为空
 * - type 只能是 public | private | dm | thread
 * - public 频道对所有项目成员可见
 * - private 频道需要明确的成员列表
 * - dm 是两人私聊频道
 * - thread 是消息的子对话
 * - Entity 是不可变的（更新返回新实例）
 */

export type ChannelType = 'public' | 'private' | 'dm' | 'thread';
export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberType = 'human' | 'agent';

const VALID_CHANNEL_TYPES: readonly ChannelType[] = ['public', 'private', 'dm', 'thread'];
const VALID_MEMBER_ROLES: readonly MemberRole[] = ['owner', 'admin', 'member'];

export interface ChannelMember {
  readonly memberId: string;
  readonly memberType: MemberType;
  readonly role: MemberRole;
  readonly joinedAt: Date;
}

export interface ConversationRef {
  readonly conversationId: string;
  readonly agentId: string;
  readonly status: 'active' | 'archived';
  readonly messageCount: number;
}

export interface CommunicationRules {
  readonly allowMentions: boolean;
  readonly allowThreads: boolean;
  readonly allowAttachments: boolean;
  readonly maxMessageLength: number;
  readonly rateLimit?: {
    readonly messagesPerMinute: number;
    readonly enabled: boolean;
  };
}

export interface ChannelWorkspace {
  readonly root: string;
  readonly sharedFiles: string;
  readonly attachments: string;
}

export interface ChannelEntityProps {
  readonly channelId: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly icon?: string;
  readonly type: ChannelType;
  readonly parentChannelId?: string;
  readonly projectId: string;
  readonly members: readonly ChannelMember[];
  readonly agentPool: readonly string[];
  readonly taskPool: readonly string[];
  readonly conversationPool: readonly ConversationRef[];
  readonly communicationRules: CommunicationRules;
  readonly workspace: ChannelWorkspace;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly messageCount: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly createdBy: {
      readonly id: string;
      readonly type: MemberType;
    };
  };
}

export interface ChannelEntityJSON {
  readonly channel_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly type: ChannelType;
  readonly parent_channel_id?: string;
  readonly project_id: string;
  readonly members: readonly {
    readonly member_id: string;
    readonly member_type: MemberType;
    readonly role: MemberRole;
    readonly joined_at: string;
  }[];
  readonly agent_pool: readonly string[];
  readonly task_pool: readonly string[];
  readonly conversation_pool: readonly {
    readonly conversation_id: string;
    readonly agent_id: string;
    readonly status: 'active' | 'archived';
    readonly message_count: number;
  }[];
  readonly communication_rules: {
    readonly allow_mentions: boolean;
    readonly allow_threads: boolean;
    readonly allow_attachments: boolean;
    readonly max_message_length: number;
    readonly rate_limit?: {
      readonly messages_per_minute: number;
      readonly enabled: boolean;
    };
  };
  readonly workspace: {
    readonly root: string;
    readonly shared_files: string;
    readonly attachments: string;
  };
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly message_count: number;
    readonly created_at: string;
    readonly updated_at: string;
    readonly created_by: {
      readonly id: string;
      readonly type: MemberType;
    };
  };
}

export class ChannelEntity {
  private constructor(private readonly props: ChannelEntityProps) {
    this.validate();
  }

  static create(props: ChannelEntityProps): ChannelEntity {
    return new ChannelEntity(props);
  }

  static fromJSON(json: ChannelEntityJSON): ChannelEntity {
    return ChannelEntity.create({
      channelId: json.channel_id,
      name: json.name,
      displayName: json.display_name,
      description: json.description,
      icon: json.icon,
      type: json.type,
      parentChannelId: json.parent_channel_id,
      projectId: json.project_id,
      members: json.members.map(m => ({
        memberId: m.member_id,
        memberType: m.member_type,
        role: m.role,
        joinedAt: new Date(m.joined_at),
      })),
      agentPool: json.agent_pool,
      taskPool: json.task_pool,
      conversationPool: json.conversation_pool.map(c => ({
        conversationId: c.conversation_id,
        agentId: c.agent_id,
        status: c.status,
        messageCount: c.message_count,
      })),
      communicationRules: {
        allowMentions: json.communication_rules.allow_mentions,
        allowThreads: json.communication_rules.allow_threads,
        allowAttachments: json.communication_rules.allow_attachments,
        maxMessageLength: json.communication_rules.max_message_length,
        rateLimit: json.communication_rules.rate_limit ? {
          messagesPerMinute: json.communication_rules.rate_limit.messages_per_minute,
          enabled: json.communication_rules.rate_limit.enabled,
        } : undefined,
      },
      workspace: {
        root: json.workspace.root,
        sharedFiles: json.workspace.shared_files,
        attachments: json.workspace.attachments,
      },
      meta: {
        tags: json.meta.tags,
        category: json.meta.category,
        messageCount: json.meta.message_count,
        createdAt: new Date(json.meta.created_at),
        updatedAt: new Date(json.meta.updated_at),
        createdBy: json.meta.created_by,
      },
    });
  }

  private validate(): void {
    if (!this.props.channelId || this.props.channelId.trim() === '') {
      throw new Error('Channel ID cannot be empty');
    }
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error('Channel name cannot be empty');
    }
    if (!VALID_CHANNEL_TYPES.includes(this.props.type)) {
      throw new Error(`Invalid channel type: ${this.props.type}. Must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`);
    }
    if (!this.props.projectId || this.props.projectId.trim() === '') {
      throw new Error('Project ID cannot be empty');
    }

    // Validate members
    for (const member of this.props.members) {
      if (!VALID_MEMBER_ROLES.includes(member.role)) {
        throw new Error(`Invalid member role: ${member.role}`);
      }
    }

    // DM channels must have exactly 2 members
    if (this.props.type === 'dm' && this.props.members.length !== 2) {
      throw new Error('DM channels must have exactly 2 members');
    }

    // Thread channels must have a parent
    if (this.props.type === 'thread' && !this.props.parentChannelId) {
      throw new Error('Thread channels must have a parent channel');
    }
  }

  // --- Getters ---

  get channelId(): string { return this.props.channelId; }
  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string | undefined { return this.props.description; }
  get icon(): string | undefined { return this.props.icon; }
  get type(): ChannelType { return this.props.type; }
  get parentChannelId(): string | undefined { return this.props.parentChannelId; }
  get projectId(): string { return this.props.projectId; }
  get members(): readonly ChannelMember[] { return this.props.members; }
  get agentPool(): readonly string[] { return this.props.agentPool; }
  get taskPool(): readonly string[] { return this.props.taskPool; }
  get conversationPool(): readonly ConversationRef[] { return this.props.conversationPool; }
  get communicationRules(): CommunicationRules { return this.props.communicationRules; }
  get workspace(): ChannelWorkspace { return this.props.workspace; }
  get meta(): ChannelEntityProps['meta'] { return this.props.meta; }

  // --- Type checks ---

  isPublic(): boolean { return this.props.type === 'public'; }
  isPrivate(): boolean { return this.props.type === 'private'; }
  isDM(): boolean { return this.props.type === 'dm'; }
  isThread(): boolean { return this.props.type === 'thread'; }

  // --- Member operations ---

  hasMember(memberId: string): boolean {
    return this.props.members.some(m => m.memberId === memberId);
  }

  getMember(memberId: string): ChannelMember | undefined {
    return this.props.members.find(m => m.memberId === memberId);
  }

  getMemberRole(memberId: string): MemberRole | undefined {
    return this.getMember(memberId)?.role;
  }

  isOwner(memberId: string): boolean {
    return this.getMemberRole(memberId) === 'owner';
  }

  isAdmin(memberId: string): boolean {
    return this.getMemberRole(memberId) === 'admin';
  }

  hasAdminPrivileges(memberId: string): boolean {
    const role = this.getMemberRole(memberId);
    return role === 'owner' || role === 'admin';
  }

  // --- Agent pool operations ---

  hasAgent(agentId: string): boolean {
    return this.props.agentPool.includes(agentId);
  }

  // --- Task pool operations ---

  hasTask(taskId: string): boolean {
    return this.props.taskPool.includes(taskId);
  }

  // --- Conversation pool operations ---

  getConversation(conversationId: string): ConversationRef | undefined {
    return this.props.conversationPool.find(c => c.conversationId === conversationId);
  }

  getActiveConversations(): readonly ConversationRef[] {
    return this.props.conversationPool.filter(c => c.status === 'active');
  }

  // --- Immutable updates ---

  addMember(member: ChannelMember): ChannelEntity {
    if (this.hasMember(member.memberId)) {
      throw new Error(`Member ${member.memberId} already exists in channel`);
    }
    return ChannelEntity.create({
      ...this.props,
      members: [...this.props.members, member],
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  removeMember(memberId: string): ChannelEntity {
    if (!this.hasMember(memberId)) {
      throw new Error(`Member ${memberId} not found in channel`);
    }
    return ChannelEntity.create({
      ...this.props,
      members: this.props.members.filter(m => m.memberId !== memberId),
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  updateMemberRole(memberId: string, role: MemberRole): ChannelEntity {
    const member = this.getMember(memberId);
    if (!member) {
      throw new Error(`Member ${memberId} not found in channel`);
    }
    return ChannelEntity.create({
      ...this.props,
      members: this.props.members.map(m =>
        m.memberId === memberId ? { ...m, role } : m
      ),
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  addAgent(agentId: string): ChannelEntity {
    if (this.hasAgent(agentId)) {
      throw new Error(`Agent ${agentId} already in pool`);
    }
    return ChannelEntity.create({
      ...this.props,
      agentPool: [...this.props.agentPool, agentId],
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  removeAgent(agentId: string): ChannelEntity {
    if (!this.hasAgent(agentId)) {
      throw new Error(`Agent ${agentId} not found in pool`);
    }
    return ChannelEntity.create({
      ...this.props,
      agentPool: this.props.agentPool.filter(id => id !== agentId),
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  addTask(taskId: string): ChannelEntity {
    if (this.hasTask(taskId)) {
      throw new Error(`Task ${taskId} already in pool`);
    }
    return ChannelEntity.create({
      ...this.props,
      taskPool: [...this.props.taskPool, taskId],
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  removeTask(taskId: string): ChannelEntity {
    if (!this.hasTask(taskId)) {
      throw new Error(`Task ${taskId} not found in pool`);
    }
    return ChannelEntity.create({
      ...this.props,
      taskPool: this.props.taskPool.filter(id => id !== taskId),
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  addConversation(conversation: ConversationRef): ChannelEntity {
    if (this.getConversation(conversation.conversationId)) {
      throw new Error(`Conversation ${conversation.conversationId} already exists`);
    }
    return ChannelEntity.create({
      ...this.props,
      conversationPool: [...this.props.conversationPool, conversation],
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  updateConversationStatus(conversationId: string, status: 'active' | 'archived'): ChannelEntity {
    const conversation = this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }
    return ChannelEntity.create({
      ...this.props,
      conversationPool: this.props.conversationPool.map(c =>
        c.conversationId === conversationId ? { ...c, status } : c
      ),
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  incrementMessageCount(): ChannelEntity {
    return ChannelEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        messageCount: this.props.meta.messageCount + 1,
        updatedAt: new Date(),
      },
    });
  }

  updateDisplayName(displayName: string): ChannelEntity {
    return ChannelEntity.create({
      ...this.props,
      displayName,
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  updateDescription(description: string): ChannelEntity {
    return ChannelEntity.create({
      ...this.props,
      description,
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  // --- Equality (by ID) ---

  equals(other: ChannelEntity): boolean {
    return this.props.channelId === other.props.channelId;
  }

  // --- Serialization ---

  toJSON(): ChannelEntityJSON {
    return {
      channel_id: this.props.channelId,
      name: this.props.name,
      display_name: this.props.displayName,
      description: this.props.description,
      icon: this.props.icon,
      type: this.props.type,
      parent_channel_id: this.props.parentChannelId,
      project_id: this.props.projectId,
      members: this.props.members.map(m => ({
        member_id: m.memberId,
        member_type: m.memberType,
        role: m.role,
        joined_at: m.joinedAt.toISOString(),
      })),
      agent_pool: this.props.agentPool,
      task_pool: this.props.taskPool,
      conversation_pool: this.props.conversationPool.map(c => ({
        conversation_id: c.conversationId,
        agent_id: c.agentId,
        status: c.status,
        message_count: c.messageCount,
      })),
      communication_rules: {
        allow_mentions: this.props.communicationRules.allowMentions,
        allow_threads: this.props.communicationRules.allowThreads,
        allow_attachments: this.props.communicationRules.allowAttachments,
        max_message_length: this.props.communicationRules.maxMessageLength,
        rate_limit: this.props.communicationRules.rateLimit ? {
          messages_per_minute: this.props.communicationRules.rateLimit.messagesPerMinute,
          enabled: this.props.communicationRules.rateLimit.enabled,
        } : undefined,
      },
      workspace: {
        root: this.props.workspace.root,
        shared_files: this.props.workspace.sharedFiles,
        attachments: this.props.workspace.attachments,
      },
      meta: {
        tags: this.props.meta.tags,
        category: this.props.meta.category,
        message_count: this.props.meta.messageCount,
        created_at: this.props.meta.createdAt.toISOString(),
        updated_at: this.props.meta.updatedAt.toISOString(),
        created_by: this.props.meta.createdBy,
      },
    };
  }
}
