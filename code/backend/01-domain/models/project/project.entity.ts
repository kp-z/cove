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

export type ProjectStatus = 'active' | 'archived' | 'maintenance';
export type ProjectVisibility = 'public' | 'private' | 'internal';

const VALID_STATUSES: readonly ProjectStatus[] = ['active', 'archived', 'maintenance'];
const VALID_VISIBILITIES: readonly ProjectVisibility[] = ['public', 'private', 'internal'];

export interface ProjectEntityProps {
  readonly projectId: string;
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly status: ProjectStatus;
  readonly visibility: ProjectVisibility;
  readonly ownerId: string;
  readonly channelIds?: readonly string[];
  readonly agentIds?: readonly string[];
  readonly okrIds?: readonly string[];
  readonly createdAt: Date;
}

export interface ProjectEntityJSON {
  readonly project_id: string;
  readonly name: string;
  readonly display_name: string;
  readonly description?: string;
  readonly status: ProjectStatus;
  readonly visibility: ProjectVisibility;
  readonly owner_id: string;
  readonly channels: readonly string[];
  readonly agents: readonly string[];
  readonly okrs: readonly string[];
  readonly created_at: string;
}

export class ProjectEntity {
  private constructor(private readonly props: ProjectEntityProps) {
    this.validate();
  }

  static create(props: ProjectEntityProps): ProjectEntity {
    return new ProjectEntity(props);
  }

  static fromJSON(json: ProjectEntityJSON): ProjectEntity {
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

  private validate(): void {
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

  get projectId(): string { return this.props.projectId; }
  get name(): string { return this.props.name; }
  get displayName(): string { return this.props.displayName; }
  get description(): string | undefined { return this.props.description; }
  get status(): ProjectStatus { return this.props.status; }
  get visibility(): ProjectVisibility { return this.props.visibility; }
  get ownerId(): string { return this.props.ownerId; }
  get channelIds(): readonly string[] { return this.props.channelIds ?? []; }
  get agentIds(): readonly string[] { return this.props.agentIds ?? []; }
  get okrIds(): readonly string[] { return this.props.okrIds ?? []; }
  get createdAt(): Date { return this.props.createdAt; }

  // --- Status management ---

  archive(): ProjectEntity {
    if (this.props.status === 'archived') {
      throw new Error('Project is already archived');
    }
    return ProjectEntity.create({ ...this.props, status: 'archived' });
  }

  activate(): ProjectEntity {
    if (this.props.status === 'active') {
      throw new Error('Project is already active');
    }
    return ProjectEntity.create({ ...this.props, status: 'active' });
  }

  // --- Association management ---

  addChannel(channelId: string): ProjectEntity {
    if (this.channelIds.includes(channelId)) {
      throw new Error('Channel already exists in this project');
    }
    return ProjectEntity.create({
      ...this.props,
      channelIds: [...this.channelIds, channelId],
    });
  }

  removeChannel(channelId: string): ProjectEntity {
    return ProjectEntity.create({
      ...this.props,
      channelIds: this.channelIds.filter(id => id !== channelId),
    });
  }

  addAgent(agentId: string): ProjectEntity {
    if (this.agentIds.includes(agentId)) {
      throw new Error('Agent already exists in this project');
    }
    return ProjectEntity.create({
      ...this.props,
      agentIds: [...this.agentIds, agentId],
    });
  }

  addOkr(okrId: string): ProjectEntity {
    if (this.okrIds.includes(okrId)) {
      throw new Error('OKR already exists in this project');
    }
    return ProjectEntity.create({
      ...this.props,
      okrIds: [...this.okrIds, okrId],
    });
  }

  // --- Immutable updates ---

  updateName(name: string): ProjectEntity {
    return ProjectEntity.create({ ...this.props, name });
  }

  // --- Equality (by ID) ---

  equals(other: ProjectEntity): boolean {
    return this.props.projectId === other.props.projectId;
  }

  // --- Serialization ---

  toJSON(): ProjectEntityJSON {
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
