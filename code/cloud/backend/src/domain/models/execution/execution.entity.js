"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionEntity = void 0;
const execution_types_1 = require("./execution.types");
__exportStar(require("./execution.types"), exports);
class ExecutionEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new ExecutionEntity(props);
    }
    static fromJSON(json) {
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
    validate() {
        if (!this.props.executionId || this.props.executionId.trim() === '') {
            throw new Error('Execution ID cannot be empty');
        }
        if (!this.props.agentId || this.props.agentId.trim() === '') {
            throw new Error('Agent ID cannot be empty');
        }
        if (!execution_types_1.VALID_EXECUTION_STATUSES.includes(this.props.status)) {
            throw new Error(`Invalid execution status: ${this.props.status}. Must be one of: ${execution_types_1.VALID_EXECUTION_STATUSES.join(', ')}`);
        }
        if (!this.props.logFile || this.props.logFile.trim() === '') {
            throw new Error('Log file path cannot be empty');
        }
        if (this.props.summary && !execution_types_1.VALID_EXECUTION_OUTCOMES.includes(this.props.summary.outcome)) {
            throw new Error(`Invalid execution outcome: ${this.props.summary.outcome}`);
        }
    }
    // --- Getters ---
    get executionId() { return this.props.executionId; }
    get agentId() { return this.props.agentId; }
    get taskId() { return this.props.taskId; }
    get conversationId() { return this.props.conversationId; }
    get inputMessageId() { return this.props.inputMessageId; }
    get outputMessageId() { return this.props.outputMessageId; }
    get status() { return this.props.status; }
    get exitCode() { return this.props.exitCode; }
    get logFile() { return this.props.logFile; }
    get logSizeBytes() { return this.props.logSizeBytes; }
    get summary() { return this.props.summary; }
    get fileChanges() { return this.props.fileChanges; }
    get tokenUsage() { return this.props.tokenUsage; }
    get cost() { return this.props.cost; }
    get startedAt() { return this.props.startedAt; }
    get completedAt() { return this.props.completedAt; }
    get durationMs() { return this.props.durationMs; }
    get toolCalls() { return this.props.toolCalls; }
    get skillInvocations() { return this.props.skillInvocations; }
    get errors() { return this.props.errors; }
    get meta() { return this.props.meta; }
    // --- Status checks ---
    isPending() { return this.props.status === 'pending'; }
    isRunning() { return this.props.status === 'running'; }
    isCompleted() { return this.props.status === 'completed'; }
    isFailed() { return this.props.status === 'failed'; }
    isCancelled() { return this.props.status === 'cancelled'; }
    isFinished() { return this.isCompleted() || this.isFailed() || this.isCancelled(); }
    // --- Summary checks ---
    isSuccess() { return this.props.summary?.outcome === 'success'; }
    isPartialSuccess() { return this.props.summary?.outcome === 'partial'; }
    hasErrors() { return (this.props.errors.length > 0) || (this.props.summary?.errorsCount ?? 0) > 0; }
    hasUnrecoveredErrors() {
        return this.props.errors.some(e => !e.recovered);
    }
    // --- File changes ---
    getFilesCreated() {
        return this.props.fileChanges.filter(fc => fc.changeType === 'create');
    }
    getFilesModified() {
        return this.props.fileChanges.filter(fc => fc.changeType === 'modify');
    }
    getFilesDeleted() {
        return this.props.fileChanges.filter(fc => fc.changeType === 'delete');
    }
    getTotalLinesChanged() {
        return this.props.fileChanges.reduce((sum, fc) => sum + fc.linesAdded + fc.linesDeleted, 0);
    }
    // --- Tool calls ---
    getToolCallCount(toolName) {
        const stat = this.props.toolCalls.find(tc => tc.toolName === toolName);
        return stat?.callCount ?? 0;
    }
    getMostUsedTool() {
        if (this.props.toolCalls.length === 0)
            return undefined;
        return this.props.toolCalls.reduce((max, tc) => tc.callCount > max.callCount ? tc : max);
    }
    // --- Immutable updates ---
    updateStatus(status) {
        return ExecutionEntity.create({
            ...this.props,
            status,
        });
    }
    start() {
        if (this.props.status !== 'pending') {
            throw new Error('Only pending executions can be started');
        }
        return ExecutionEntity.create({
            ...this.props,
            status: 'running',
            startedAt: new Date(),
        });
    }
    complete(exitCode = 0) {
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
    fail(exitCode = 1) {
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
    cancel() {
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
    updateSummary(summary) {
        return ExecutionEntity.create({
            ...this.props,
            summary,
        });
    }
    addFileChange(fileChange) {
        return ExecutionEntity.create({
            ...this.props,
            fileChanges: [...this.props.fileChanges, fileChange],
        });
    }
    updateTokenUsage(tokenUsage) {
        return ExecutionEntity.create({
            ...this.props,
            tokenUsage,
        });
    }
    updateCost(cost) {
        return ExecutionEntity.create({
            ...this.props,
            cost,
        });
    }
    addError(error) {
        return ExecutionEntity.create({
            ...this.props,
            errors: [...this.props.errors, error],
        });
    }
    updateOutputMessage(outputMessageId) {
        return ExecutionEntity.create({
            ...this.props,
            outputMessageId,
        });
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.executionId === other.props.executionId;
    }
    // --- Serialization ---
    toJSON() {
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
exports.ExecutionEntity = ExecutionEntity;
