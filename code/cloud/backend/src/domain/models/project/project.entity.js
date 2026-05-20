"use strict";
/**
 * ProjectEntity - 项目实体（聚合根）
 *
 * 项目是顶层容器，组织 Agent、Channel、OKR。
 * 通过 ID 关联其他实体，不直接持有对象。
 *
 * 业务规则：
 * - projectId, name 不能为空
 * - status 只能是 active | archived | maintenance
 * - visibility 只能是 public | private | internal
 * - 已归档的项目不能再归档
 * - 已激活的项目不能再激活
 * - 关联 ID 不能重复
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectEntity = void 0;
const VALID_STATUSES = ['active', 'archived', 'maintenance'];
const VALID_VISIBILITIES = ['public', 'private', 'internal'];
class ProjectEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new ProjectEntity(props);
    }
    static fromJSON(json) {
        return ProjectEntity.create({
            projectId: json.project_id,
            name: json.name,
            displayName: json.display_name,
            description: json.description,
            status: json.status,
            visibility: json.visibility,
            ownerId: json.owner_id,
            channelIds: json.channels,
            agentIds: json.agents,
            okrIds: json.okrs,
            createdAt: new Date(json.created_at),
        });
    }
    validate() {
        if (!this.props.projectId || this.props.projectId.trim() === '') {
            throw new Error('Project ID cannot be empty');
        }
        if (!this.props.name || this.props.name.trim() === '') {
            throw new Error('Project name cannot be empty');
        }
        if (!VALID_STATUSES.includes(this.props.status)) {
            throw new Error(`Invalid project status: ${this.props.status}`);
        }
        if (!VALID_VISIBILITIES.includes(this.props.visibility)) {
            throw new Error(`Invalid visibility: ${this.props.visibility}`);
        }
    }
    // --- Getters ---
    get projectId() { return this.props.projectId; }
    get name() { return this.props.name; }
    get displayName() { return this.props.displayName; }
    get description() { return this.props.description; }
    get status() { return this.props.status; }
    get visibility() { return this.props.visibility; }
    get ownerId() { return this.props.ownerId; }
    get channelIds() { return this.props.channelIds ?? []; }
    get agentIds() { return this.props.agentIds ?? []; }
    get okrIds() { return this.props.okrIds ?? []; }
    get createdAt() { return this.props.createdAt; }
    // --- Status management ---
    archive() {
        if (this.props.status === 'archived') {
            throw new Error('Project is already archived');
        }
        return ProjectEntity.create({ ...this.props, status: 'archived' });
    }
    activate() {
        if (this.props.status === 'active') {
            throw new Error('Project is already active');
        }
        return ProjectEntity.create({ ...this.props, status: 'active' });
    }
    // --- Association management ---
    addChannel(channelId) {
        if (this.channelIds.includes(channelId)) {
            throw new Error('Channel already exists in this project');
        }
        return ProjectEntity.create({
            ...this.props,
            channelIds: [...this.channelIds, channelId],
        });
    }
    removeChannel(channelId) {
        return ProjectEntity.create({
            ...this.props,
            channelIds: this.channelIds.filter(id => id !== channelId),
        });
    }
    addAgent(agentId) {
        if (this.agentIds.includes(agentId)) {
            throw new Error('Agent already exists in this project');
        }
        return ProjectEntity.create({
            ...this.props,
            agentIds: [...this.agentIds, agentId],
        });
    }
    removeAgent(agentId) {
        return ProjectEntity.create({
            ...this.props,
            agentIds: this.agentIds.filter(id => id !== agentId),
        });
    }
    addOkr(okrId) {
        if (this.okrIds.includes(okrId)) {
            throw new Error('OKR already exists in this project');
        }
        return ProjectEntity.create({
            ...this.props,
            okrIds: [...this.okrIds, okrId],
        });
    }
    // --- Immutable updates ---
    updateName(name) {
        return ProjectEntity.create({ ...this.props, name });
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.projectId === other.props.projectId;
    }
    // --- Serialization ---
    toJSON() {
        return {
            project_id: this.props.projectId,
            name: this.props.name,
            display_name: this.props.displayName,
            description: this.props.description,
            status: this.props.status,
            visibility: this.props.visibility,
            owner_id: this.props.ownerId,
            channels: [...this.channelIds],
            agents: [...this.agentIds],
            okrs: [...this.okrIds],
            created_at: this.props.createdAt.toISOString(),
        };
    }
}
exports.ProjectEntity = ProjectEntity;
