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

  // --- Equality (by ID) ---

  equals(other: MessageEntity): boolean {
    return this.props.messageId === other.props.messageId;
  }

  // --- Serialization ---

  toJSON(): MessageEntityJSON {
    return {
      message_id: this.props.messageId,
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
