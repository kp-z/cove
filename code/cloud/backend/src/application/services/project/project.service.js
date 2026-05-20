"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const project_errors_1 = require("./project.errors");
const project_entity_1 = require("../../../domain/models/project/project.entity");
const realm_context_store_1 = require("../../context/realm-context-store");
class ProjectService {
    projectRepository;
    agentRepository;
    channelRepository;
    eventBus;
    logger;
    constructor(projectRepository, agentRepository, channelRepository, eventBus, logger) {
        this.projectRepository = projectRepository;
        this.agentRepository = agentRepository;
        this.channelRepository = channelRepository;
        this.eventBus = eventBus;
        this.logger = logger;
    }
    async createProject(dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Creating new project', { name: dto.name, realmId: context.realmId });
        // 生成 Project ID
        const projectId = this.generateProjectId();
        // 创建 Project 实体
        const project = project_entity_1.ProjectEntity.create({
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
        await this.projectRepository.save(project, context.realmId);
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
    async getProjectById(projectId) {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new project_errors_1.ProjectNotFoundError(projectId);
        }
        return project;
    }
    /**
     * 获取所有 Projects
     */
    async getAllProjects() {
        return await this.projectRepository.findAll();
    }
    /**
     * 根据 Owner 获取 Projects
     */
    async getProjectsByOwner(ownerId) {
        return await this.projectRepository.findByOwner(ownerId);
    }
    /**
     * 根据状态获取 Projects
     */
    async getProjectsByStatus(status) {
        return await this.projectRepository.findByStatus(status);
    }
    /**
     * 更新 Project
     */
    async updateProject(projectId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating project', { projectId, realmId: context.realmId });
        // 获取现有 Project
        const project = await this.getProjectById(projectId);
        // 创建更新后的 Project（不可变更新）
        let updatedProject = project;
        if (dto.name !== undefined) {
            updatedProject = project_entity_1.ProjectEntity.create({
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
            updatedProject = project_entity_1.ProjectEntity.create({
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
        await this.projectRepository.update(updatedProject, context.realmId);
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
     * 归档 Project
     */
    async archiveProject(projectId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Archiving project', { projectId, realmId: context.realmId });
        // 获取 Project
        const project = await this.getProjectById(projectId);
        // 归档（Domain 层业务规则）
        const archivedProject = project.archive();
        // 保存更新
        await this.projectRepository.update(archivedProject, context.realmId);
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
    async activateProject(projectId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Activating project', { projectId, realmId: context.realmId });
        // 获取 Project
        const project = await this.getProjectById(projectId);
        // 激活（Domain 层业务规则）
        const activatedProject = project.activate();
        // 保存更新
        await this.projectRepository.update(activatedProject, context.realmId);
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
    async deleteProject(projectId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Deleting project', { projectId, realmId: context.realmId });
        // 获取 Project
        const project = await this.getProjectById(projectId);
        // 检查状态（只能删除已归档的 Project）
        if (project.status !== 'archived') {
            throw new project_errors_1.ProjectNotArchivedError(projectId);
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
    async getProjectAgents(projectId) {
        const project = await this.getProjectById(projectId);
        const agents = [];
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
    async getProjectChannels(projectId) {
        const project = await this.getProjectById(projectId);
        const channels = [];
        for (const channelId of project.channelIds) {
            const channel = await this.channelRepository.findById(channelId);
            if (channel) {
                channels.push(channel);
            }
        }
        return channels;
    }
    // --- Private helpers ---
    generateProjectId() {
        return `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateEventId() {
        return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    async publishEvent(event) {
        try {
            await this.eventBus.publish(event);
        }
        catch (error) {
            this.logger.error('Failed to publish event', error, {
                eventType: event.eventType,
                aggregateId: event.aggregateId,
            });
            // 不抛出异常，避免影响主流程
        }
    }
}
exports.ProjectService = ProjectService;
// --- Application Layer Errors ---
