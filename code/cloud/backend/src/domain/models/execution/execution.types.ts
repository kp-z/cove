export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ExecutionOutcome = 'success' | 'partial' | 'failed';
export type FileChangeType = 'create' | 'modify' | 'delete';

export const VALID_EXECUTION_STATUSES: readonly ExecutionStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
export const VALID_EXECUTION_OUTCOMES: readonly ExecutionOutcome[] = ['success', 'partial', 'failed'];

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
