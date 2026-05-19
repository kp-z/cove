/**
 * AgentEntity - 智能体实体（聚合根）
 *
 * AI 智能体，执行任务的核心单元。
 *
 * 业务规则：
 * - agentId, name 不能为空
 * - status 只能是 active | idle | disabled | error
 * - scope 表示 Agent 的权限范围和可见性：
 *   - built-in: 系统内置，所有用户可用
 *   - user: 用户级别，创建者跨项目可用
 *   - project: 项目级别，仅特定项目可用
 *   - admin: 管理员级别，系统管理和审计
 * - 已激活的 agent 不能再激活
 * - project scope 的 agent 必须关联至少一个项目
 *
 * 设计决策：
 * - 运行模式（daemon/session/workflow）不是 Agent 本质属性，由 AgentDaemon 调度配置决定
 * - projectIds 支持一个 agent 服务多个项目（特别是 user scope）
 */

export type AgentStatus = 'active' | 'idle' | 'disabled' | 'error';
export type AgentScope = 'built-in' | 'user' | 'project' | 'admin';

const VALID_STATUSES: readonly AgentStatus[] = ['active', 'idle', 'disabled', 'error'];
const VALID_SCOPES: readonly AgentScope[] = ['built-in', 'user', 'project', 'admin'];

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
  readonly scope: AgentScope;
  readonly projectIds?: readonly string[];
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
  readonly scope: AgentScope;
  readonly project_ids: readonly string[];
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
      scope: json.scope,
      projectIds: json.project_ids,
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
    if (!VALID_SCOPES.includes(this.props.scope)) {
      throw new Error(`Invalid agent scope: ${this.props.scope}`);
    }
    // project scope 的 agent 必须关联至少一个项目
    if (this.props.scope === 'project' && (!this.props.projectIds || this.props.projectIds.length === 0)) {
      throw new Error('Project-scoped agent must be linked to at least one project');
    }
  }

  // --- Getters ---

  get agentId(): string { return this.props.agentId; }
  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string | undefined { return this.props.description; }
  get status(): AgentStatus { return this.props.status; }
  get scope(): AgentScope { return this.props.scope; }
  get projectIds(): readonly string[] { return this.props.projectIds ?? []; }
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

  updateScope(scope: AgentScope): AgentEntity {
    return AgentEntity.create({ ...this.props, scope });
  }

  linkToProject(projectId: string): AgentEntity {
    if (this.projectIds.includes(projectId)) {
      throw new Error('Agent is already linked to this project');
    }
    return AgentEntity.create({
      ...this.props,
      projectIds: [...this.projectIds, projectId],
    });
  }

  unlinkFromProject(projectId: string): AgentEntity {
    const newProjectIds = this.projectIds.filter(id => id !== projectId);
    // project scope 的 agent 必须至少关联一个项目
    if (this.props.scope === 'project' && newProjectIds.length === 0) {
      throw new Error('Cannot unlink last project from project-scoped agent');
    }
    return AgentEntity.create({
      ...this.props,
      projectIds: newProjectIds,
    });
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
      scope: this.props.scope,
      project_ids: [...this.projectIds],
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
