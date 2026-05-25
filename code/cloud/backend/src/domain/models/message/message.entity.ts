/**
 * MessageEntity - 消息实体（聚合根）
 *
 * 消息是频道中的基本通信单元，支持文本、附件、@mention、反应等功能。
 *
 * 业务规则：
 * - messageId 不能为空
 * - senderId 不能为空
 * - channelId 不能为空
 * - content 不能为空（除非有附件）
 * - senderType 只能是 human | agent | system
 * - status 只能是 draft | sending | sent | failed | deleted
 * - Entity 是不可变的（更新返回新实例）
 */


import {
  SenderType, MessageStatus, ContentType, ContentFormat,
  VALID_SENDER_TYPES, VALID_MESSAGE_STATUSES, VALID_CONTENT_TYPES, VALID_CONTENT_FORMATS,
  MessageAttachment, MessageMention, MessageReference, MessageReaction, MessageEditHistory,
  MessageEntityProps, MessageEntityJSON,
} from './message.types';

export * from './message.types';

export class MessageEntity {
  private constructor(private readonly props: MessageEntityProps) {
    this.validate();
  }

  static create(props: MessageEntityProps): MessageEntity {
    return new MessageEntity(props);
  }

  static fromJSON(json: MessageEntityJSON): MessageEntity {
    return MessageEntity.create({
      messageId: json.message_id,
      realmId: json.realm_id,
      msgShortId: json.msg_short_id,
      senderId: json.sender_id,
      senderType: json.sender_type,
      senderName: json.sender_name,
      channelId: json.channel_id,
      channelName: json.channel_name,
      threadId: json.thread_id,
      isThreadRoot: json.is_thread_root,
      content: json.content,
      contentType: json.content_type,
      contentFormat: json.content_format,
      attachments: json.attachments.map(a => ({
        attachmentId: a.attachment_id,
        fileName: a.file_name,
        fileType: a.file_type,
        fileSize: a.file_size,
        fileUrl: a.file_url,
        thumbnailUrl: a.thumbnail_url,
      })),
      mentions: json.mentions.map(m => ({
        mentionType: m.mention_type,
        mentionId: m.mention_id,
        mentionName: m.mention_name,
        mentionPosition: m.mention_position,
      })),
      references: json.references.map(r => ({
        refType: r.ref_type,
        refId: r.ref_id,
        refTitle: r.ref_title,
      })),
      status: json.status,
      isEdited: json.is_edited,
      editHistory: json.edit_history.map(e => ({
        editedAt: new Date(e.edited_at),
        previousContent: e.previous_content,
        editedBy: e.edited_by,
      })),
      reactions: json.reactions.map(r => ({
        emoji: r.emoji,
        userIds: r.user_ids,
        count: r.count,
      })),
      agentExecutionMetadata: json.agent_execution_metadata ? {
        thinking: json.agent_execution_metadata.thinking,
        tool_logs: json.agent_execution_metadata.tool_logs?.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          tool_name: log.tool_name,
          action: log.action,
          params: log.params,
          status: log.status,
          duration: log.duration,
          result: log.result,
          meta: log.meta ? {
            file_count: log.meta.file_count,
            lines_changed: log.meta.lines_changed,
            exit_code: log.meta.exit_code,
          } : undefined,
        })),
        usage: json.agent_execution_metadata.usage ? {
          input_tokens: json.agent_execution_metadata.usage.input_tokens,
          output_tokens: json.agent_execution_metadata.usage.output_tokens,
          total_tokens: json.agent_execution_metadata.usage.total_tokens,
          cache: json.agent_execution_metadata.usage.cache ? {
            creation_tokens: json.agent_execution_metadata.usage.cache.creation_tokens,
            read_tokens: json.agent_execution_metadata.usage.cache.read_tokens,
            hit_rate: json.agent_execution_metadata.usage.cache.hit_rate,
          } : undefined,
          cost: json.agent_execution_metadata.usage.cost ? {
            input_cost: json.agent_execution_metadata.usage.cost.input_cost,
            output_cost: json.agent_execution_metadata.usage.cost.output_cost,
            cache_cost: json.agent_execution_metadata.usage.cost.cache_cost,
            total_cost: json.agent_execution_metadata.usage.cost.total_cost,
          } : undefined,
          model: json.agent_execution_metadata.usage.model,
          latency: json.agent_execution_metadata.usage.latency ? {
            first_token_ms: json.agent_execution_metadata.usage.latency.first_token_ms,
            total_ms: json.agent_execution_metadata.usage.latency.total_ms,
            tokens_per_second: json.agent_execution_metadata.usage.latency.tokens_per_second,
          } : undefined,
        } : undefined,
        execution_mode: json.agent_execution_metadata.execution_mode,
        streaming_status: json.agent_execution_metadata.streaming_status,
        sequence: json.agent_execution_metadata.sequence,
        started_at: json.agent_execution_metadata.started_at,
        completed_at: json.agent_execution_metadata.completed_at,
      } : undefined,
      createdAt: new Date(json.created_at),
      updatedAt: new Date(json.updated_at),
      deletedAt: json.deleted_at ? new Date(json.deleted_at) : undefined,
      meta: {
        client: json.meta.client,
        isPinned: json.meta.is_pinned,
        isImportant: json.meta.is_important,
      },
    });
  }

  private validate(): void {
    if (!this.props.messageId || this.props.messageId.trim() === '') {
      throw new Error('Message ID cannot be empty');
    }
    if (!this.props.msgShortId || this.props.msgShortId.trim() === '') {
      throw new Error('Message short ID cannot be empty');
    }
    if (!this.props.senderId || this.props.senderId.trim() === '') {
      throw new Error('Sender ID cannot be empty');
    }
    if (!VALID_SENDER_TYPES.includes(this.props.senderType)) {
      throw new Error(`Invalid sender type: ${this.props.senderType}. Must be one of: ${VALID_SENDER_TYPES.join(', ')}`);
    }
    if (!this.props.channelId || this.props.channelId.trim() === '') {
      throw new Error('Channel ID cannot be empty');
    }
    if (!VALID_MESSAGE_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid message status: ${this.props.status}. Must be one of: ${VALID_MESSAGE_STATUSES.join(', ')}`);
    }
    if (!VALID_CONTENT_TYPES.includes(this.props.contentType)) {
      throw new Error(`Invalid content type: ${this.props.contentType}. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`);
    }
    if (!VALID_CONTENT_FORMATS.includes(this.props.contentFormat)) {
      throw new Error(`Invalid content format: ${this.props.contentFormat}. Must be one of: ${VALID_CONTENT_FORMATS.join(', ')}`);
    }

    // Content cannot be empty unless there are attachments
    if (!this.props.content && this.props.attachments.length === 0) {
      throw new Error('Message must have either content or attachments');
    }
  }

  // --- Getters ---

  get messageId(): string { return this.props.messageId; }
  get realmId(): string { return this.props.realmId; }
  get msgShortId(): string { return this.props.msgShortId; }
  get senderId(): string { return this.props.senderId; }
  get senderType(): SenderType { return this.props.senderType; }
  get senderName(): string { return this.props.senderName; }
  get channelId(): string { return this.props.channelId; }
  get channelName(): string { return this.props.channelName; }
  get threadId(): string | undefined { return this.props.threadId; }
  get isThreadRoot(): boolean { return this.props.isThreadRoot; }
  get content(): string { return this.props.content; }
  get contentType(): ContentType { return this.props.contentType; }
  get contentFormat(): ContentFormat { return this.props.contentFormat; }
  get attachments(): readonly MessageAttachment[] { return this.props.attachments; }
  get mentions(): readonly MessageMention[] { return this.props.mentions; }
  get references(): readonly MessageReference[] { return this.props.references; }
  get status(): MessageStatus { return this.props.status; }
  get isEdited(): boolean { return this.props.isEdited; }
  get editHistory(): readonly MessageEditHistory[] { return this.props.editHistory; }
  get reactions(): readonly MessageReaction[] { return this.props.reactions; }
  get agentExecutionMetadata(): MessageEntityProps['agentExecutionMetadata'] { return this.props.agentExecutionMetadata; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get deletedAt(): Date | undefined { return this.props.deletedAt; }
  get meta(): MessageEntityProps['meta'] { return this.props.meta; }

  // --- Type checks ---

  isFromHuman(): boolean { return this.props.senderType === 'human'; }
  isFromAgent(): boolean { return this.props.senderType === 'agent'; }
  isFromSystem(): boolean { return this.props.senderType === 'system'; }
  isInThread(): boolean { return !!this.props.threadId; }
  isDraft(): boolean { return this.props.status === 'draft'; }
  isSent(): boolean { return this.props.status === 'sent'; }
  isDeleted(): boolean { return this.props.status === 'deleted'; }
  hasMentions(): boolean { return this.props.mentions.length > 0; }
  hasAttachments(): boolean { return this.props.attachments.length > 0; }
  hasReactions(): boolean { return this.props.reactions.length > 0; }

  // --- Mention operations ---

  mentionsUser(userId: string): boolean {
    return this.props.mentions.some(m => m.mentionType === 'user' && m.mentionId === userId);
  }

  mentionsAgent(agentId: string): boolean {
    return this.props.mentions.some(m => m.mentionType === 'agent' && m.mentionId === agentId);
  }

  mentionsChannel(channelId: string): boolean {
    return this.props.mentions.some(m => m.mentionType === 'channel' && m.mentionId === channelId);
  }

  // --- Reaction operations ---

  getReaction(emoji: string): MessageReaction | undefined {
    return this.props.reactions.find(r => r.emoji === emoji);
  }

  hasReaction(emoji: string): boolean {
    return !!this.getReaction(emoji);
  }

  userHasReacted(userId: string, emoji: string): boolean {
    const reaction = this.getReaction(emoji);
    return reaction ? reaction.userIds.includes(userId) : false;
  }

  // --- Immutable updates ---

  updateContent(content: string, editedBy: string): MessageEntity {
    const editHistory: MessageEditHistory = {
      editedAt: new Date(),
      previousContent: this.props.content,
      editedBy,
    };

    return MessageEntity.create({
      ...this.props,
      content,
      isEdited: true,
      editHistory: [...this.props.editHistory, editHistory],
      updatedAt: new Date(),
    });
  }

  updateStatus(status: MessageStatus): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      status,
      updatedAt: new Date(),
    });
  }

  markAsDeleted(): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      status: 'deleted',
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  addReaction(emoji: string, userId: string): MessageEntity {
    const existingReaction = this.getReaction(emoji);

    if (existingReaction) {
      // User already reacted with this emoji
      if (existingReaction.userIds.includes(userId)) {
        return this;
      }

      // Add user to existing reaction
      return MessageEntity.create({
        ...this.props,
        reactions: this.props.reactions.map(r =>
          r.emoji === emoji
            ? { ...r, userIds: [...r.userIds, userId], count: r.count + 1 }
            : r
        ),
        updatedAt: new Date(),
      });
    }

    // Create new reaction
    return MessageEntity.create({
      ...this.props,
      reactions: [
        ...this.props.reactions,
        { emoji, userIds: [userId], count: 1 },
      ],
      updatedAt: new Date(),
    });
  }

  removeReaction(emoji: string, userId: string): MessageEntity {
    const existingReaction = this.getReaction(emoji);

    if (!existingReaction || !existingReaction.userIds.includes(userId)) {
      return this;
    }

    const newUserIds = existingReaction.userIds.filter(id => id !== userId);

    // Remove reaction entirely if no users left
    if (newUserIds.length === 0) {
      return MessageEntity.create({
        ...this.props,
        reactions: this.props.reactions.filter(r => r.emoji !== emoji),
        updatedAt: new Date(),
      });
    }

    // Update reaction with remaining users
    return MessageEntity.create({
      ...this.props,
      reactions: this.props.reactions.map(r =>
        r.emoji === emoji
          ? { ...r, userIds: newUserIds, count: newUserIds.length }
          : r
      ),
      updatedAt: new Date(),
    });
  }

  pin(): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        isPinned: true,
      },
      updatedAt: new Date(),
    });
  }

  unpin(): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        isPinned: false,
      },
      updatedAt: new Date(),
    });
  }

  markAsImportant(): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        isImportant: true,
      },
      updatedAt: new Date(),
    });
  }

  unmarkAsImportant(): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        isImportant: false,
      },
      updatedAt: new Date(),
    });
  }

  // --- Agent Execution Metadata Operations ---

  /**
   * 初始化 Agent 执行元数据
   */
  initAgentExecution(executionMode: 'API' | 'CLI' | 'SDK'): MessageEntity {
    return MessageEntity.create({
      ...this.props,
      agentExecutionMetadata: {
        thinking: '',
        tool_logs: [],
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
        },
        streaming_status: 'thinking',
        execution_mode: executionMode,
        sequence: 0,
        started_at: new Date().toISOString(),
      },
      updatedAt: new Date(),
    });
  }

  /**
   * 追加 thinking 内容（增量更新）
   */
  appendThinking(thinkingChunk: string): MessageEntity {
    if (!this.props.agentExecutionMetadata) {
      throw new Error('Agent execution metadata not initialized. Call initAgentExecution() first.');
    }

    const currentThinking = this.props.agentExecutionMetadata.thinking || '';
    const currentSequence = this.props.agentExecutionMetadata.sequence || 0;

    return MessageEntity.create({
      ...this.props,
      agentExecutionMetadata: {
        ...this.props.agentExecutionMetadata,
        thinking: currentThinking + thinkingChunk,
        sequence: currentSequence + 1,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * 添加工具调用记录
   */
  addToolLog(toolLog: {
    id: string;
    tool_name: string;
    action: string;
    params?: Record<string, unknown>;
    status: 'pending' | 'running' | 'success' | 'error';
    duration?: number;
    result?: {
      success?: string;
      error?: string;
      output?: string;
    };
    meta?: {
      file_count?: number;
      lines_changed?: number;
      exit_code?: number;
    };
  }): MessageEntity {
    if (!this.props.agentExecutionMetadata) {
      throw new Error('Agent execution metadata not initialized. Call initAgentExecution() first.');
    }

    const currentLogs = this.props.agentExecutionMetadata.tool_logs || [];
    const currentSequence = this.props.agentExecutionMetadata.sequence || 0;

    return MessageEntity.create({
      ...this.props,
      agentExecutionMetadata: {
        ...this.props.agentExecutionMetadata,
        tool_logs: [
          ...currentLogs,
          {
            ...toolLog,
            timestamp: new Date().toISOString(),
          },
        ],
        sequence: currentSequence + 1,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * 更新 token 使用统计
   */
  updateUsage(usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cache?: {
      creation_tokens: number;
      read_tokens: number;
      hit_rate?: number;
    };
    cost?: {
      input_cost: number;
      output_cost: number;
      cache_cost: number;
      total_cost: number;
    };
    model?: string;
    latency?: {
      first_token_ms?: number;
      total_ms?: number;
      tokens_per_second?: number;
    };
  }): MessageEntity {
    if (!this.props.agentExecutionMetadata) {
      throw new Error('Agent execution metadata not initialized. Call initAgentExecution() first.');
    }

    const currentSequence = this.props.agentExecutionMetadata.sequence || 0;

    return MessageEntity.create({
      ...this.props,
      agentExecutionMetadata: {
        ...this.props.agentExecutionMetadata,
        usage,
        sequence: currentSequence + 1,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * 更新流式状态
   */
  updateStreamingStatus(status: 'thinking' | 'tool_use' | 'responding' | 'completed'): MessageEntity {
    if (!this.props.agentExecutionMetadata) {
      throw new Error('Agent execution metadata not initialized. Call initAgentExecution() first.');
    }

    const currentSequence = this.props.agentExecutionMetadata.sequence || 0;
    const completedAt = (status === 'completed')
      ? new Date().toISOString()
      : this.props.agentExecutionMetadata.completed_at;

    return MessageEntity.create({
      ...this.props,
      agentExecutionMetadata: {
        ...this.props.agentExecutionMetadata,
        streaming_status: status,
        completed_at: completedAt,
        sequence: currentSequence + 1,
      },
      updatedAt: new Date(),
    });
  }

  /**
   * 获取当前序列号
   */
  getCurrentSequence(): number {
    return this.props.agentExecutionMetadata?.sequence ?? 0;
  }

  /**
   * 是否正在流式执行
   */
  isStreaming(): boolean {
    if (!this.props.agentExecutionMetadata) {
      return false;
    }
    return this.props.agentExecutionMetadata.streaming_status !== 'completed';
  }

  /**
   * 是否有 Agent 执行元数据
   */
  hasAgentExecutionMetadata(): boolean {
    return !!this.props.agentExecutionMetadata;
  }

  // --- Equality (by ID) ---

  equals(other: MessageEntity): boolean {
    return this.props.messageId === other.props.messageId;
  }

  // --- Serialization ---

  toJSON(): MessageEntityJSON {
    return {
      message_id: this.props.messageId,
      realm_id: this.props.realmId,
      msg_short_id: this.props.msgShortId,
      sender_id: this.props.senderId,
      sender_type: this.props.senderType,
      sender_name: this.props.senderName,
      channel_id: this.props.channelId,
      channel_name: this.props.channelName,
      thread_id: this.props.threadId,
      is_thread_root: this.props.isThreadRoot,
      content: this.props.content,
      content_type: this.props.contentType,
      content_format: this.props.contentFormat,
      attachments: this.props.attachments.map(a => ({
        attachment_id: a.attachmentId,
        file_name: a.fileName,
        file_type: a.fileType,
        file_size: a.fileSize,
        file_url: a.fileUrl,
        thumbnail_url: a.thumbnailUrl,
      })),
      mentions: this.props.mentions.map(m => ({
        mention_type: m.mentionType,
        mention_id: m.mentionId,
        mention_name: m.mentionName ?? '',
        mention_position: m.mentionPosition ?? 0,
      })),
      references: this.props.references.map(r => ({
        ref_type: r.refType,
        ref_id: r.refId,
        ref_title: r.refTitle,
      })),
      status: this.props.status,
      is_edited: this.props.isEdited,
      edit_history: this.props.editHistory.map(e => ({
        edited_at: e.editedAt.toISOString(),
        previous_content: e.previousContent,
        edited_by: e.editedBy,
      })),
      reactions: this.props.reactions.map(r => ({
        emoji: r.emoji,
        user_ids: r.userIds,
        count: r.count,
      })),
      agent_execution_metadata: this.props.agentExecutionMetadata ? {
        thinking: this.props.agentExecutionMetadata.thinking,
        tool_logs: this.props.agentExecutionMetadata.tool_logs?.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          tool_name: log.tool_name,
          action: log.action,
          params: log.params,
          status: log.status,
          duration: log.duration,
          result: log.result,
          meta: log.meta ? {
            file_count: log.meta.file_count,
            lines_changed: log.meta.lines_changed,
            exit_code: log.meta.exit_code,
          } : undefined,
        })),
        usage: this.props.agentExecutionMetadata.usage ? {
          input_tokens: this.props.agentExecutionMetadata.usage.input_tokens,
          output_tokens: this.props.agentExecutionMetadata.usage.output_tokens,
          total_tokens: this.props.agentExecutionMetadata.usage.total_tokens,
          cache: this.props.agentExecutionMetadata.usage.cache ? {
            creation_tokens: this.props.agentExecutionMetadata.usage.cache.creation_tokens,
            read_tokens: this.props.agentExecutionMetadata.usage.cache.read_tokens,
            hit_rate: this.props.agentExecutionMetadata.usage.cache.hit_rate,
          } : undefined,
          cost: this.props.agentExecutionMetadata.usage.cost ? {
            input_cost: this.props.agentExecutionMetadata.usage.cost.input_cost,
            output_cost: this.props.agentExecutionMetadata.usage.cost.output_cost,
            cache_cost: this.props.agentExecutionMetadata.usage.cost.cache_cost,
            total_cost: this.props.agentExecutionMetadata.usage.cost.total_cost,
          } : undefined,
          model: this.props.agentExecutionMetadata.usage.model,
          latency: this.props.agentExecutionMetadata.usage.latency ? {
            first_token_ms: this.props.agentExecutionMetadata.usage.latency.first_token_ms,
            total_ms: this.props.agentExecutionMetadata.usage.latency.total_ms,
            tokens_per_second: this.props.agentExecutionMetadata.usage.latency.tokens_per_second,
          } : undefined,
        } : undefined,
        execution_mode: this.props.agentExecutionMetadata.execution_mode,
        streaming_status: this.props.agentExecutionMetadata.streaming_status,
        sequence: this.props.agentExecutionMetadata.sequence,
        started_at: this.props.agentExecutionMetadata.started_at,
        completed_at: this.props.agentExecutionMetadata.completed_at,
      } : undefined,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
      deleted_at: this.props.deletedAt?.toISOString(),
      meta: {
        client: this.props.meta.client,
        is_pinned: this.props.meta.isPinned,
        is_important: this.props.meta.isImportant,
      },
    };
  }
}
