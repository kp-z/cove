/**
 * ExecutionEntity - 执行记录实体（聚合根）
 *
 * 执行记录跟踪 Agent 执行任务的完整过程，包括日志、状态、Token 使用、成本等。
 *
 * 业务规则：
 * - executionId 不能为空
 * - agentId 不能为空
 * - status 只能是 pending | running | completed | failed | cancelled
 * - Entity 是不可变的（更新返回新实例）
 */

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExecutionOutcome = 'success' | 'partial' | 'failed';
export type FileChangeType = 'create' | 'modify' | 'delete';

const VALID_EXECUTION_STATUSES: readonly ExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
const VALID_EXECUTION_OUTCOMES: readonly ExecutionOutcome[] = ['success', 'partial', 'failed'];

export interface ExecutionSummary {
  readonly outcome: ExecutionOutcome;
  readonly keyActions: readonly string[];
  readonly filesChanged: number;
  readonly errorsCount: number;
  readonly errorsRecovered: number;
}

export interface FileChange {
  readonly filePath: string;
  readonly changeType: FileChangeType;
  readonly gitCommit?: string;
  readonly linesAdded: number;
  readonly linesDeleted: number;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly thinkingTokens: number;
  readonly totalTokens: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
}

export interface ExecutionCost {
  readonly inputCostUsd: number;
  readonly outputCostUsd: number;
  readonly thinkingCostUsd: number;
  readonly cacheCostUsd?: number;
  readonly totalCostUsd: number;
}

export interface ToolCallStat {
  readonly toolName: string;
  readonly callCount: number;
  readonly totalDurationMs: number;
}

export interface SkillInvocation {
  readonly skillName: string;
  readonly invocationCount: number;
  readonly totalDurationMs: number;
}

export interface ExecutionError {
  readonly errorType: string;
  readonly errorMessage: string;
  readonly timestamp: Date;
  readonly recovered: boolean;
  readonly stackTrace?: string;
}

export interface ExecutionEntityProps {
  readonly executionId: string;
  readonly agentId: string;
  readonly taskId?: string;
  readonly conversationId?: string;
  readonly inputMessageId?: string;
  readonly outputMessageId?: string;
  readonly status: ExecutionStatus;
  readonly exitCode?: number;
  readonly logFile: string;
  readonly logSizeBytes: number;
  readonly summary?: ExecutionSummary;
  readonly fileChanges: readonly FileChange[];
  readonly tokenUsage?: TokenUsage;
  readonly cost?: ExecutionCost;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly durationMs?: number;
  readonly toolCalls: readonly ToolCallStat[];
  readonly skillInvocations: readonly SkillInvocation[];
  readonly errors: readonly ExecutionError[];
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly priority?: string;
  };
}

export interface ExecutionEntityJSON {
  readonly execution_id: string;
  readonly agent_id: string;
  readonly task_id?: string;
  readonly conversation_id?: string;
  readonly input_message_id?: string;
  readonly output_message_id?: string;
  readonly status: ExecutionStatus;
  readonly exit_code?: number;
  readonly log_file: string;
  readonly log_size_bytes: number;
  readonly summary?: {
    readonly outcome: ExecutionOutcome;
    readonly key_actions: readonly string[];
    readonly files_changed: number;
    readonly errors_count: number;
    readonly errors_recovered: number;
  };
  readonly file_changes: readonly {
    readonly file_path: string;
    readonly change_type: FileChangeType;
    readonly git_commit?: string;
    readonly lines_added: number;
    readonly lines_deleted: number;
  }[];
  readonly token_usage?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly thinking_tokens: number;
    readonly total_tokens: number;
    readonly cache_read_tokens?: number;
    readonly cache_write_tokens?: number;
  };
  readonly cost?: {
    readonly input_cost_usd: number;
    readonly output_cost_usd: number;
    readonly thinking_cost_usd: number;
    readonly cache_cost_usd?: number;
    readonly total_cost_usd: number;
  };
  readonly started_at: string;
  readonly completed_at?: string;
  readonly duration_ms?: number;
  readonly tool_calls: readonly {
    readonly tool_name: string;
    readonly call_count: number;
    readonly total_duration_ms: number;
  }[];
  readonly skill_invocations: readonly {
    readonly skill_name: string;
    readonly invocation_count: number;
    readonly total_duration_ms: number;
  }[];
  readonly errors: readonly {
    readonly error_type: string;
    readonly error_message: string;
    readonly timestamp: string;
    readonly recovered: boolean;
    readonly stack_trace?: string;
  }[];
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly priority?: string;
  };
}

export class ExecutionEntity {
  private constructor(private readonly props: ExecutionEntityProps) {
    this.validate();
  }

  static create(props: ExecutionEntityProps): ExecutionEntity {
    return new ExecutionEntity(props);
  }

  static fromJSON(json: ExecutionEntityJSON): ExecutionEntity {
    return ExecutionEntity.create({
      executionId: json.execution_id,
      agentId: json.agent_id,
      taskId: json.task_id,
      conversationId: json.conversation_id,
      inputMessageId: json.input_message_id,
      outputMessageId: json.output_message_id,
      status: json.status,
      exitCode: json.exit_code,
      logFile: json.log_file,
      logSizeBytes: json.log_size_bytes,
      summary: json.summary ? {
        outcome: json.summary.outcome,
        keyActions: json.summary.key_actions,
        filesChanged: json.summary.files_changed,
        errorsCount: json.summary.errors_count,
        errorsRecovered: json.summary.errors_recovered,
      } : undefined,
      fileChanges: json.file_changes.map(fc => ({
        filePath: fc.file_path,
        changeType: fc.change_type,
        gitCommit: fc.git_commit,
        linesAdded: fc.lines_added,
        linesDeleted: fc.lines_deleted,
      })),
      tokenUsage: json.token_usage ? {
        inputTokens: json.token_usage.input_tokens,
        outputTokens: json.token_usage.output_tokens,
        thinkingTokens: json.token_usage.thinking_tokens,
        totalTokens: json.token_usage.total_tokens,
        cacheReadTokens: json.token_usage.cache_read_tokens,
        cacheWriteTokens: json.token_usage.cache_write_tokens,
      } : undefined,
      cost: json.cost ? {
        inputCostUsd: json.cost.input_cost_usd,
        outputCostUsd: json.cost.output_cost_usd,
        thinkingCostUsd: json.cost.thinking_cost_usd,
        cacheCostUsd: json.cost.cache_cost_usd,
        totalCostUsd: json.cost.total_cost_usd,
      } : undefined,
      startedAt: new Date(json.started_at),
      completedAt: json.completed_at ? new Date(json.completed_at) : undefined,
      durationMs: json.duration_ms,
      toolCalls: json.tool_calls.map(tc => ({
        toolName: tc.tool_name,
        callCount: tc.call_count,
        totalDurationMs: tc.total_duration_ms,
      })),
      skillInvocations: json.skill_invocations.map(si => ({
        skillName: si.skill_name,
        invocationCount: si.invocation_count,
        totalDurationMs: si.total_duration_ms,
      })),
      errors: json.errors.map(e => ({
        errorType: e.error_type,
        errorMessage: e.error_message,
        timestamp: new Date(e.timestamp),
        recovered: e.recovered,
        stackTrace: e.stack_trace,
      })),
      meta: json.meta,
    });
  }

  private validate(): void {
    if (!this.props.executionId || this.props.executionId.trim() === '') {
      throw new Error('Execution ID cannot be empty');
    }
    if (!this.props.agentId || this.props.agentId.trim() === '') {
      throw new Error('Agent ID cannot be empty');
    }
    if (!VALID_EXECUTION_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid execution status: ${this.props.status}. Must be one of: ${VALID_EXECUTION_STATUSES.join(', ')}`);
    }
    if (!this.props.logFile || this.props.logFile.trim() === '') {
      throw new Error('Log file path cannot be empty');
    }
    if (this.props.summary && !VALID_EXECUTION_OUTCOMES.includes(this.props.summary.outcome)) {
      throw new Error(`Invalid execution outcome: ${this.props.summary.outcome}`);
    }
  }

  // --- Getters ---

  get executionId(): string { return this.props.executionId; }
  get agentId(): string { return this.props.agentId; }
  get taskId(): string | undefined { return this.props.taskId; }
  get conversationId(): string | undefined { return this.props.conversationId; }
  get inputMessageId(): string | undefined { return this.props.inputMessageId; }
  get outputMessageId(): string | undefined { return this.props.outputMessageId; }
  get status(): ExecutionStatus { return this.props.status; }
  get exitCode(): number | undefined { return this.props.exitCode; }
  get logFile(): string { return this.props.logFile; }
  get logSizeBytes(): number { return this.props.logSizeBytes; }
  get summary(): ExecutionSummary | undefined { return this.props.summary; }
  get fileChanges(): readonly FileChange[] { return this.props.fileChanges; }
  get tokenUsage(): TokenUsage | undefined { return this.props.tokenUsage; }
  get cost(): ExecutionCost | undefined { return this.props.cost; }
  get startedAt(): Date { return this.props.startedAt; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get durationMs(): number | undefined { return this.props.durationMs; }
  get toolCalls(): readonly ToolCallStat[] { return this.props.toolCalls; }
  get skillInvocations(): readonly SkillInvocation[] { return this.props.skillInvocations; }
  get errors(): readonly ExecutionError[] { return this.props.errors; }
  get meta(): ExecutionEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isPending(): boolean { return this.props.status === 'pending'; }
  isRunning(): boolean { return this.props.status === 'running'; }
  isCompleted(): boolean { return this.props.status === 'completed'; }
  isFailed(): boolean { return this.props.status === 'failed'; }
  isCancelled(): boolean { return this.props.status === 'cancelled'; }
  isFinished(): boolean { return this.isCompleted() || this.isFailed() || this.isCancelled(); }

  // --- Summary checks ---

  isSuccess(): boolean { return this.props.summary?.outcome === 'success'; }
  isPartialSuccess(): boolean { return this.props.summary?.outcome === 'partial'; }
  hasErrors(): boolean { return (this.props.errors.length > 0) || (this.props.summary?.errorsCount ?? 0) > 0; }
  hasUnrecoveredErrors(): boolean {
    return this.props.errors.some(e => !e.recovered);
  }

  // --- File changes ---

  getFilesCreated(): readonly FileChange[] {
    return this.props.fileChanges.filter(fc => fc.changeType === 'create');
  }

  getFilesModified(): readonly FileChange[] {
    return this.props.fileChanges.filter(fc => fc.changeType === 'modify');
  }

  getFilesDeleted(): readonly FileChange[] {
    return this.props.fileChanges.filter(fc => fc.changeType === 'delete');
  }

  getTotalLinesChanged(): number {
    return this.props.fileChanges.reduce(
      (sum, fc) => sum + fc.linesAdded + fc.linesDeleted,
      0
    );
  }

  // --- Tool calls ---

  getToolCallCount(toolName: string): number {
    const stat = this.props.toolCalls.find(tc => tc.toolName === toolName);
    return stat?.callCount ?? 0;
  }

  getMostUsedTool(): ToolCallStat | undefined {
    if (this.props.toolCalls.length === 0) return undefined;
    return this.props.toolCalls.reduce((max, tc) =>
      tc.callCount > max.callCount ? tc : max
    );
  }

  // --- Immutable updates ---

  updateStatus(status: ExecutionStatus): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      status,
    });
  }

  start(): ExecutionEntity {
    if (this.props.status !== 'pending') {
      throw new Error('Only pending executions can be started');
    }
    return ExecutionEntity.create({
      ...this.props,
      status: 'running',
      startedAt: new Date(),
    });
  }

  complete(exitCode: number = 0): ExecutionEntity {
    if (this.props.status !== 'running') {
      throw new Error('Only running executions can be completed');
    }
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.props.startedAt.getTime();

    return ExecutionEntity.create({
      ...this.props,
      status: 'completed',
      exitCode,
      completedAt,
      durationMs,
    });
  }

  fail(exitCode: number = 1): ExecutionEntity {
    if (this.props.status !== 'running') {
      throw new Error('Only running executions can be failed');
    }
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.props.startedAt.getTime();

    return ExecutionEntity.create({
      ...this.props,
      status: 'failed',
      exitCode,
      completedAt,
      durationMs,
    });
  }

  cancel(): ExecutionEntity {
    if (this.isFinished()) {
      throw new Error('Cannot cancel finished execution');
    }
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - this.props.startedAt.getTime();

    return ExecutionEntity.create({
      ...this.props,
      status: 'cancelled',
      completedAt,
      durationMs,
    });
  }

  updateSummary(summary: ExecutionSummary): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      summary,
    });
  }

  addFileChange(fileChange: FileChange): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      fileChanges: [...this.props.fileChanges, fileChange],
    });
  }

  updateTokenUsage(tokenUsage: TokenUsage): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      tokenUsage,
    });
  }

  updateCost(cost: ExecutionCost): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      cost,
    });
  }

  addError(error: ExecutionError): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      errors: [...this.props.errors, error],
    });
  }

  updateOutputMessage(outputMessageId: string): ExecutionEntity {
    return ExecutionEntity.create({
      ...this.props,
      outputMessageId,
    });
  }

  // --- Equality (by ID) ---

  equals(other: ExecutionEntity): boolean {
    return this.props.executionId === other.props.executionId;
  }

  // --- Serialization ---

  toJSON(): ExecutionEntityJSON {
    return {
      execution_id: this.props.executionId,
      agent_id: this.props.agentId,
      task_id: this.props.taskId,
      conversation_id: this.props.conversationId,
      input_message_id: this.props.inputMessageId,
      output_message_id: this.props.outputMessageId,
      status: this.props.status,
      exit_code: this.props.exitCode,
      log_file: this.props.logFile,
      log_size_bytes: this.props.logSizeBytes,
      summary: this.props.summary ? {
        outcome: this.props.summary.outcome,
        key_actions: this.props.summary.keyActions,
        files_changed: this.props.summary.filesChanged,
        errors_count: this.props.summary.errorsCount,
        errors_recovered: this.props.summary.errorsRecovered,
      } : undefined,
      file_changes: this.props.fileChanges.map(fc => ({
        file_path: fc.filePath,
        change_type: fc.changeType,
        git_commit: fc.gitCommit,
        lines_added: fc.linesAdded,
        lines_deleted: fc.linesDeleted,
      })),
      token_usage: this.props.tokenUsage ? {
        input_tokens: this.props.tokenUsage.inputTokens,
        output_tokens: this.props.tokenUsage.outputTokens,
        thinking_tokens: this.props.tokenUsage.thinkingTokens,
        total_tokens: this.props.tokenUsage.totalTokens,
        cache_read_tokens: this.props.tokenUsage.cacheReadTokens,
        cache_write_tokens: this.props.tokenUsage.cacheWriteTokens,
      } : undefined,
      cost: this.props.cost ? {
        input_cost_usd: this.props.cost.inputCostUsd,
        output_cost_usd: this.props.cost.outputCostUsd,
        thinking_cost_usd: this.props.cost.thinkingCostUsd,
        cache_cost_usd: this.props.cost.cacheCostUsd,
        total_cost_usd: this.props.cost.totalCostUsd,
      } : undefined,
      started_at: this.props.startedAt.toISOString(),
      completed_at: this.props.completedAt?.toISOString(),
      duration_ms: this.props.durationMs,
      tool_calls: this.props.toolCalls.map(tc => ({
        tool_name: tc.toolName,
        call_count: tc.callCount,
        total_duration_ms: tc.totalDurationMs,
      })),
      skill_invocations: this.props.skillInvocations.map(si => ({
        skill_name: si.skillName,
        invocation_count: si.invocationCount,
        total_duration_ms: si.totalDurationMs,
      })),
      errors: this.props.errors.map(e => ({
        error_type: e.errorType,
        error_message: e.errorMessage,
        timestamp: e.timestamp.toISOString(),
        recovered: e.recovered,
        stack_trace: e.stackTrace,
      })),
      meta: this.props.meta,
    };
  }
}
