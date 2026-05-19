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

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type OnFailureStrategy = 'fail' | 'continue' | 'retry';
export type BackoffStrategy = 'linear' | 'exponential';
export type TriggerType = 'manual' | 'schedule' | 'event' | 'webhook';

const VALID_WORKFLOW_STATUSES: readonly WorkflowStatus[] = ['draft', 'active', 'paused', 'completed', 'archived'];
const VALID_ON_FAILURE_STRATEGIES: readonly OnFailureStrategy[] = ['fail', 'continue', 'retry'];

export interface WorkflowStep {
  readonly id: string;
  readonly taskId: string;
  readonly condition?: string;
  readonly timeoutMinutes?: number;
  readonly onFailure?: OnFailureStrategy;
  readonly retryConfig?: {
    readonly maxRetries: number;
    readonly backoffStrategy: BackoffStrategy;
    readonly initialDelaySeconds: number;
  };
}

export interface WorkflowTrigger {
  readonly triggerType: TriggerType;
  readonly enabled: boolean;
  readonly eventSource?: string;
  readonly eventType?: string;
  readonly krId?: string;
  readonly schedule?: string;
}

export interface WorkflowEntityProps {
  readonly workflowId: string;
  readonly name: string;
  readonly description?: string;
  readonly krId?: string;
  readonly projectId: string;
  readonly status: WorkflowStatus;
  readonly steps: readonly (readonly WorkflowStep[])[]; // Nested array: stages -> parallel steps
  readonly triggers: readonly WorkflowTrigger[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: {
    readonly id: string;
    readonly type: 'human' | 'agent';
  };
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
  };
}

export interface WorkflowEntityJSON {
  readonly workflow_id: string;
  readonly name: string;
  readonly description?: string;
  readonly kr_id?: string;
  readonly project_id: string;
  readonly status: WorkflowStatus;
  readonly steps: readonly (readonly {
    readonly id: string;
    readonly task_id: string;
    readonly condition?: string;
    readonly timeout_minutes?: number;
    readonly on_failure?: OnFailureStrategy;
    readonly retry_config?: {
      readonly max_retries: number;
      readonly backoff_strategy: BackoffStrategy;
      readonly initial_delay_seconds: number;
    };
  }[])[];
  readonly triggers: readonly {
    readonly trigger_type: TriggerType;
    readonly enabled: boolean;
    readonly event_source?: string;
    readonly event_type?: string;
    readonly kr_id?: string;
    readonly schedule?: string;
  }[];
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by: {
    readonly id: string;
    readonly type: 'human' | 'agent';
  };
  readonly meta: {
    readonly tags?: readonly string[];
    readonly category?: string;
  };
}

export class WorkflowEntity {
  private constructor(private readonly props: WorkflowEntityProps) {
    this.validate();
  }

  static create(props: WorkflowEntityProps): WorkflowEntity {
    return new WorkflowEntity(props);
  }

  static fromJSON(json: WorkflowEntityJSON): WorkflowEntity {
    return WorkflowEntity.create({
      workflowId: json.workflow_id,
      name: json.name,
      description: json.description,
      krId: json.kr_id,
      projectId: json.project_id,
      status: json.status,
      steps: json.steps.map(stage =>
        stage.map(step => ({
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
        }))
      ),
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

  private validate(): void {
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
    const stepIds = new Set<string>();
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

  get workflowId(): string { return this.props.workflowId; }
  get name(): string { return this.props.name; }
  get description(): string | undefined { return this.props.description; }
  get krId(): string | undefined { return this.props.krId; }
  get projectId(): string { return this.props.projectId; }
  get status(): WorkflowStatus { return this.props.status; }
  get steps(): readonly (readonly WorkflowStep[])[] { return this.props.steps; }
  get triggers(): readonly WorkflowTrigger[] { return this.props.triggers; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get createdBy(): WorkflowEntityProps['createdBy'] { return this.props.createdBy; }
  get meta(): WorkflowEntityProps['meta'] { return this.props.meta; }

  // --- Status checks ---

  isDraft(): boolean { return this.props.status === 'draft'; }
  isActive(): boolean { return this.props.status === 'active'; }
  isPaused(): boolean { return this.props.status === 'paused'; }
  isCompleted(): boolean { return this.props.status === 'completed'; }
  isArchived(): boolean { return this.props.status === 'archived'; }

  // --- Step operations ---

  getStep(stepId: string): WorkflowStep | undefined {
    for (const stage of this.props.steps) {
      const step = stage.find(s => s.id === stepId);
      if (step) return step;
    }
    return undefined;
  }

  hasStep(stepId: string): boolean {
    return !!this.getStep(stepId);
  }

  getStageIndex(stepId: string): number {
    for (let i = 0; i < this.props.steps.length; i++) {
      const stage = this.props.steps[i];
      if (stage && stage.some(s => s.id === stepId)) {
        return i;
      }
    }
    return -1;
  }

  getStage(stageIndex: number): readonly WorkflowStep[] | undefined {
    return this.props.steps[stageIndex];
  }

  getTotalStages(): number {
    return this.props.steps.length;
  }

  getTotalSteps(): number {
    return this.props.steps.reduce((sum, stage) => sum + stage.length, 0);
  }

  isParallelStage(stageIndex: number): boolean {
    const stage = this.getStage(stageIndex);
    return stage ? stage.length > 1 : false;
  }

  // --- Trigger operations ---

  getEnabledTriggers(): readonly WorkflowTrigger[] {
    return this.props.triggers.filter(t => t.enabled);
  }

  hasManualTrigger(): boolean {
    return this.props.triggers.some(t => t.triggerType === 'manual' && t.enabled);
  }

  // --- Immutable updates ---

  updateStatus(status: WorkflowStatus): WorkflowEntity {
    return WorkflowEntity.create({
      ...this.props,
      status,
      updatedAt: new Date(),
    });
  }

  activate(): WorkflowEntity {
    if (this.props.status === 'active') {
      return this;
    }
    return this.updateStatus('active');
  }

  pause(): WorkflowEntity {
    if (this.props.status !== 'active') {
      throw new Error('Only active workflows can be paused');
    }
    return this.updateStatus('paused');
  }

  resume(): WorkflowEntity {
    if (this.props.status !== 'paused') {
      throw new Error('Only paused workflows can be resumed');
    }
    return this.updateStatus('active');
  }

  complete(): WorkflowEntity {
    return this.updateStatus('completed');
  }

  archive(): WorkflowEntity {
    return this.updateStatus('archived');
  }

  updateName(name: string): WorkflowEntity {
    return WorkflowEntity.create({
      ...this.props,
      name,
      updatedAt: new Date(),
    });
  }

  updateDescription(description: string): WorkflowEntity {
    return WorkflowEntity.create({
      ...this.props,
      description,
      updatedAt: new Date(),
    });
  }

  addTrigger(trigger: WorkflowTrigger): WorkflowEntity {
    return WorkflowEntity.create({
      ...this.props,
      triggers: [...this.props.triggers, trigger],
      updatedAt: new Date(),
    });
  }

  updateTrigger(index: number, trigger: WorkflowTrigger): WorkflowEntity {
    if (index < 0 || index >= this.props.triggers.length) {
      throw new Error(`Invalid trigger index: ${index}`);
    }
    return WorkflowEntity.create({
      ...this.props,
      triggers: this.props.triggers.map((t, i) => i === index ? trigger : t),
      updatedAt: new Date(),
    });
  }

  enableTrigger(index: number): WorkflowEntity {
    const trigger = this.props.triggers[index];
    if (!trigger) {
      throw new Error(`Trigger not found at index: ${index}`);
    }
    return this.updateTrigger(index, { ...trigger, enabled: true });
  }

  disableTrigger(index: number): WorkflowEntity {
    const trigger = this.props.triggers[index];
    if (!trigger) {
      throw new Error(`Trigger not found at index: ${index}`);
    }
    return this.updateTrigger(index, { ...trigger, enabled: false });
  }

  // --- Equality (by ID) ---

  equals(other: WorkflowEntity): boolean {
    return this.props.workflowId === other.props.workflowId;
  }

  // --- Serialization ---

  toJSON(): WorkflowEntityJSON {
    return {
      workflow_id: this.props.workflowId,
      name: this.props.name,
      description: this.props.description,
      kr_id: this.props.krId,
      project_id: this.props.projectId,
      status: this.props.status,
      steps: this.props.steps.map(stage =>
        stage.map(step => ({
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
        }))
      ),
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
