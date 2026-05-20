"use strict";
/**
 * RealmService - Server 管理业务逻辑
 *
 * 职责：
 * - 创建和管理服务器
 * - 服务器查询
 * - 服务器状态管理（激活、暂停、归档）
 * - 服务器设置和限制管理
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealmService = void 0;
const realm_entity_1 = require("../../../domain/models/realm/realm.entity");
const realm_member_entity_1 = require("../../../domain/models/realm-member/realm-member.entity");
const realm_errors_1 = require("./realm.errors");
const realm_context_store_1 = require("../../context/realm-context-store");
class RealmService {
    serverRepository;
    serverMemberRepository;
    eventBus;
    logger;
    agentRepository;
    constructor(serverRepository, serverMemberRepository, eventBus, logger, agentRepository) {
        this.serverRepository = serverRepository;
        this.serverMemberRepository = serverMemberRepository;
        this.eventBus = eventBus;
        this.logger = logger;
        this.agentRepository = agentRepository;
    }
    async createRealm(dto) {
        (0, realm_context_store_1.getRealmContext)(); // Validate context exists
        this.logger.info('Creating new realm', { name: dto.name, ownerId: dto.ownerId });
        // Check if server name already exists
        const existing = await this.serverRepository.find();
        if (existing.some(s => s.name === dto.name)) {
            throw new realm_errors_1.RealmNameAlreadyExistsError(dto.name);
        }
        const realmId = this.generateServerId();
        // Default settings
        const defaultSettings = {
            allow_public_channels: true,
            allow_private_channels: true,
            allow_dm: true,
            require_approval: false,
            default_member_role: 'member',
            ...dto.settings,
        };
        // Default limits
        const defaultLimits = {
            max_members: 100,
            max_projects: 50,
            max_channels: 100,
            max_agents: 10,
            max_storage_gb: 10,
            ...dto.limits,
        };
        const server = realm_entity_1.RealmEntity.create({
            realm_id: realmId,
            name: dto.name,
            display_name: dto.displayName,
            description: dto.description,
            owner_id: dto.ownerId,
            status: 'active',
            visibility: dto.visibility || 'private',
            settings: defaultSettings,
            limits: defaultLimits,
            created_at: new Date(),
            updated_at: new Date(),
            meta: {},
        });
        await this.serverRepository.save(server, realmId);
        // Auto-add owner as member
        const ownerMember = realm_member_entity_1.RealmMemberEntity.create({
            member_id: this.generateMemberId(),
            realm_id: realmId,
            user_id: dto.ownerId,
            role: 'owner',
            status: 'active',
            joined_at: new Date(),
            updated_at: new Date(),
            meta: {},
        });
        await this.serverMemberRepository.save(ownerMember, realmId);
        // Auto-add platform agent (agent-zhang) as admin
        await this.addPlatformAgentToRealm(realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.created',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: {
                realmId,
                name: dto.name,
                ownerId: dto.ownerId,
            },
        });
        this.logger.info('Realm created successfully', { realmId });
        return server;
    }
    async getRealmById(realmId) {
        const servers = await this.serverRepository.find({ id: realmId });
        if (servers.length === 0) {
            throw new realm_errors_1.RealmNotFoundError(realmId);
        }
        return servers[0];
    }
    async queryServers(filters) {
        return await this.serverRepository.find(filters);
    }
    async updateRealm(realmId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating realm', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        if (dto.name !== undefined) {
            // Check if new name already exists
            const existing = await this.serverRepository.find();
            if (existing.some(s => s.name === dto.name && s.realm_id !== realmId)) {
                throw new realm_errors_1.RealmNameAlreadyExistsError(dto.name);
            }
            server = server.updateName(dto.name);
        }
        if (dto.displayName !== undefined) {
            server = server.updateDisplayName(dto.displayName);
        }
        if (dto.description !== undefined) {
            server = server.updateDescription(dto.description);
        }
        if (dto.visibility !== undefined) {
            server = server.updateVisibility(dto.visibility);
        }
        if (dto.status !== undefined) {
            server = server.updateStatus(dto.status);
        }
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.updated',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId, changes: dto },
        });
        this.logger.info('Realm updated successfully', { realmId });
        return server;
    }
    async updateRealmSettings(realmId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating realm settings', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        const settingsUpdate = {
            ...(dto.allowPublicChannels !== undefined && { allow_public_channels: dto.allowPublicChannels }),
            ...(dto.allowPrivateChannels !== undefined && { allow_private_channels: dto.allowPrivateChannels }),
            ...(dto.allowDM !== undefined && { allow_dm: dto.allowDM }),
            ...(dto.requireApproval !== undefined && { require_approval: dto.requireApproval }),
            ...(dto.defaultMemberRole !== undefined && { default_member_role: dto.defaultMemberRole }),
        };
        server = server.updateSettings(settingsUpdate);
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.settings_updated',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId, settings: dto },
        });
        this.logger.info('Server settings updated successfully', { realmId });
        return server;
    }
    async updateRealmLimits(realmId, dto) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Updating realm limits', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        const limitsUpdate = {
            ...(dto.maxMembers !== undefined && { max_members: dto.maxMembers }),
            ...(dto.maxProjects !== undefined && { max_projects: dto.maxProjects }),
            ...(dto.maxChannels !== undefined && { max_channels: dto.maxChannels }),
            ...(dto.maxAgents !== undefined && { max_agents: dto.maxAgents }),
            ...(dto.maxStorageGb !== undefined && { max_storage_gb: dto.maxStorageGb }),
        };
        server = server.updateLimits(limitsUpdate);
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.limits_updated',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId, limits: dto },
        });
        this.logger.info('Server limits updated successfully', { realmId });
        return server;
    }
    async suspendServer(realmId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Suspending server', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        if (!server.isActive()) {
            throw new realm_errors_1.RealmNotActiveError(realmId);
        }
        server = server.suspend();
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.suspended',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId },
        });
        this.logger.info('Server suspended successfully', { realmId });
        return server;
    }
    async activateServer(realmId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Activating realm', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        if (!server.isSuspended()) {
            throw new Error('Only suspended realms can be activated');
        }
        server = server.activate();
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.activated',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId },
        });
        this.logger.info('Realm activated successfully', { realmId });
        return server;
    }
    async archiveRealm(realmId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Archiving realm', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        if (server.isArchived()) {
            throw new realm_errors_1.RealmAlreadyArchivedError(realmId);
        }
        server = server.archive();
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.archived',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId },
        });
        this.logger.info('Realm archived successfully', { realmId });
        return server;
    }
    async unarchiveRealm(realmId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Unarchiving server', { realmId });
        let server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        if (!server.isArchived()) {
            throw new realm_errors_1.RealmNotArchivedError(realmId);
        }
        server = server.unarchive();
        await this.serverRepository.update(server, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.unarchived',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId },
        });
        this.logger.info('Server unarchived successfully', { realmId });
        return server;
    }
    async deleteRealm(realmId) {
        const context = (0, realm_context_store_1.getRealmContext)();
        this.logger.info('Deleting realm', { realmId });
        const server = await this.getRealmById(realmId);
        // Check authorization
        if (server.owner_id !== context.userId) {
            throw new realm_errors_1.UnauthorizedRealmAccessError(realmId, context.userId);
        }
        await this.serverRepository.delete(realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server.deleted',
            aggregateId: realmId,
            aggregateType: 'Server',
            occurredAt: new Date(),
            payload: { realmId },
        });
        this.logger.info('Realm deleted successfully', { realmId });
    }
    generateServerId() {
        return `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    generateMemberId() {
        return `member-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
        }
    }
    // ============================================
    // Realm Member Management
    // ============================================
    async addRealmMember(realmId, userId, role) {
        this.logger.info('Adding member to server', { realmId, userId, role });
        // Check if server exists
        await this.getRealmById(realmId);
        // Check if user is already a member
        const existing = await this.serverMemberRepository.findByServerAndUser(realmId, userId);
        if (existing) {
            throw new Error(`User ${userId} is already a member of server ${realmId}`);
        }
        const member = realm_member_entity_1.RealmMemberEntity.create({
            member_id: this.generateMemberId(),
            realm_id: realmId,
            user_id: userId,
            role,
            status: 'active',
            joined_at: new Date(),
            updated_at: new Date(),
            meta: {},
        });
        await this.serverMemberRepository.save(member, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server_member.added',
            aggregateId: member.memberId,
            aggregateType: 'ServerMember',
            occurredAt: new Date(),
            payload: { realmId, userId, role },
        });
        this.logger.info('Member added to server successfully', { realmId, userId });
        return member;
    }
    async updateRealmMember(realmId, userId, dto) {
        this.logger.info('Updating realm member', { realmId, userId, dto });
        const member = await this.serverMemberRepository.findByServerAndUser(realmId, userId);
        if (!member) {
            throw new Error(`Member not found: ${userId} in server ${realmId}`);
        }
        // Cannot modify owner
        if (member.role === 'owner') {
            throw new Error('Cannot modify owner. Transfer ownership first.');
        }
        let updatedMember = member;
        // Update role
        if (dto.role !== undefined) {
            updatedMember = updatedMember.updateRole(dto.role);
        }
        // Update status
        if (dto.status !== undefined) {
            if (dto.status === 'left') {
                updatedMember = updatedMember.leave();
            }
            else if (dto.status === 'suspended') {
                updatedMember = updatedMember.suspend();
            }
            else if (dto.status === 'active' && member.status === 'suspended') {
                updatedMember = updatedMember.activate();
            }
        }
        await this.serverMemberRepository.update(updatedMember, realmId);
        await this.publishEvent({
            eventId: this.generateEventId(),
            eventType: 'server_member.updated',
            aggregateId: member.memberId,
            aggregateType: 'ServerMember',
            occurredAt: new Date(),
            payload: { realmId, userId, role: updatedMember.role, status: updatedMember.status },
        });
        this.logger.info('Realm member updated successfully', { realmId, userId });
        return updatedMember;
    }
    async getRealmMembers(realmId, filters) {
        if (filters?.role) {
            return await this.serverMemberRepository.findByRole(realmId, filters.role);
        }
        if (filters?.status) {
            return await this.serverMemberRepository.findByStatus(realmId, filters.status);
        }
        return await this.serverMemberRepository.findByServer(realmId);
    }
    async getServerMember(realmId, userId) {
        return await this.serverMemberRepository.findByServerAndUser(realmId, userId);
    }
    /**
     * 添加平台 Agent (agent-zhang) 到 Realm
     */
    async addPlatformAgentToRealm(realmId) {
        if (!this.agentRepository) {
            this.logger.debug('Agent repository not available, skipping platform agent addition');
            return;
        }
        try {
            // 查找 agent-zhang
            const zhangAgent = await this.agentRepository.findById('agent-zhang');
            if (!zhangAgent) {
                this.logger.warn('Platform agent (agent-zhang) not found, skipping auto-add');
                return;
            }
            // 检查是否已经是成员
            const existingMember = await this.serverMemberRepository.findByServerAndUser(realmId, 'agent-zhang');
            if (existingMember) {
                this.logger.debug('Platform agent already member of realm', { realmId });
                return;
            }
            // 添加为 admin
            const memberId = `member-${realmId}-zhang`;
            const member = realm_member_entity_1.RealmMemberEntity.create({
                member_id: memberId,
                realm_id: realmId,
                user_id: 'agent-zhang',
                role: 'admin',
                status: 'active',
                joined_at: new Date(),
                updated_at: new Date(),
                meta: {},
            });
            await this.serverMemberRepository.save(member, realmId);
            this.logger.info('Platform agent added to realm', { realmId, agentId: 'agent-zhang' });
        }
        catch (error) {
            this.logger.error('Failed to add platform agent to realm', error);
            // Don't throw - this shouldn't block realm creation
        }
    }
}
exports.RealmService = RealmService;
