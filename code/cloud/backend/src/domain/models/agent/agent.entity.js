"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentEntity = void 0;
const VALID_STATUSES = ['active', 'idle', 'disabled', 'error'];
const VALID_SCOPES = ['built-in', 'user', 'project', 'admin'];
class AgentEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new AgentEntity(props);
    }
    static fromJSON(json) {
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
    validate() {
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
    get agentId() { return this.props.agentId; }
    get name() { return this.props.name; }
    get displayName() { return this.props.displayName; }
    get description() { return this.props.description; }
    get status() { return this.props.status; }
    get scope() { return this.props.scope; }
    get projectIds() { return this.props.projectIds ?? []; }
    get capabilities() { return this.props.capabilities ?? []; }
    get tags() { return this.props.tags ?? []; }
    get runtimeConfig() { return this.props.runtimeConfig; }
    get persona() { return this.props.persona; }
    get skills() { return this.props.skills; }
    get tools() { return this.props.tools; }
    get triggers() { return this.props.triggers; }
    get createdBy() { return this.props.createdBy; }
    get createdAt() { return this.props.createdAt; }
    // --- Status management ---
    activate() {
        if (this.props.status === 'active') {
            throw new Error('Agent is already active');
        }
        return AgentEntity.create({ ...this.props, status: 'active' });
    }
    deactivate() {
        return AgentEntity.create({ ...this.props, status: 'idle' });
    }
    disable() {
        return AgentEntity.create({ ...this.props, status: 'disabled' });
    }
    // --- Immutable updates ---
    updateName(name) {
        return AgentEntity.create({ ...this.props, name });
    }
    updateDisplayName(displayName) {
        return AgentEntity.create({ ...this.props, displayName });
    }
    updateDescription(description) {
        return AgentEntity.create({ ...this.props, description });
    }
    updateScope(scope) {
        return AgentEntity.create({ ...this.props, scope });
    }
    linkToProject(projectId) {
        if (this.projectIds.includes(projectId)) {
            throw new Error('Agent is already linked to this project');
        }
        return AgentEntity.create({
            ...this.props,
            projectIds: [...this.projectIds, projectId],
        });
    }
    unlinkFromProject(projectId) {
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
    addCapability(capability) {
        if (this.capabilities.includes(capability)) {
            throw new Error('Capability already exists');
        }
        return AgentEntity.create({
            ...this.props,
            capabilities: [...this.capabilities, capability],
        });
    }
    removeCapability(capability) {
        return AgentEntity.create({
            ...this.props,
            capabilities: this.capabilities.filter(c => c !== capability),
        });
    }
    addTag(tag) {
        if (this.tags.includes(tag)) {
            throw new Error('Tag already exists');
        }
        return AgentEntity.create({
            ...this.props,
            tags: [...this.tags, tag],
        });
    }
    removeTag(tag) {
        return AgentEntity.create({
            ...this.props,
            tags: this.tags.filter(t => t !== tag),
        });
    }
    // --- Sub-config updates ---
    updateRuntimeConfig(config) {
        if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
            throw new Error('Temperature must be between 0 and 2');
        }
        return AgentEntity.create({ ...this.props, runtimeConfig: config });
    }
    updatePersona(persona) {
        return AgentEntity.create({ ...this.props, persona });
    }
    updateSkills(skills) {
        return AgentEntity.create({ ...this.props, skills });
    }
    updateTools(tools) {
        return AgentEntity.create({ ...this.props, tools });
    }
    updateTriggers(triggers) {
        return AgentEntity.create({ ...this.props, triggers });
    }
    canBeStarted() {
        return !!this.props.runtimeConfig?.model;
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.agentId === other.props.agentId;
    }
    // --- Serialization ---
    toJSON() {
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
exports.AgentEntity = AgentEntity;
