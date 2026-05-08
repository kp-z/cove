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

import { AssigneeRef, type AssigneeRefJSON } from '../value-objects';
import { ActorRef, type ActorRefProps } from '../value-objects';

export type TaskType = 'single_agent' | 'multi_agent' | 'workflow';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'in_review' | 'done' | 'cancelled';

const VALID_TASK_TYPES: readonly TaskType[] = ['single_agent', 'multi_agent', 'workflow'];
const VALID_PRIORITIES: readonly TaskPriority[] = ['P0', 'P1', 'P2', 'P3'];
const VALID_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'];
const TERMINAL_STATUSES: readonly TaskStatus[] = ['done', 'cancelled'];

export interface TaskEntityProps {
  readonly taskId: string;
  readonly title: string;
  readonly description?: string;
  readonly taskType: TaskType;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly channelId: string;
  readonly projectId: string;
  readonly krId?: string;
  readonly assignee?: AssigneeRef;
  readonly dependsOn?: readonly string[];
  readonly createdBy: ActorRef;
  readonly createdAt: Date;
}

export interface TaskEntityJSON {
  readonly task_id: string;
  readonly title: string;
  readonly description?: string;
  readonly task_type: TaskType;
  readonly priority: TaskPriority;
  readonly status: TaskStatus;
  readonly channel_id: string;
  readonly project_id: string;
  readonly kr_id?: string;
  readonly assignee?: AssigneeRefJSON;
  readonly depends_on: readonly string[];
  readonly created_by: ActorRefProps;
  readonly created_at: string;
}

export class TaskEntity {
  private constructor(private readonly props: TaskEntityProps) {
    this.validate();
  }

  static create(props: TaskEntityProps): TaskEntity {
    return new TaskEntity(props);
  }

  static fromJSON(json: TaskEntityJSON): TaskEntity {
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
      assignee: json.assignee ? AssigneeRef.fromJSON(json.assignee) : undefined,
      dependsOn: json.depends_on,
      createdBy: ActorRef.create(json.created_by),
      createdAt: new Date(json.created_at),
    });
  }

  private validate(): void {
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

  get taskId(): string { return this.props.taskId; }
  get title(): string { return this.props.title; }
  get description(): string | undefined { return this.props.description; }
  get taskType(): TaskType { return this.props.taskType; }
  get priority(): TaskPriority { return this.props.priority; }
  get status(): TaskStatus { return this.props.status; }
  get channelId(): string { return this.props.channelId; }
  get projectId(): string { return this.props.projectId; }
  get krId(): string | undefined { return this.props.krId; }
  get assignee(): AssigneeRef | undefined { return this.props.assignee; }
  get dependsOn(): readonly string[] { return this.props.dependsOn ?? []; }
  get createdBy(): ActorRef { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }

  // --- Status flow ---

  start(): TaskEntity {
    if (this.props.status !== 'todo' && this.props.status !== 'blocked') {
      throw new Error(`Cannot start task from status: ${this.props.status}`);
    }
    return TaskEntity.create({ ...this.props, status: 'in_progress' });
  }

  submitForReview(): TaskEntity {
    if (this.props.status !== 'in_progress') {
      throw new Error(`Cannot submit for review from status: ${this.props.status}`);
    }
    return TaskEntity.create({ ...this.props, status: 'in_review' });
  }

  complete(): TaskEntity {
    if (this.props.status !== 'in_review') {
      throw new Error(`Cannot complete task from status: ${this.props.status}`);
    }
    return TaskEntity.create({ ...this.props, status: 'done' });
  }

  block(): TaskEntity {
    if (TERMINAL_STATUSES.includes(this.props.status)) {
      throw new Error(`Cannot block task from status: ${this.props.status}`);
    }
    return TaskEntity.create({ ...this.props, status: 'blocked' });
  }

  cancel(): TaskEntity {
    if (TERMINAL_STATUSES.includes(this.props.status)) {
      throw new Error(`Cannot cancel task from status: ${this.props.status}`);
    }
    return TaskEntity.create({ ...this.props, status: 'cancelled' });
  }

  // --- Assignment ---

  assignTo(assignee: AssigneeRef): TaskEntity {
    return TaskEntity.create({ ...this.props, assignee });
  }

  claim(assignee: AssigneeRef): TaskEntity {
    const assigned = this.assignTo(assignee);
    return assigned.start();
  }

  // --- Dependencies ---

  addDependency(taskId: string): TaskEntity {
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

  removeDependency(taskId: string): TaskEntity {
    return TaskEntity.create({
      ...this.props,
      dependsOn: this.dependsOn.filter(id => id !== taskId),
    });
  }

  // --- Equality (by ID) ---

  equals(other: TaskEntity): boolean {
    return this.props.taskId === other.props.taskId;
  }

  // --- Serialization ---

  toJSON(): TaskEntityJSON {
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
      assignee: this.props.assignee?.toJSON(),
      depends_on: [...this.dependsOn],
      created_by: this.props.createdBy.toJSON(),
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
