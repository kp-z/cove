"use strict";
/**
 * TaskEntity - 任务实体（聚合根）
 *
 * 工作的基本单元。
 *
 * 业务不变量：
 * - 状态只能按 todo → in_progress → in_review → done 流转
 * - 不能跳步（todo 不能直接到 done）
 * - blocked 和 cancelled 可以从任何非终态进入
 * - done 和 cancelled 是终态
 * - Task 不能依赖自己
 * - 依赖不能重复
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskEntity = void 0;
const value_objects_1 = require("../value-objects");
const value_objects_2 = require("../value-objects");
const VALID_TASK_TYPES = ['single_agent', 'multi_agent', 'workflow'];
const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const VALID_STATUSES = ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'];
const TERMINAL_STATUSES = ['done', 'cancelled'];
class TaskEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new TaskEntity(props);
    }
    static fromJSON(json) {
        return TaskEntity.create({
            taskId: json.task_id,
            title: json.title,
            description: json.description,
            taskType: json.task_type,
            priority: json.priority,
            status: json.status,
            channelId: json.channel_id,
            projectId: json.project_id,
            krId: json.kr_id,
            taskNumber: json.task_number,
            sourceMessageId: json.source_message_id,
            assignee: json.assignee ? value_objects_1.AssigneeRef.fromJSON(json.assignee) : undefined,
            dependsOn: json.depends_on,
            createdBy: value_objects_2.ActorRef.create(json.created_by),
            createdAt: new Date(json.created_at),
        });
    }
    validate() {
        if (!this.props.taskId || this.props.taskId.trim() === '') {
            throw new Error('Task ID cannot be empty');
        }
        if (!this.props.title || this.props.title.trim() === '') {
            throw new Error('Task title cannot be empty');
        }
        if (!VALID_TASK_TYPES.includes(this.props.taskType)) {
            throw new Error(`Invalid task type: ${this.props.taskType}`);
        }
        if (!VALID_PRIORITIES.includes(this.props.priority)) {
            throw new Error(`Invalid priority: ${this.props.priority}`);
        }
        if (!VALID_STATUSES.includes(this.props.status)) {
            throw new Error(`Invalid task status: ${this.props.status}`);
        }
    }
    // --- Getters ---
    get taskId() { return this.props.taskId; }
    get title() { return this.props.title; }
    get description() { return this.props.description; }
    get taskType() { return this.props.taskType; }
    get priority() { return this.props.priority; }
    get status() { return this.props.status; }
    get channelId() { return this.props.channelId; }
    get projectId() { return this.props.projectId; }
    get krId() { return this.props.krId; }
    get taskNumber() { return this.props.taskNumber; }
    get sourceMessageId() { return this.props.sourceMessageId; }
    get assignee() { return this.props.assignee; }
    get dependsOn() { return this.props.dependsOn ?? []; }
    get createdBy() { return this.props.createdBy; }
    get createdAt() { return this.props.createdAt; }
    // --- Status flow ---
    start() {
        if (this.props.status !== 'todo' && this.props.status !== 'blocked') {
            throw new Error(`Cannot start task from status: ${this.props.status}`);
        }
        return TaskEntity.create({ ...this.props, status: 'in_progress' });
    }
    submitForReview() {
        if (this.props.status !== 'in_progress') {
            throw new Error(`Cannot submit for review from status: ${this.props.status}`);
        }
        return TaskEntity.create({ ...this.props, status: 'in_review' });
    }
    complete() {
        if (this.props.status !== 'in_review') {
            throw new Error(`Cannot complete task from status: ${this.props.status}`);
        }
        return TaskEntity.create({ ...this.props, status: 'done' });
    }
    block() {
        if (TERMINAL_STATUSES.includes(this.props.status)) {
            throw new Error(`Cannot block task from status: ${this.props.status}`);
        }
        return TaskEntity.create({ ...this.props, status: 'blocked' });
    }
    cancel() {
        if (TERMINAL_STATUSES.includes(this.props.status)) {
            throw new Error(`Cannot cancel task from status: ${this.props.status}`);
        }
        return TaskEntity.create({ ...this.props, status: 'cancelled' });
    }
    // --- Assignment ---
    assignTo(assignee) {
        return TaskEntity.create({ ...this.props, assignee });
    }
    claim(assignee) {
        const assigned = this.assignTo(assignee);
        return assigned.start();
    }
    unclaim(userId) {
        if (!this.props.assignee || this.props.assignee.id !== userId) {
            throw new Error(`User ${userId} is not the assignee of this task`);
        }
        return TaskEntity.create({ ...this.props, assignee: undefined, status: 'todo' });
    }
    // --- Dependencies ---
    addDependency(taskId) {
        if (taskId === this.props.taskId) {
            throw new Error('Task cannot depend on itself');
        }
        if (this.dependsOn.includes(taskId)) {
            throw new Error('Dependency already exists');
        }
        return TaskEntity.create({
            ...this.props,
            dependsOn: [...this.dependsOn, taskId],
        });
    }
    removeDependency(taskId) {
        return TaskEntity.create({
            ...this.props,
            dependsOn: this.dependsOn.filter(id => id !== taskId),
        });
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.taskId === other.props.taskId;
    }
    // --- Serialization ---
    toJSON() {
        return {
            task_id: this.props.taskId,
            title: this.props.title,
            description: this.props.description,
            task_type: this.props.taskType,
            priority: this.props.priority,
            status: this.props.status,
            channel_id: this.props.channelId,
            project_id: this.props.projectId,
            kr_id: this.props.krId,
            task_number: this.props.taskNumber,
            source_message_id: this.props.sourceMessageId,
            assignee: this.props.assignee?.toJSON(),
            depends_on: [...this.dependsOn],
            created_by: this.props.createdBy.toJSON(),
            created_at: this.props.createdAt.toISOString(),
        };
    }
}
exports.TaskEntity = TaskEntity;
