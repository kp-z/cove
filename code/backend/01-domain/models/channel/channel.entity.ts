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

import {
  ChannelType, ChannelStatus, MemberRole, MemberType,
  VALID_CHANNEL_TYPES, VALID_CHANNEL_STATUSES, VALID_MEMBER_ROLES,
  ChannelMember, ConversationRef, CommunicationRules, ChannelWorkspace,
  ChannelEntityProps, ChannelEntityJSON,
} from './channel.types';

export * from './channel.types';

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
      status: json.status,
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
        maxMembers: json.communication_rules.max_members,
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
    if (!VALID_CHANNEL_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid channel status: ${this.props.status}. Must be one of: ${VALID_CHANNEL_STATUSES.join(', ')}`);
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
  }

  // --- Getters ---

  get channelId(): string { return this.props.channelId; }
  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string | undefined { return this.props.description; }
  get icon(): string | undefined { return this.props.icon; }
  get type(): ChannelType { return this.props.type; }
  get status(): ChannelStatus { return this.props.status; }
  get parentChannelId(): string | undefined { return this.props.parentChannelId; }
  get projectId(): string | undefined { return this.props.projectId; }
  get members(): readonly ChannelMember[] { return this.props.members; }
  get agentPool(): readonly string[] { return this.props.agentPool; }
  get taskPool(): readonly string[] { return this.props.taskPool; }
  get conversationPool(): readonly ConversationRef[] { return this.props.conversationPool; }
  get communicationRules(): CommunicationRules { return this.props.communicationRules; }
  get workspace(): ChannelWorkspace { return this.props.workspace; }
  get meta(): ChannelEntityProps['meta'] { return this.props.meta; }

  // --- Convenience getters ---

  get memberIds(): readonly string[] {
    return this.props.members.map(m => m.memberId);
  }

  // --- Type checks ---

  isPublic(): boolean { return this.props.type === 'public'; }
  isPrivate(): boolean { return this.props.type === 'private'; }
  isDM(): boolean { return this.props.type === 'dm'; }

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
    const maxMembers = this.props.communicationRules.maxMembers ?? 1000;
    if (this.props.members.length >= maxMembers) {
      throw new Error(`Channel has reached maximum member limit of ${maxMembers}`);
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

  archive(): ChannelEntity {
    if (this.props.status === 'archived') {
      throw new Error('Channel is already archived');
    }
    return ChannelEntity.create({
      ...this.props,
      status: 'archived',
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  activate(): ChannelEntity {
    if (this.props.status === 'active') {
      throw new Error('Channel is already active');
    }
    return ChannelEntity.create({
      ...this.props,
      status: 'active',
      meta: {
        ...this.props.meta,
        updatedAt: new Date(),
      },
    });
  }

  // --- Permission checks ---

  canSendMessage(senderId: string, recentMessageCount?: number): { allowed: boolean; reason?: string } {
    if (this.props.status !== 'active') {
      return { allowed: false, reason: 'Channel is not active' };
    }
    if (!this.hasMember(senderId)) {
      return { allowed: false, reason: 'Sender is not a member of this channel' };
    }
    const rateLimit = this.props.communicationRules.rateLimit;
    if (rateLimit?.enabled && recentMessageCount !== undefined) {
      if (recentMessageCount >= rateLimit.messagesPerMinute) {
        return { allowed: false, reason: 'Rate limit exceeded' };
      }
    }
    return { allowed: true };
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
      status: this.props.status,
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
        max_members: this.props.communicationRules.maxMembers,
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
