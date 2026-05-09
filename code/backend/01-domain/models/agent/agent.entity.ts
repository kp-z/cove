/**
 * AgentEntity - 智能体实体（聚合根）
 *
 * AI 智能体，执行任务的核心单元。
 *
 * 业务规则：
 * - agentId, name 不能为空
 * - status 只能是 active | idle | disabled | error
 * - 已激活的 agent 不能再激活
 */

export type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';

const VALID_STATUSES: readonly AgentStatus[] = ['active', 'idle', 'disabled', 'error'];

export interface AgentEntityProps {
  readonly agentId: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly status: AgentStatus;
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface AgentEntityJSON {
  readonly agent_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly status: AgentStatus;
  readonly capabilities: readonly string[];
  readonly tags: readonly string[];
  readonly created_by: string;
  readonly created_at: string;
}

export class AgentEntity {
  private constructor(private readonly props: AgentEntityProps) {
    this.validate();
  }

  static create(props: AgentEntityProps): AgentEntity {
    return new AgentEntity(props);
  }

  static fromJSON(json: AgentEntityJSON): AgentEntity {
    return AgentEntity.create({
      agentId: json.agent_id,
      name: json.name,
      displayName: json.display_name,
      description: json.description,
      status: json.status,
      capabilities: json.capabilities,
      tags: json.tags,
      createdBy: json.created_by,
      createdAt: new Date(json.created_at),
    });
  }

  private validate(): void {
    if (!this.props.agentId || this.props.agentId.trim() === '') {
      throw new Error('Agent ID cannot be empty');
    }
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error('Agent name cannot be empty');
    }
    if (!VALID_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid agent status: ${this.props.status}`);
    }
  }

  // --- Getters ---

  get agentId(): string { return this.props.agentId; }
  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string | undefined { return this.props.description; }
  get status(): AgentStatus { return this.props.status; }
  get capabilities(): readonly string[] { return this.props.capabilities ?? []; }
  get tags(): readonly string[] { return this.props.tags ?? []; }
  get createdBy(): string { return this.props.createdBy; }
  get createdAt(): Date { return this.props.createdAt; }

  // --- Status management ---

  activate(): AgentEntity {
    if (this.props.status === 'active') {
      throw new Error('Agent is already active');
    }
    return AgentEntity.create({ ...this.props, status: 'active' });
  }

  deactivate(): AgentEntity {
    return AgentEntity.create({ ...this.props, status: 'idle' });
  }

  disable(): AgentEntity {
    return AgentEntity.create({ ...this.props, status: 'disabled' });
  }

  // --- Immutable updates ---

  updateName(name: string): AgentEntity {
    return AgentEntity.create({ ...this.props, name });
  }

  updateDisplayName(displayName: string): AgentEntity {
    return AgentEntity.create({ ...this.props, displayName });
  }

  updateDescription(description: string): AgentEntity {
    return AgentEntity.create({ ...this.props, description });
  }

  addCapability(capability: string): AgentEntity {
    if (this.capabilities.includes(capability)) {
      throw new Error('Capability already exists');
    }
    return AgentEntity.create({
      ...this.props,
      capabilities: [...this.capabilities, capability],
    });
  }

  removeCapability(capability: string): AgentEntity {
    return AgentEntity.create({
      ...this.props,
      capabilities: this.capabilities.filter(c => c !== capability),
    });
  }

  addTag(tag: string): AgentEntity {
    if (this.tags.includes(tag)) {
      throw new Error('Tag already exists');
    }
    return AgentEntity.create({
      ...this.props,
      tags: [...this.tags, tag],
    });
  }

  removeTag(tag: string): AgentEntity {
    return AgentEntity.create({
      ...this.props,
      tags: this.tags.filter(t => t !== tag),
    });
  }

  // --- Equality (by ID) ---

  equals(other: AgentEntity): boolean {
    return this.props.agentId === other.props.agentId;
  }

  // --- Serialization ---

  toJSON(): AgentEntityJSON {
    return {
      agent_id: this.props.agentId,
      name: this.props.name,
      display_name: this.props.displayName,
      description: this.props.description,
      status: this.props.status,
      capabilities: [...this.capabilities],
      tags: [...this.tags],
      created_by: this.props.createdBy,
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
