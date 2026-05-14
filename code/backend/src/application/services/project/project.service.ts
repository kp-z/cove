/**
 * ProjectService - Project 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Project
 * - 管理 Project 成员（Agents 和 Channels）
 * - 协调 Project 生命周期
 *
 * 依赖：
 * - IProjectRepository: Project 数据访问
 * - IAgentRepository: Agent 数据访问
 * - IChannelRepository: Channel 数据访问
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { ProjectEntity, ProjectStatus } from '../../../domain/models/project/project.entity';
import { AgentEntity } from '../../../domain/models/agent/agent.entity';
import { ChannelEntity } from '../../../domain/models/channel/channel.entity';
import {
  IProjectRepository,
  IAgentRepository,
  IChannelRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';

export interface CreateProjectDTO {
  readonly name: string;
  readonly description?: string;
  readonly ownerId: string;
  readonly tags?: readonly string[];
}

export interface UpdateProjectDTO {
  readonly name?: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}


export class ProjectService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}
  async createProject(dto: CreateProjectDTO): Promise<ProjectEntity> {
    this.logger.info('Creating new project', { name: dto.name });

    // 生成 Project ID
    const projectId = this.generateProjectId();

    // 创建 Project 实体
    const project = ProjectEntity.create({
      projectId,
      name: dto.name,
      displayName: dto.name,
      description: dto.description,
      ownerId: dto.ownerId,
      visibility: 'private',
      status: 'active',
      agentIds: [],
      channelIds: [],
      createdAt: new Date(),
    });

    // 保存到数据库
    await this.projectRepository.save(project);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.created',
      aggregateId: project.projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: {
        projectId: project.projectId,
        name: project.name,
        ownerId: dto.ownerId,
      },
    });

    this.logger.info('Project created successfully', { projectId: project.projectId });

    return project;
  }

  /**
   * 根据 ID 获取 Project
   */
  async getProjectById(projectId: string): Promise<ProjectEntity> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return project;
  }

  /**
   * 获取所有 Projects
   */
  async getAllProjects(): Promise<ProjectEntity[]> {
    return await this.projectRepository.findAll();
  }

  /**
   * 根据 Owner 获取 Projects
   */
  async getProjectsByOwner(ownerId: string): Promise<ProjectEntity[]> {
    return await this.projectRepository.findByOwner(ownerId);
  }

  /**
   * 根据状态获取 Projects
   */
  async getProjectsByStatus(status: ProjectStatus): Promise<ProjectEntity[]> {
    return await this.projectRepository.findByStatus(status);
  }

  /**
   * 更新 Project
   */
  async updateProject(projectId: string, dto: UpdateProjectDTO): Promise<ProjectEntity> {
    this.logger.info('Updating project', { projectId });

    // 获取现有 Project
    const project = await this.getProjectById(projectId);

    // 创建更新后的 Project（不可变更新）
    let updatedProject = project;

    if (dto.name !== undefined) {
      updatedProject = ProjectEntity.create({
        projectId: updatedProject.projectId,
        name: dto.name,
        displayName: dto.name,
        description: updatedProject.description,
        status: updatedProject.status,
        visibility: updatedProject.visibility,
        ownerId: updatedProject.ownerId,
        channelIds: updatedProject.channelIds,
        agentIds: updatedProject.agentIds,
        okrIds: updatedProject.okrIds,
        createdAt: updatedProject.createdAt,
      });
    }

    if (dto.description !== undefined) {
      updatedProject = ProjectEntity.create({
        projectId: updatedProject.projectId,
        name: updatedProject.name,
        displayName: updatedProject.displayName,
        description: dto.description,
        status: updatedProject.status,
        visibility: updatedProject.visibility,
        ownerId: updatedProject.ownerId,
        channelIds: updatedProject.channelIds,
        agentIds: updatedProject.agentIds,
        okrIds: updatedProject.okrIds,
        createdAt: updatedProject.createdAt,
      });
    }

    // 保存更新
    await this.projectRepository.update(updatedProject);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.updated',
      aggregateId: projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: {
        projectId,
        changes: dto,
      },
    });

    this.logger.info('Project updated successfully', { projectId });

    return updatedProject;
  }

  /**
   * 添加 Agent 到 Project

  // --- Delegation to ProjectCompositionService ---

  async addAgentToProject(dto: AddAgentToProjectDTO): Promise<ProjectEntity> { return this.compositionService.addAgentToProject(dto); }
  async removeAgentFromProject(dto: RemoveAgentFromProjectDTO): Promise<ProjectEntity> { return this.compositionService.removeAgentFromProject(dto); }
  async addChannelToProject(dto: AddChannelToProjectDTO): Promise<ProjectEntity> { return this.compositionService.addChannelToProject(dto); }
  async removeChannelFromProject(dto: RemoveChannelFromProjectDTO): Promise<ProjectEntity> { return this.compositionService.removeChannelFromProject(dto); }
  async getProjectAgents(projectId: string): Promise<AgentEntity[]> { return this.compositionService.getProjectAgents(projectId); }
  async getProjectChannels(projectId: string): Promise<ChannelEntity[]> { return this.compositionService.getProjectChannels(projectId); }

  async archiveProject(projectId: string): Promise<ProjectEntity> {
    this.logger.info('Archiving project', { projectId });

    // 获取 Project
    const project = await this.getProjectById(projectId);

    // 归档（Domain 层业务规则）
    const archivedProject = project.archive();

    // 保存更新
    await this.projectRepository.update(archivedProject);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.archived',
      aggregateId: projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: { projectId },
    });

    this.logger.info('Project archived successfully', { projectId });

    return archivedProject;
  }

  /**
   * 激活 Project
   */
  async activateProject(projectId: string): Promise<ProjectEntity> {
    this.logger.info('Activating project', { projectId });

    // 获取 Project
    const project = await this.getProjectById(projectId);

    // 激活（Domain 层业务规则）
    const activatedProject = project.activate();

    // 保存更新
    await this.projectRepository.update(activatedProject);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.activated',
      aggregateId: projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: { projectId },
    });

    this.logger.info('Project activated successfully', { projectId });

    return activatedProject;
  }

  /**
   * 删除 Project
   */
  async deleteProject(projectId: string): Promise<void> {
    this.logger.info('Deleting project', { projectId });

    // 获取 Project
    const project = await this.getProjectById(projectId);

    // 检查状态（只能删除已归档的 Project）
    if (project.status !== 'archived') {
      throw new ProjectNotArchivedError(projectId);
    }

    // 删除
    await this.projectRepository.delete(projectId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.deleted',
      aggregateId: projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: { projectId },
    });

    this.logger.info('Project deleted successfully', { projectId });
  }

  /**
   * 获取 Project 的所有 Agents
   */
  async getProjectAgents(projectId: string): Promise<AgentEntity[]> {
    const project = await this.getProjectById(projectId);

    const agents: AgentEntity[] = [];
    for (const agentId of project.agentIds) {
      const agent = await this.agentRepository.findById(agentId);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * 获取 Project 的所有 Channels
   */
  async getProjectChannels(projectId: string): Promise<ChannelEntity[]> {
    const project = await this.getProjectById(projectId);

    const channels: ChannelEntity[] = [];
    for (const channelId of project.channelIds) {
      const channel = await this.channelRepository.findById(channelId);
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  // --- Private helpers ---

  private generateProjectId(): string {
    return `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
      // 不抛出异常，避免影响主流程
    }
  }
}

// --- Application Layer Errors ---

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

export class ProjectNotArchivedError extends Error {
  constructor(projectId: string) {
    super(`Project must be archived before deletion: ${projectId}`);
    this.name = 'ProjectNotArchivedError';
  }
}
