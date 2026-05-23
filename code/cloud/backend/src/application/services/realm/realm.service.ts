/**
 * RealmService - Server 管理业务逻辑
 *
 * 职责：
 * - 创建和管理服务器
 * - 服务器查询
 * - 服务器状态管理（激活、暂停、归档）
 * - 服务器设置和限制管理
 */

import {
  RealmEntity,
  RealmStatus,
  RealmVisibility,
  RealmSettings,
  RealmLimits,
} from '../../../domain/models/realm/realm.entity';
import {
  RealmMemberEntity,
  RealmRole,
  MemberStatus,
} from '../../../domain/models/realm-member/realm-member.entity';
import {
  RealmNotFoundError,
  RealmNameAlreadyExistsError,
  RealmNotActiveError,
  RealmAlreadyArchivedError,
  RealmNotArchivedError,
  UnauthorizedRealmAccessError,
} from './realm.errors';
import {
  IRealmRepository,
  IRealmMemberRepository,
  IAgentRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { getRealmContext } from '../../context/realm-context-store';

export interface CreateRealmDTO {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly ownerId: string;
  readonly visibility?: RealmVisibility;
  readonly settings?: Partial<RealmSettings>;
  readonly limits?: Partial<RealmLimits>;
}

export interface UpdateRealmMemberDTO {
  readonly role?: RealmRole;
  readonly status?: MemberStatus;
}

export interface UpdateRealmDTO {
  readonly name?: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly visibility?: RealmVisibility;
  readonly status?: RealmStatus;
}

export interface UpdateRealmSettingsDTO {
  readonly allowPublicChannels?: boolean;
  readonly allowPrivateChannels?: boolean;
  readonly allowDM?: boolean;
  readonly requireApproval?: boolean;
  readonly defaultMemberRole?: 'member' | 'guest';
}

export interface UpdateRealmLimitsDTO {
  readonly maxMembers?: number;
  readonly maxProjects?: number;
  readonly maxChannels?: number;
  readonly maxAgents?: number;
  readonly maxStorageGb?: number;
}

export class RealmService {
  constructor(
    private readonly serverRepository: IRealmRepository,
    private readonly serverMemberRepository: IRealmMemberRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly agentRepository?: IAgentRepository
  ) {}

  async createRealm(dto: CreateRealmDTO): Promise<RealmEntity> {
    getRealmContext(); // Validate context exists
    this.logger.info('Creating new realm', { name: dto.name, ownerId: dto.ownerId });

    // Check if server name already exists
    const existing = await this.serverRepository.find();
    if (existing.some(s => s.name === dto.name)) {
      throw new RealmNameAlreadyExistsError(dto.name);
    }

    const realmId = this.generateServerId();

    // Default settings
    const defaultSettings: RealmSettings = {
      allow_public_channels: true,
      allow_private_channels: true,
      allow_dm: true,
      require_approval: false,
      default_member_role: 'member',
      ...dto.settings,
    };

    // Default limits
    const defaultLimits: RealmLimits = {
      max_members: 100,
      max_projects: 50,
      max_channels: 100,
      max_agents: 10,
      max_storage_gb: 10,
      ...dto.limits,
    };

    const server = RealmEntity.create({
      realm_id: realmId,
      name: dto.name,
      display_name: dto.displayName,
      description: dto.description,
      owner_id: dto.ownerId,
      status: 'active',
      visibility: dto.visibility || 'private',
      settings: defaultSettings,
      limits: defaultLimits,
      logo: {
        url: `https://api.dicebear.com/9.x/shapes/svg?seed=${dto.name}`,
        type: 'dicebear',
      },
      created_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });

    await this.serverRepository.save(server, realmId);

    // Auto-add owner as member
    const ownerMember = RealmMemberEntity.create({
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

  async getRealmById(realmId: string): Promise<RealmEntity> {
    const servers = await this.serverRepository.find({ id: realmId });
    if (servers.length === 0) {
      throw new RealmNotFoundError(realmId);
    }
    return servers[0]!;
  }

  async queryServers(filters?: { ownerId?: string; status?: RealmStatus }): Promise<RealmEntity[]> {
    return await this.serverRepository.find(filters);
  }

  async updateRealm(realmId: string, dto: UpdateRealmDTO): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Updating realm', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
    }

    if (dto.name !== undefined) {
      // Check if new name already exists
      const existing = await this.serverRepository.find();
      if (existing.some(s => s.name === dto.name && s.realm_id !== realmId)) {
        throw new RealmNameAlreadyExistsError(dto.name);
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

  async updateRealmSettings(realmId: string, dto: UpdateRealmSettingsDTO): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Updating realm settings', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
    }

    const settingsUpdate: Partial<RealmSettings> = {
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

  async updateRealmLimits(realmId: string, dto: UpdateRealmLimitsDTO): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Updating realm limits', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
    }

    const limitsUpdate: Partial<RealmLimits> = {
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

  async suspendServer(realmId: string): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Suspending server', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
    }

    if (!server.isActive()) {
      throw new RealmNotActiveError(realmId);
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

  async activateServer(realmId: string): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Activating realm', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
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

  async archiveRealm(realmId: string): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Archiving realm', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
    }

    if (server.isArchived()) {
      throw new RealmAlreadyArchivedError(realmId);
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

  async unarchiveRealm(realmId: string): Promise<RealmEntity> {
    const context = getRealmContext();
    this.logger.info('Unarchiving server', { realmId });

    let server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
    }

    if (!server.isArchived()) {
      throw new RealmNotArchivedError(realmId);
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

  async deleteRealm(realmId: string): Promise<void> {
    const context = getRealmContext();
    this.logger.info('Deleting realm', { realmId });

    const server = await this.getRealmById(realmId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedRealmAccessError(realmId, context.userId);
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

  private generateServerId(): string {
    return `server-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateMemberId(): string {
    return `member-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
    }
  }

  // ============================================
  // Realm Member Management
  // ============================================

  async addRealmMember(realmId: string, userId: string, role: RealmRole): Promise<RealmMemberEntity> {
    this.logger.info('Adding member to server', { realmId, userId, role });

    // Check if server exists
    await this.getRealmById(realmId);

    // Check if user is already a member
    const existing = await this.serverMemberRepository.findByServerAndUser(realmId, userId);
    if (existing) {
      throw new Error(`User ${userId} is already a member of server ${realmId}`);
    }

    const member = RealmMemberEntity.create({
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

  async updateRealmMember(realmId: string, userId: string, dto: UpdateRealmMemberDTO): Promise<RealmMemberEntity> {
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
      } else if (dto.status === 'suspended') {
        updatedMember = updatedMember.suspend();
      } else if (dto.status === 'active' && member.status === 'suspended') {
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

  async getRealmMembers(realmId: string, filters?: { role?: RealmRole; status?: MemberStatus }): Promise<RealmMemberEntity[]> {
    if (filters?.role) {
      return await this.serverMemberRepository.findByRole(realmId, filters.role);
    }
    if (filters?.status) {
      return await this.serverMemberRepository.findByStatus(realmId, filters.status);
    }
    return await this.serverMemberRepository.findByServer(realmId);
  }

  async getServerMember(realmId: string, userId: string): Promise<RealmMemberEntity | null> {
    return await this.serverMemberRepository.findByServerAndUser(realmId, userId);
  }

  /**
   * 添加平台 Agent (agent-zhang) 到 Realm
   */
  private async addPlatformAgentToRealm(realmId: string): Promise<void> {
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
      const member = RealmMemberEntity.create({
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
    } catch (error) {
      this.logger.error('Failed to add platform agent to realm', error as Error);
      // Don't throw - this shouldn't block realm creation
    }
  }

  /**
   * 获取用户所属的所有 realm
   */
  async getUserRealms(userId: string, filters?: { status?: RealmStatus }): Promise<RealmEntity[]> {
    this.logger.info('Getting user realms', { userId, filters });

    // 获取用户的所有 realm 成员关系
    const members = await this.serverMemberRepository.findByUser(userId);

    if (members.length === 0) {
      return [];
    }

    // 获取所有 realm 的详细信息
    const realmIds = members
      .filter((m: RealmMemberEntity) => m.status === 'active')
      .map((m: RealmMemberEntity) => m.realmId);

    const allRealms = await this.serverRepository.find();
    let userRealms = allRealms.filter(realm => realmIds.includes(realm.realm_id));

    // 应用状态过滤
    if (filters?.status) {
      userRealms = userRealms.filter(realm => realm.status === filters.status);
    }

    this.logger.info('User realms retrieved', { userId, count: userRealms.length });
    return userRealms;
  }

  /**
   * 获取用户在指定 realm 中的角色
   */
  async getUserRole(realmId: string, userId: string): Promise<RealmRole | null> {
    this.logger.info('Getting user role in realm', { realmId, userId });

    const member = await this.serverMemberRepository.findByServerAndUser(realmId, userId);

    if (!member || member.status !== 'active') {
      this.logger.warn('User is not an active member of realm', { realmId, userId });
      return null;
    }

    return member.role;
  }
}
