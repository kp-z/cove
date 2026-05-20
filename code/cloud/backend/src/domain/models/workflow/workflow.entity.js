"use strict";
/**
 * WorkflowEntity - 工作流实体（聚合根）
 *
 * 工作流定义任务的自动化编排和执行流程，支持顺序执行、并行执行和条件分支。
 *
 * 业务规则：
 * - workflowId 不能为空
 * - name 不能为空
 * - steps 必须是嵌套数组（外层=阶段，内层=并行步骤）
 * - Step ID 在 Workflow 内必须唯一
 * - status 只能是 draft | active | paused | completed | archived
 * - Entity 是不可变的（更新返回新实例）
 *
 * 注意：
 * - executions (执行历史) 已移至 Runtime 层，通过 ExecutionRepository 查询
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEntity = void 0;
const VALID_WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];
const VALID_ON_FAILURE_STRATEGIES = ['fail', 'continue', 'retry'];
class WorkflowEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new WorkflowEntity(props);
    }
    static fromJSON(json) {
        return WorkflowEntity.create({
            workflowId: json.workflow_id,
            name: json.name,
            description: json.description,
            krId: json.kr_id,
            projectId: json.project_id,
            status: json.status,
            steps: json.steps.map(stage => stage.map(step => ({
                id: step.id,
                taskId: step.task_id,
                condition: step.condition,
                timeoutMinutes: step.timeout_minutes,
                onFailure: step.on_failure,
                retryConfig: step.retry_config ? {
                    maxRetries: step.retry_config.max_retries,
                    backoffStrategy: step.retry_config.backoff_strategy,
                    initialDelaySeconds: step.retry_config.initial_delay_seconds,
                } : undefined,
            }))),
            triggers: json.triggers.map(t => ({
                triggerType: t.trigger_type,
                enabled: t.enabled,
                eventSource: t.event_source,
                eventType: t.event_type,
                krId: t.kr_id,
                schedule: t.schedule,
            })),
            createdAt: new Date(json.created_at),
            updatedAt: new Date(json.updated_at),
            createdBy: json.created_by,
            meta: json.meta,
        });
    }
    validate() {
        if (!this.props.workflowId || this.props.workflowId.trim() === '') {
            throw new Error('Workflow ID cannot be empty');
        }
        if (!this.props.name || this.props.name.trim() === '') {
            throw new Error('Workflow name cannot be empty');
        }
        if (!this.props.projectId || this.props.projectId.trim() === '') {
            throw new Error('Project ID cannot be empty');
        }
        if (!VALID_WORKFLOW_STATUSES.includes(this.props.status)) {
            throw new Error(`Invalid workflow status: ${this.props.status}. Must be one of: ${VALID_WORKFLOW_STATUSES.join(', ')}`);
        }
        // Validate steps structure
        if (!Array.isArray(this.props.steps)) {
            throw new Error('Steps must be an array of stages');
        }
        // Validate step IDs are unique
        const stepIds = new Set();
        for (const stage of this.props.steps) {
            if (!Array.isArray(stage)) {
                throw new Error('Each stage must be an array of steps');
            }
            for (const step of stage) {
                if (!step.id || step.id.trim() === '') {
                    throw new Error('Step ID cannot be empty');
                }
                if (!step.taskId || step.taskId.trim() === '') {
                    throw new Error('Step task ID cannot be empty');
                }
                if (stepIds.has(step.id)) {
                    throw new Error(`Duplicate step ID: ${step.id}`);
                }
                stepIds.add(step.id);
                // Validate onFailure strategy
                if (step.onFailure && !VALID_ON_FAILURE_STRATEGIES.includes(step.onFailure)) {
                    throw new Error(`Invalid on_failure strategy: ${step.onFailure}`);
                }
            }
        }
    }
    // --- Getters ---
    get workflowId() { return this.props.workflowId; }
    get name() { return this.props.name; }
    get description() { return this.props.description; }
    get krId() { return this.props.krId; }
    get projectId() { return this.props.projectId; }
    get status() { return this.props.status; }
    get steps() { return this.props.steps; }
    get triggers() { return this.props.triggers; }
    get createdAt() { return this.props.createdAt; }
    get updatedAt() { return this.props.updatedAt; }
    get createdBy() { return this.props.createdBy; }
    get meta() { return this.props.meta; }
    // --- Status checks ---
    isDraft() { return this.props.status === 'draft'; }
    isActive() { return this.props.status === 'active'; }
    isPaused() { return this.props.status === 'paused'; }
    isCompleted() { return this.props.status === 'completed'; }
    isArchived() { return this.props.status === 'archived'; }
    // --- Step operations ---
    getStep(stepId) {
        for (const stage of this.props.steps) {
            const step = stage.find(s => s.id === stepId);
            if (step)
                return step;
        }
        return undefined;
    }
    hasStep(stepId) {
        return !!this.getStep(stepId);
    }
    getStageIndex(stepId) {
        for (let i = 0; i < this.props.steps.length; i++) {
            const stage = this.props.steps[i];
            if (stage && stage.some(s => s.id === stepId)) {
                return i;
            }
        }
        return -1;
    }
    getStage(stageIndex) {
        return this.props.steps[stageIndex];
    }
    getTotalStages() {
        return this.props.steps.length;
    }
    getTotalSteps() {
        return this.props.steps.reduce((sum, stage) => sum + stage.length, 0);
    }
    isParallelStage(stageIndex) {
        const stage = this.getStage(stageIndex);
        return stage ? stage.length > 1 : false;
    }
    // --- Trigger operations ---
    getEnabledTriggers() {
        return this.props.triggers.filter(t => t.enabled);
    }
    hasManualTrigger() {
        return this.props.triggers.some(t => t.triggerType === 'manual' && t.enabled);
    }
    // --- Immutable updates ---
    updateStatus(status) {
        return WorkflowEntity.create({
            ...this.props,
            status,
            updatedAt: new Date(),
        });
    }
    activate() {
        if (this.props.status === 'active') {
            return this;
        }
        return this.updateStatus('active');
    }
    pause() {
        if (this.props.status !== 'active') {
            throw new Error('Only active workflows can be paused');
        }
        return this.updateStatus('paused');
    }
    resume() {
        if (this.props.status !== 'paused') {
            throw new Error('Only paused workflows can be resumed');
        }
        return this.updateStatus('active');
    }
    complete() {
        return this.updateStatus('completed');
    }
    archive() {
        return this.updateStatus('archived');
    }
    updateName(name) {
        return WorkflowEntity.create({
            ...this.props,
            name,
            updatedAt: new Date(),
        });
    }
    updateDescription(description) {
        return WorkflowEntity.create({
            ...this.props,
            description,
            updatedAt: new Date(),
        });
    }
    addTrigger(trigger) {
        return WorkflowEntity.create({
            ...this.props,
            triggers: [...this.props.triggers, trigger],
            updatedAt: new Date(),
        });
    }
    updateTrigger(index, trigger) {
        if (index < 0 || index >= this.props.triggers.length) {
            throw new Error(`Invalid trigger index: ${index}`);
        }
        return WorkflowEntity.create({
            ...this.props,
            triggers: this.props.triggers.map((t, i) => i === index ? trigger : t),
            updatedAt: new Date(),
        });
    }
    enableTrigger(index) {
        const trigger = this.props.triggers[index];
        if (!trigger) {
            throw new Error(`Trigger not found at index: ${index}`);
        }
        return this.updateTrigger(index, { ...trigger, enabled: true });
    }
    disableTrigger(index) {
        const trigger = this.props.triggers[index];
        if (!trigger) {
            throw new Error(`Trigger not found at index: ${index}`);
        }
        return this.updateTrigger(index, { ...trigger, enabled: false });
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.workflowId === other.props.workflowId;
    }
    // --- Serialization ---
    toJSON() {
        return {
            workflow_id: this.props.workflowId,
            name: this.props.name,
            description: this.props.description,
            kr_id: this.props.krId,
            project_id: this.props.projectId,
            status: this.props.status,
            steps: this.props.steps.map(stage => stage.map(step => ({
                id: step.id,
                task_id: step.taskId,
                condition: step.condition,
                timeout_minutes: step.timeoutMinutes,
                on_failure: step.onFailure,
                retry_config: step.retryConfig ? {
                    max_retries: step.retryConfig.maxRetries,
                    backoff_strategy: step.retryConfig.backoffStrategy,
                    initial_delay_seconds: step.retryConfig.initialDelaySeconds,
                } : undefined,
            }))),
            triggers: this.props.triggers.map(t => ({
                trigger_type: t.triggerType,
                enabled: t.enabled,
                event_source: t.eventSource,
                event_type: t.eventType,
                kr_id: t.krId,
                schedule: t.schedule,
            })),
            created_at: this.props.createdAt.toISOString(),
            updated_at: this.props.updatedAt.toISOString(),
            created_by: this.props.createdBy,
            meta: this.props.meta,
        };
    }
}
exports.WorkflowEntity = WorkflowEntity;
