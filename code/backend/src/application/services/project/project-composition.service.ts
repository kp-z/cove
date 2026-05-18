import { ProjectEntity } from '../../../domain/models/project/project.entity';
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
import { ProjectNotFoundError, ProjectNotArchivedError } from './project.errors';
import { AgentNotFoundError } from '../agent/agent.errors';
import { ChannelNotFoundError } from '../channel/channel.errors';
import { ServerContext } from '../../context/server-context';

export interface AddAgentToProjectDTO {
  readonly projectId: string;
  readonly agentId: string;
}

export interface RemoveAgentFromProjectDTO {
  readonly projectId: string;
  readonly agentId: string;
}

export interface AddChannelToProjectDTO {
  readonly projectId: string;
  readonly channelId: string;
}

export interface RemoveChannelFromProjectDTO {
  readonly projectId: string;
  readonly channelId: string;
}

export class ProjectCompositionService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly agentRepository: IAgentRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async addAgentToProject(dto: AddAgentToProjectDTO, context: ServerContext): Promise<ProjectEntity> {
    // TODO: Fix logger call

    // 获取 Project
    const project = await this.projectRepository.findById(dto.projectId);
    if (!project) {
      throw new ProjectNotFoundError(dto.projectId);
    }

    // 验证 Agent 存在
    const agent = await this.agentRepository.findById(dto.agentId);
    if (!agent) {
      throw new AgentNotFoundError(dto.agentId);
    }

    // 检查 Agent 是否已在 Project 中
    if (project.agentIds.includes(dto.agentId)) {
      // TODO: Fix logger call
      return project;
    }

    // 添加 Agent（Domain 层业务规则）
    const updatedProject = project.addAgent(dto.agentId);

    // 保存更新
    await this.projectRepository.update(updatedProject, context.serverId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.agent_added',
      aggregateId: dto.projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: {
        projectId: dto.projectId,
        agentId: dto.agentId,
      },
    });

    // TODO: Fix logger call

    return updatedProject;
  }

  /**
   * 从 Project 移除 Agent
   */
  async removeAgentFromProject(dto: RemoveAgentFromProjectDTO, context: ServerContext): Promise<ProjectEntity> {
    // TODO: Fix logger call

    // 获取 Project
    const project = await this.projectRepository.findById(dto.projectId);
    if (!project) {
      throw new ProjectNotFoundError(dto.projectId);
    }

    // 检查 Agent 是否在 Project 中
    if (!project.agentIds.includes(dto.agentId)) {
      // TODO: Fix logger call
      return project;
    }

    // 移除 Agent（Domain 层业务规则）
    const updatedProject = project.removeAgent(dto.agentId);

    // 保存更新
    await this.projectRepository.update(updatedProject, context.serverId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.agent_removed',
      aggregateId: dto.projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: {
        projectId: dto.projectId,
        agentId: dto.agentId,
      },
    });

    // TODO: Fix logger call

    return updatedProject;
  }

  /**
   * 添加 Channel 到 Project
   */
  async addChannelToProject(dto: AddChannelToProjectDTO, context: ServerContext): Promise<ProjectEntity> {
    // TODO: Fix logger call

    // 获取 Project
    const project = await this.projectRepository.findById(dto.projectId);
    if (!project) {
      throw new ProjectNotFoundError(dto.projectId);
    }

    // 验证 Channel 存在
    const channel = await this.channelRepository.findById(dto.channelId);
    if (!channel) {
      throw new ChannelNotFoundError(dto.channelId);
    }

    // 检查 Channel 是否已在 Project 中
    if (project.channelIds.includes(dto.channelId)) {
      // TODO: Fix logger call
      return project;
    }

    // 添加 Channel（Domain 层业务规则）
    const updatedProject = project.addChannel(dto.channelId);

    // 保存更新
    await this.projectRepository.update(updatedProject, context.serverId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.channel_added',
      aggregateId: dto.projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: {
        projectId: dto.projectId,
        channelId: dto.channelId,
      },
    });

    // TODO: Fix logger call

    return updatedProject;
  }

  /**
   * 从 Project 移除 Channel
   */
  async removeChannelFromProject(dto: RemoveChannelFromProjectDTO, context: ServerContext): Promise<ProjectEntity> {
    // TODO: Fix logger call

    // 获取 Project
    const project = await this.projectRepository.findById(dto.projectId);
    if (!project) {
      throw new ProjectNotFoundError(dto.projectId);
    }

    // 检查 Channel 是否在 Project 中
    if (!project.channelIds.includes(dto.channelId)) {
      // TODO: Fix logger call
      return project;
    }

    // 移除 Channel（Domain 层业务规则）
    const updatedProject = project.removeChannel(dto.channelId);

    // 保存更新
    await this.projectRepository.update(updatedProject, context.serverId);

    // 发布事件
    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'project.channel_removed',
      aggregateId: dto.projectId,
      aggregateType: 'Project',
      occurredAt: new Date(),
      payload: {
        projectId: dto.projectId,
        channelId: dto.channelId,
      },
    });

    // TODO: Fix logger call

    return updatedProject;
  }

  /**
   * 归档 Project
   */
  async archiveProject(projectId: string, context: ServerContext): Promise<ProjectEntity> {
    this.logger.info('Archiving project', { projectId });

    // 获取 Project
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    // 归档（Domain 层业务规则）
    const archivedProject = project.archive();

    // 保存更新
    await this.projectRepository.update(archivedProject, context.serverId);

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
  async activateProject(projectId: string, context: ServerContext): Promise<ProjectEntity> {
    this.logger.info('Activating project', { projectId });

    // 获取 Project
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    // 激活（Domain 层业务规则）
    const activatedProject = project.activate();

    // 保存更新
    await this.projectRepository.update(activatedProject, context.serverId);

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
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

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
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

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
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    const channels: ChannelEntity[] = [];
    for (const channelId of project.channelIds) {
      const channel = await this.channelRepository.findById(channelId);
      if (channel) {
        channels.push(channel);
      }
    }

    return channels;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.eventType, aggregateId: event.aggregateId,
      });
    }
  }
}
