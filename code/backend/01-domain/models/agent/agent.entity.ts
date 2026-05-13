/**
 * AgentEntity - 智能体实体（聚合根）
 *
 * AI 智能体，执行任务的核心单元。
 *
 * 业务规则：
 * - agentId, name 不能为空
 * - status 只能是 active | idle | disabled | error
 * - category 表示 Agent 的职能分类，不是运行模式
 * - 已激活的 agent 不能再激活
 *
 * 设计决策：
 * - 运行模式（daemon/session/workflow）不是 Agent 本质属性，由 AgentDaemon 调度配置决定
 */

export type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';
export type AgentCategory = 'engineering' | 'operations' | 'design' | 'qa' | 'research' | 'platform' | 'collaboration' | 'custom';

const VALID_STATUSES: readonly AgentStatus[] = ['active', 'idle', 'disabled', 'error'];
const VALID_CATEGORIES: readonly AgentCategory[] = ['engineering', 'operations', 'design', 'qa', 'research', 'platform', 'collaboration', 'custom'];

// --- Sub-config interfaces ---

export interface AgentRuntimeConfig {
  readonly model: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly systemPrompt?: string;
}

export interface AgentPersona {
  readonly name: string;
  readonly role: string;
  readonly tone?: string;
  readonly instructions?: string;
}

export interface AgentSkills {
  readonly skillIds: readonly string[];
}

export interface AgentTools {
  readonly toolIds: readonly string[];
}

export interface AgentTriggers {
  readonly onMention?: boolean;
  readonly onDirectMessage?: boolean;
  readonly onSchedule?: string;
  readonly customRules?: readonly string[];
}

export interface AgentEntityProps {
  readonly agentId: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly status: AgentStatus;
  readonly category: AgentCategory;
  readonly capabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly runtimeConfig?: AgentRuntimeConfig;
  readonly persona?: AgentPersona;
  readonly skills?: AgentSkills;
  readonly tools?: AgentTools;
  readonly triggers?: AgentTriggers;
  readonly createdBy: string;
  readonly createdAt: Date;
}

export interface AgentEntityJSON {
  readonly agent_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly status: AgentStatus;
  readonly category: AgentCategory;
  readonly capabilities: readonly string[];
  readonly tags: readonly string[];
  readonly runtime_config?: AgentRuntimeConfig;
  readonly persona?: AgentPersona;
  readonly skills?: AgentSkills;
  readonly tools?: AgentTools;
  readonly triggers?: AgentTriggers;
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
      category: json.category,
      capabilities: json.capabilities,
      tags: json.tags,
      runtimeConfig: json.runtime_config,
      persona: json.persona,
      skills: json.skills,
      tools: json.tools,
      triggers: json.triggers,
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
    if (!VALID_CATEGORIES.includes(this.props.category)) {
      throw new Error(`Invalid agent category: ${this.props.category}`);
    }
  }

  // --- Getters ---

  get agentId(): string { return this.props.agentId; }
  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string | undefined { return this.props.description; }
  get status(): AgentStatus { return this.props.status; }
  get category(): AgentCategory { return this.props.category; }
  get capabilities(): readonly string[] { return this.props.capabilities ?? []; }
  get tags(): readonly string[] { return this.props.tags ?? []; }
  get runtimeConfig(): AgentRuntimeConfig | undefined { return this.props.runtimeConfig; }
  get persona(): AgentPersona | undefined { return this.props.persona; }
  get skills(): AgentSkills | undefined { return this.props.skills; }
  get tools(): AgentTools | undefined { return this.props.tools; }
  get triggers(): AgentTriggers | undefined { return this.props.triggers; }
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

  updateCategory(category: AgentCategory): AgentEntity {
    return AgentEntity.create({ ...this.props, category });
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

  // --- Sub-config updates ---

  updateRuntimeConfig(config: AgentRuntimeConfig): AgentEntity {
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }
    return AgentEntity.create({ ...this.props, runtimeConfig: config });
  }

  updatePersona(persona: AgentPersona): AgentEntity {
    return AgentEntity.create({ ...this.props, persona });
  }

  updateSkills(skills: AgentSkills): AgentEntity {
    return AgentEntity.create({ ...this.props, skills });
  }

  updateTools(tools: AgentTools): AgentEntity {
    return AgentEntity.create({ ...this.props, tools });
  }

  updateTriggers(triggers: AgentTriggers): AgentEntity {
    return AgentEntity.create({ ...this.props, triggers });
  }

  canBeStarted(): boolean {
    return !!this.props.runtimeConfig?.model;
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
      category: this.props.category,
      capabilities: [...this.capabilities],
      tags: [...this.tags],
      runtime_config: this.props.runtimeConfig,
      persona: this.props.persona,
      skills: this.props.skills,
      tools: this.props.tools,
      triggers: this.props.triggers,
      created_by: this.props.createdBy,
      created_at: this.props.createdAt.toISOString(),
    };
  }
}
