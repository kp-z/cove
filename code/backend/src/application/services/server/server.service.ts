/**
 * ServerService - Server 管理业务逻辑
 *
 * 职责：
 * - 创建和管理服务器
 * - 服务器查询
 * - 服务器状态管理（激活、暂停、归档）
 * - 服务器设置和限制管理
 */

import {
  ServerEntity,
  ServerStatus,
  ServerVisibility,
  ServerSettings,
  ServerLimits,
} from '../../../domain/models/server/server.entity';
import {
  ServerMemberEntity,
  ServerRole,
  MemberStatus,
} from '../../../domain/models/server-member/server-member.entity';
import {
  ServerNotFoundError,
  ServerNameAlreadyExistsError,
  ServerNotActiveError,
  ServerAlreadyArchivedError,
  ServerNotArchivedError,
  UnauthorizedServerAccessError,
} from './server.errors';
import {
  IServerRepository,
  IServerMemberRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { getServerContext } from '../../context/server-context-store';

export interface CreateServerDTO {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly ownerId: string;
  readonly visibility?: ServerVisibility;
  readonly settings?: Partial<ServerSettings>;
  readonly limits?: Partial<ServerLimits>;
}

export interface UpdateServerDTO {
  readonly name?: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly visibility?: ServerVisibility;
}

export interface UpdateServerSettingsDTO {
  readonly allowPublicChannels?: boolean;
  readonly allowPrivateChannels?: boolean;
  readonly allowDM?: boolean;
  readonly requireApproval?: boolean;
  readonly defaultMemberRole?: 'member' | 'guest';
}

export interface UpdateServerLimitsDTO {
  readonly maxMembers?: number;
  readonly maxProjects?: number;
  readonly maxChannels?: number;
  readonly maxAgents?: number;
  readonly maxStorageGb?: number;
}

export class ServerService {
  constructor(
    private readonly serverRepository: IServerRepository,
    private readonly serverMemberRepository: IServerMemberRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createServer(dto: CreateServerDTO): Promise<ServerEntity> {
    getServerContext(); // Validate context exists
    this.logger.info('Creating new server', { name: dto.name, ownerId: dto.ownerId });

    // Check if server name already exists
    const existing = await this.serverRepository.find();
    if (existing.some(s => s.name === dto.name)) {
      throw new ServerNameAlreadyExistsError(dto.name);
    }

    const serverId = this.generateServerId();

    // Default settings
    const defaultSettings: ServerSettings = {
      allow_public_channels: true,
      allow_private_channels: true,
      allow_dm: true,
      require_approval: false,
      default_member_role: 'member',
      ...dto.settings,
    };

    // Default limits
    const defaultLimits: ServerLimits = {
      max_members: 100,
      max_projects: 50,
      max_channels: 100,
      max_agents: 10,
      max_storage_gb: 10,
      ...dto.limits,
    };

    const server = ServerEntity.create({
      server_id: serverId,
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

    await this.serverRepository.save(server, serverId);

    // Auto-add owner as member
    const ownerMember = ServerMemberEntity.create({
      member_id: this.generateMemberId(),
      server_id: serverId,
      user_id: dto.ownerId,
      role: 'owner',
      status: 'active',
      joined_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });

    await this.serverMemberRepository.save(ownerMember, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.created',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: {
        serverId,
        name: dto.name,
        ownerId: dto.ownerId,
      },
    });

    this.logger.info('Server created successfully', { serverId });
    return server;
  }

  async getServerById(serverId: string): Promise<ServerEntity> {
    const servers = await this.serverRepository.find({ id: serverId });
    if (servers.length === 0) {
      throw new ServerNotFoundError(serverId);
    }
    return servers[0]!;
  }

  async queryServers(filters?: { ownerId?: string; status?: ServerStatus }): Promise<ServerEntity[]> {
    return await this.serverRepository.find(filters);
  }

  async updateServer(serverId: string, dto: UpdateServerDTO): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Updating server', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    if (dto.name !== undefined) {
      // Check if new name already exists
      const existing = await this.serverRepository.find();
      if (existing.some(s => s.name === dto.name && s.server_id !== serverId)) {
        throw new ServerNameAlreadyExistsError(dto.name);
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

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.updated',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId, changes: dto },
    });

    this.logger.info('Server updated successfully', { serverId });
    return server;
  }

  async updateServerSettings(serverId: string, dto: UpdateServerSettingsDTO): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Updating server settings', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    const settingsUpdate: Partial<ServerSettings> = {
      ...(dto.allowPublicChannels !== undefined && { allow_public_channels: dto.allowPublicChannels }),
      ...(dto.allowPrivateChannels !== undefined && { allow_private_channels: dto.allowPrivateChannels }),
      ...(dto.allowDM !== undefined && { allow_dm: dto.allowDM }),
      ...(dto.requireApproval !== undefined && { require_approval: dto.requireApproval }),
      ...(dto.defaultMemberRole !== undefined && { default_member_role: dto.defaultMemberRole }),
    };

    server = server.updateSettings(settingsUpdate);

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.settings_updated',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId, settings: dto },
    });

    this.logger.info('Server settings updated successfully', { serverId });
    return server;
  }

  async updateServerLimits(serverId: string, dto: UpdateServerLimitsDTO): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Updating server limits', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    const limitsUpdate: Partial<ServerLimits> = {
      ...(dto.maxMembers !== undefined && { max_members: dto.maxMembers }),
      ...(dto.maxProjects !== undefined && { max_projects: dto.maxProjects }),
      ...(dto.maxChannels !== undefined && { max_channels: dto.maxChannels }),
      ...(dto.maxAgents !== undefined && { max_agents: dto.maxAgents }),
      ...(dto.maxStorageGb !== undefined && { max_storage_gb: dto.maxStorageGb }),
    };

    server = server.updateLimits(limitsUpdate);

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.limits_updated',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId, limits: dto },
    });

    this.logger.info('Server limits updated successfully', { serverId });
    return server;
  }

  async suspendServer(serverId: string): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Suspending server', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    if (!server.isActive()) {
      throw new ServerNotActiveError(serverId);
    }

    server = server.suspend();

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.suspended',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId },
    });

    this.logger.info('Server suspended successfully', { serverId });
    return server;
  }

  async activateServer(serverId: string): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Activating server', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    if (!server.isSuspended()) {
      throw new Error('Only suspended servers can be activated');
    }

    server = server.activate();

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.activated',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId },
    });

    this.logger.info('Server activated successfully', { serverId });
    return server;
  }

  async archiveServer(serverId: string): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Archiving server', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    if (server.isArchived()) {
      throw new ServerAlreadyArchivedError(serverId);
    }

    server = server.archive();

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.archived',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId },
    });

    this.logger.info('Server archived successfully', { serverId });
    return server;
  }

  async unarchiveServer(serverId: string): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Unarchiving server', { serverId });

    let server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    if (!server.isArchived()) {
      throw new ServerNotArchivedError(serverId);
    }

    server = server.unarchive();

    await this.serverRepository.update(server, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.unarchived',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId },
    });

    this.logger.info('Server unarchived successfully', { serverId });
    return server;
  }

  async deleteServer(serverId: string): Promise<void> {
    const context = getServerContext();
    this.logger.info('Deleting server', { serverId });

    const server = await this.getServerById(serverId);

    // Check authorization
    if (server.owner_id !== context.userId) {
      throw new UnauthorizedServerAccessError(serverId, context.userId);
    }

    await this.serverRepository.delete(serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server.deleted',
      aggregateId: serverId,
      aggregateType: 'Server',
      occurredAt: new Date(),
      payload: { serverId },
    });

    this.logger.info('Server deleted successfully', { serverId });
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
  // Server Member Management
  // ============================================

  async addServerMember(serverId: string, userId: string, role: ServerRole): Promise<ServerMemberEntity> {
    this.logger.info('Adding member to server', { serverId, userId, role });

    // Check if server exists
    await this.getServerById(serverId);

    // Check if user is already a member
    const existing = await this.serverMemberRepository.findByServerAndUser(serverId, userId);
    if (existing) {
      throw new Error(`User ${userId} is already a member of server ${serverId}`);
    }

    const member = ServerMemberEntity.create({
      member_id: this.generateMemberId(),
      server_id: serverId,
      user_id: userId,
      role,
      status: 'active',
      joined_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });

    await this.serverMemberRepository.save(member, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server_member.added',
      aggregateId: member.member_id,
      aggregateType: 'ServerMember',
      occurredAt: new Date(),
      payload: { serverId, userId, role },
    });

    this.logger.info('Member added to server successfully', { serverId, userId });
    return member;
  }

  async removeServerMember(serverId: string, userId: string): Promise<void> {
    this.logger.info('Removing member from server', { serverId, userId });

    const member = await this.serverMemberRepository.findByServerAndUser(serverId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in server ${serverId}`);
    }

    // Cannot remove owner
    if (member.role === 'owner') {
      throw new Error('Cannot remove server owner. Transfer ownership first.');
    }

    const updatedMember = member.leave();
    await this.serverMemberRepository.update(updatedMember, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server_member.removed',
      aggregateId: member.member_id,
      aggregateType: 'ServerMember',
      occurredAt: new Date(),
      payload: { serverId, userId },
    });

    this.logger.info('Member removed from server successfully', { serverId, userId });
  }

  async updateServerMemberRole(serverId: string, userId: string, newRole: ServerRole): Promise<ServerMemberEntity> {
    this.logger.info('Updating member role', { serverId, userId, newRole });

    const member = await this.serverMemberRepository.findByServerAndUser(serverId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in server ${serverId}`);
    }

    // Cannot modify owner role
    if (member.role === 'owner') {
      throw new Error('Cannot modify owner role. Transfer ownership first.');
    }

    const updatedMember = member.updateRole(newRole);
    await this.serverMemberRepository.update(updatedMember, serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'server_member.role_changed',
      aggregateId: member.member_id,
      aggregateType: 'ServerMember',
      occurredAt: new Date(),
      payload: { serverId, userId, oldRole: member.role, newRole },
    });

    this.logger.info('Member role updated successfully', { serverId, userId, newRole });
    return updatedMember;
  }

  async getServerMembers(serverId: string, filters?: { role?: ServerRole; status?: MemberStatus }): Promise<ServerMemberEntity[]> {
    if (filters?.role) {
      return await this.serverMemberRepository.findByRole(serverId, filters.role);
    }
    if (filters?.status) {
      return await this.serverMemberRepository.findByStatus(serverId, filters.status);
    }
    return await this.serverMemberRepository.findByServer(serverId);
  }

  async getServerMember(serverId: string, userId: string): Promise<ServerMemberEntity | null> {
    return await this.serverMemberRepository.findByServerAndUser(serverId, userId);
  }
}
