/**
 * ThreadEntity - 线程实体（聚合根）
 *
 * 线程是消息的子对话，由一条根消息发起，支持多人回复。
 *
 * 业务规则：
 * - threadId 必须等于 rootMessageId
 * - channelId 不能为空
 * - Entity 是不可变的（更新返回新实例）
 */

export interface ThreadEntityProps {
  readonly threadId: string;
  readonly channelId: string;
  readonly rootMessageId: string;
  readonly participants: readonly string[];
  readonly replyCount: number;
  readonly lastReplyAt?: Date;
  readonly createdAt: Date;
}

export interface ThreadEntityJSON {
  readonly thread_id: string;
  readonly channel_id: string;
  readonly root_message_id: string;
  readonly participants: readonly string[];
  readonly reply_count: number;
  readonly last_reply_at?: string;
  readonly created_at: string;
}

export class ThreadEntity {
  private constructor(private readonly props: ThreadEntityProps) {
    this.validate();
  }

  static create(props: ThreadEntityProps): ThreadEntity {
    return new ThreadEntity(props);
  }

  static fromJSON(json: ThreadEntityJSON): ThreadEntity {
    return ThreadEntity.create({
      threadId: json.thread_id,
      channelId: json.channel_id,
      rootMessageId: json.root_message_id,
      participants: json.participants,
      replyCount: json.reply_count,
      lastReplyAt: json.last_reply_at ? new Date(json.last_reply_at) : undefined,
      createdAt: new Date(json.created_at),
    });
  }

  private validate(): void {
    if (!this.props.threadId || this.props.threadId.trim() === '') {
      throw new Error('Thread ID cannot be empty');
    }
    if (!this.props.channelId || this.props.channelId.trim() === '') {
      throw new Error('Channel ID cannot be empty');
    }
    if (!this.props.rootMessageId || this.props.rootMessageId.trim() === '') {
      throw new Error('Root message ID cannot be empty');
    }
    if (this.props.threadId !== this.props.rootMessageId) {
      throw new Error('Thread ID must equal root message ID');
    }
  }

  // --- Getters ---

  get threadId(): string { return this.props.threadId; }
  get channelId(): string { return this.props.channelId; }
  get rootMessageId(): string { return this.props.rootMessageId; }
  get participants(): readonly string[] { return this.props.participants; }
  get replyCount(): number { return this.props.replyCount; }
  get lastReplyAt(): Date | undefined { return this.props.lastReplyAt; }
  get createdAt(): Date { return this.props.createdAt; }

  // --- Immutable updates ---

  addReply(): ThreadEntity {
    return ThreadEntity.create({
      ...this.props,
      replyCount: this.props.replyCount + 1,
      lastReplyAt: new Date(),
    });
  }

  addParticipant(actorId: string): ThreadEntity {
    if (this.props.participants.includes(actorId)) {
      return this;
    }
    return ThreadEntity.create({
      ...this.props,
      participants: [...this.props.participants, actorId],
    });
  }

  // --- Equality ---

  equals(other: ThreadEntity): boolean {
    return this.props.threadId === other.props.threadId;
  }

  // --- Serialization ---

  toJSON(): ThreadEntityJSON {
    return {
      thread_id: this.props.threadId,
      channel_id: this.props.channelId,
      root_message_id: this.props.rootMessageId,
      participants: this.props.participants,
      reply_count: this.props.replyCount,
      last_reply_at: this.props.lastReplyAt?.toISOString(),
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
