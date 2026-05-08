/**
 * AgentEntity - 智能体实体（聚合根）
 *
 * AI 智能体，执行任务的核心单元。
 *
 * 业务规则：
 * - agentId, name 不能为空
 * - framework 只能是 claude_code | openclaw | custom
 * - status: active 时必须有 framework 配置
 * - 已激活的 agent 不能再激活
 */

export type AgentFramework = 'claude_code' | 'openclaw' | 'custom';
export type AgentType = 'session' | 'daemon' | 'scheduled';
export type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';

const VALID_FRAMEWORKS: readonly AgentFramework[] = ['claude_code', 'openclaw', 'custom'];
const VALID_AGENT_TYPES: readonly AgentType[] = ['session', 'daemon', 'scheduled'];
const VALID_STATUSES: readonly AgentStatus[] = ['active', 'idle', 'disabled', 'error'];

export interface AgentEntityProps {
  readonly agentId: string;
  readonly name: string;
  readonly framework: AgentFramework;
  readonly agentType: AgentType;
  readonly status: AgentStatus;
  readonly tags?: readonly string[];
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface AgentEntityJSON {
  readonly agent_id: string;
  readonly name: string;
  readonly framework: AgentFramework;
  readonly agent_type: AgentType;
  readonly status: AgentStatus;
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
      framework: json.framework,
      agentType: json.agent_type,
      status: json.status,
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
    if (!VALID_FRAMEWORKS.includes(this.props.framework)) {
      throw new Error(`Invalid framework: ${this.props.framework}`);
    }
    if (!VALID_AGENT_TYPES.includes(this.props.agentType)) {
      throw new Error(`Invalid agent type: ${this.props.agentType}`);
    }
    if (!VALID_STATUSES.includes(this.props.status)) {
      throw new Error(`Invalid agent status: ${this.props.status}`);
    }
  }

  // --- Getters ---

  get agentId(): string { return this.props.agentId; }
  get name(): string { return this.props.name; }
  get framework(): AgentFramework { return this.props.framework; }
  get agentType(): AgentType { return this.props.agentType; }
  get status(): AgentStatus { return this.props.status; }
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
      framework: this.props.framework,
      agent_type: this.props.agentType,
      status: this.props.status,
      tags: [...this.tags],
      created_by: this.props.createdBy,
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
