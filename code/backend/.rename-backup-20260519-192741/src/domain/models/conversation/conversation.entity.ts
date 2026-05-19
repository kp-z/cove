/**
 * ConversationEntity - 对话实体（聚合根）
 *
 * 对话表示 Agent 与用户之间的交互会话，包含消息历史、上下文、状态等。
 *
 * 业务规则：
 * - conversationId 不能为空
 * - agentId 不能为空
 * - channelId 不能为空
 * - status 只能是 active | paused | completed | archived
 * - Entity 是不可变的（更新返回新实例）
 */

export type ConversationStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ParticipantType = 'human' | 'agent';

const VALID_CONVERSATION_STATUSES: readonly ConversationStatus[] = ['active', 'paused', 'completed', 'archived'];

export interface ConversationParticipant {
  readonly id: string;
  readonly type: ParticipantType;
  readonly joinedAt: Date;
}

export interface ConversationContext {
  readonly taskId?: string;
  readonly workflowId?: string;
  readonly okrId?: string;
  readonly customContext?: Record<string, unknown>;
}

export interface ConversationStatistics {
  readonly messageCount: number;
  readonly turnCount: number;
  readonly tokenUsage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
  };
  readonly cost: {
    readonly totalCostUsd: number;
  };
}

export interface ConversationEntityProps {
  readonly conversationId: string;
  readonly agentId: string;
  readonly channelId: string;
  readonly participants: readonly ConversationParticipant[];
  readonly status: ConversationStatus;
  readonly context: ConversationContext;
  readonly statistics: ConversationStatistics;
  readonly startedAt: Date;
  readonly lastMessageAt: Date;
  readonly completedAt?: Date;
  readonly archivedAt?: Date;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly title?: string;
    readonly summary?: string;
  };
}

export interface ConversationEntityJSON {
  readonly conversation_id: string;
  readonly agent_id: string;
  readonly channel_id: string;
  readonly participants: readonly {
    readonly id: string;
    readonly type: ParticipantType;
    readonly joined_at: string;
  }[];
  readonly status: ConversationStatus;
  readonly context: {
    readonly task_id?: string;
    readonly workflow_id?: string;
    readonly okr_id?: string;
    readonly custom_context?: Record<string, unknown>;
  };
  readonly statistics: {
    readonly message_count: number;
    readonly turn_count: number;
    readonly token_usage: {
      readonly input_tokens: number;
      readonly output_tokens: number;
      readonly total_tokens: number;
    };
    readonly cost: {
      readonly total_cost_usd: number;
    };
  };
  readonly started_at: string;
  readonly last_message_at: string;
  readonly completed_at?: string;
  readonly archived_at?: string;
  readonly meta: {
    readonly tags?: readonly string[];
    readonly title?: string;
    readonly summary?: string;
  };
}

export class ConversationEntity {
  private constructor(private readonly props: ConversationEntityProps) {
    this.validate();
  }

  static create(props: ConversationEntityProps): ConversationEntity {
    return new ConversationEntity(props);
  }

  static fromJSON(json: ConversationEntityJSON): ConversationEntity {
    return ConversationEntity.create({
      conversationId: json.conversation_id,
      agentId: json.agent_id,
      channelId: json.channel_id,
      participants: json.participants.map(p => ({
        id: p.id,
        type: p.type,
        joinedAt: new Date(p.joined_at),
      })),
      status: json.status,
      context: {
        taskId: json.context.task_id,
        workflowId: json.context.workflow_id,
        okrId: json.context.okr_id,
        customContext: json.context.custom_context,
      },
      statistics: {
        messageCount: json.statistics.message_count,
        turnCount: json.statistics.turn_count,
        tokenUsage: {
          inputTokens: json.statistics.token_usage.input_tokens,
          outputTokens: json.statistics.token_usage.output_tokens,
          totalTokens: json.statistics.token_usage.total_tokens,
        },
        cost: {
          totalCostUsd: json.statistics.cost.total_cost_usd,
        },
      },
      startedAt: new Date(json.started_at),
      lastMessageAt: new Date(json.last_message_at),
      completedAt: json.completed_at ? new Date(json.completed_at) : undefined,
      archivedAt: json.archived_at ? new Date(json.archived_at) : undefined,
      meta: json.meta,
    });
  }

  private validate(): void {
    if (!this.props.conversationId || this.props.conversationId.trim() === '') {
      throw new Error('Conversation ID cannot be empty');
    }
    if (!this.props.agentId || this.props.agentId.trim() === '') {
      throw new Error('Agent ID cannot be empty');
    }
    if (!this.props.channelId || this.props.channelId.trim() === '') {
      throw new Error('Channel ID cannot be empty');
    }
    if (!VALID_CONVERSATION_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid conversation status: ${this.props.status}. Must be one of: ${VALID_CONVERSATION_STATUSES.join(', ')}`);
    }
    if (this.props.participants.length === 0) {
      throw new Error('Conversation must have at least one participant');
    }
  }

  // --- Getters ---

  get conversationId(): string { return this.props.conversationId; }
  get agentId(): string { return this.props.agentId; }
  get channelId(): string { return this.props.channelId; }
  get participants(): readonly ConversationParticipant[] { return this.props.participants; }
  get status(): ConversationStatus { return this.props.status; }
  get context(): ConversationContext { return this.props.context; }
  get statistics(): ConversationStatistics { return this.props.statistics; }
  get startedAt(): Date { return this.props.startedAt; }
  get lastMessageAt(): Date { return this.props.lastMessageAt; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get archivedAt(): Date | undefined { return this.props.archivedAt; }
  get meta(): ConversationEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isActive(): boolean { return this.props.status === 'active'; }
  isPaused(): boolean { return this.props.status === 'paused'; }
  isCompleted(): boolean { return this.props.status === 'completed'; }
  isArchived(): boolean { return this.props.status === 'archived'; }

  // --- Participant operations ---

  hasParticipant(participantId: string): boolean {
    return this.props.participants.some(p => p.id === participantId);
  }

  getParticipant(participantId: string): ConversationParticipant | undefined {
    return this.props.participants.find(p => p.id === participantId);
  }

  getHumanParticipants(): readonly ConversationParticipant[] {
    return this.props.participants.filter(p => p.type === 'human');
  }

  getAgentParticipants(): readonly ConversationParticipant[] {
    return this.props.participants.filter(p => p.type === 'agent');
  }

  // --- Context checks ---

  hasTask(): boolean { return !!this.props.context.taskId; }
  hasWorkflow(): boolean { return !!this.props.context.workflowId; }
  hasOKR(): boolean { return !!this.props.context.okrId; }

  // --- Statistics ---

  getDurationMs(): number {
    const endTime = this.props.completedAt || new Date();
    return endTime.getTime() - this.props.startedAt.getTime();
  }

  getAverageTokensPerMessage(): number {
    if (this.props.statistics.messageCount === 0) return 0;
    return this.props.statistics.tokenUsage.totalTokens / this.props.statistics.messageCount;
  }

  // --- Immutable updates ---

  updateStatus(status: ConversationStatus): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      status,
    });
  }

  pause(): ConversationEntity {
    if (this.props.status !== 'active') {
      throw new Error('Only active conversations can be paused');
    }
    return ConversationEntity.create({
      ...this.props,
      status: 'paused',
    });
  }

  resume(): ConversationEntity {
    if (this.props.status !== 'paused') {
      throw new Error('Only paused conversations can be resumed');
    }
    return ConversationEntity.create({
      ...this.props,
      status: 'active',
    });
  }

  complete(): ConversationEntity {
    if (this.props.status !== 'active' && this.props.status !== 'paused') {
      throw new Error('Only active or paused conversations can be completed');
    }
    return ConversationEntity.create({
      ...this.props,
      status: 'completed',
      completedAt: new Date(),
    });
  }

  archive(): ConversationEntity {
    if (this.props.status !== 'completed') {
      throw new Error('Only completed conversations can be archived');
    }
    return ConversationEntity.create({
      ...this.props,
      status: 'archived',
      archivedAt: new Date(),
    });
  }

  addParticipant(participant: ConversationParticipant): ConversationEntity {
    if (this.hasParticipant(participant.id)) {
      throw new Error(`Participant ${participant.id} already exists`);
    }
    return ConversationEntity.create({
      ...this.props,
      participants: [...this.props.participants, participant],
    });
  }

  incrementMessageCount(): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        messageCount: this.props.statistics.messageCount + 1,
      },
      lastMessageAt: new Date(),
    });
  }

  incrementTurnCount(): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        turnCount: this.props.statistics.turnCount + 1,
      },
    });
  }

  updateTokenUsage(inputTokens: number, outputTokens: number): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        tokenUsage: {
          inputTokens: this.props.statistics.tokenUsage.inputTokens + inputTokens,
          outputTokens: this.props.statistics.tokenUsage.outputTokens + outputTokens,
          totalTokens: this.props.statistics.tokenUsage.totalTokens + inputTokens + outputTokens,
        },
      },
    });
  }

  updateCost(costUsd: number): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      statistics: {
        ...this.props.statistics,
        cost: {
          totalCostUsd: this.props.statistics.cost.totalCostUsd + costUsd,
        },
      },
    });
  }

  updateTitle(title: string): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        title,
      },
    });
  }

  updateSummary(summary: string): ConversationEntity {
    return ConversationEntity.create({
      ...this.props,
      meta: {
        ...this.props.meta,
        summary,
      },
    });
  }

  // --- Equality (by ID) ---

  equals(other: ConversationEntity): boolean {
    return this.props.conversationId === other.props.conversationId;
  }

  // --- Serialization ---

  toJSON(): ConversationEntityJSON {
    return {
      conversation_id: this.props.conversationId,
      agent_id: this.props.agentId,
      channel_id: this.props.channelId,
      participants: this.props.participants.map(p => ({
        id: p.id,
        type: p.type,
        joined_at: p.joinedAt.toISOString(),
      })),
      status: this.props.status,
      context: {
        task_id: this.props.context.taskId,
        workflow_id: this.props.context.workflowId,
        okr_id: this.props.context.okrId,
        custom_context: this.props.context.customContext,
      },
      statistics: {
        message_count: this.props.statistics.messageCount,
        turn_count: this.props.statistics.turnCount,
        token_usage: {
          input_tokens: this.props.statistics.tokenUsage.inputTokens,
          output_tokens: this.props.statistics.tokenUsage.outputTokens,
          total_tokens: this.props.statistics.tokenUsage.totalTokens,
        },
        cost: {
          total_cost_usd: this.props.statistics.cost.totalCostUsd,
        },
      },
      started_at: this.props.startedAt.toISOString(),
      last_message_at: this.props.lastMessageAt.toISOString(),
      completed_at: this.props.completedAt?.toISOString(),
      archived_at: this.props.archivedAt?.toISOString(),
      meta: this.props.meta,
    };
  }
}
