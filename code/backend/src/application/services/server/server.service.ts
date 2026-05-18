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
  ServerNotFoundError,
  ServerNameAlreadyExistsError,
  ServerNotActiveError,
  ServerAlreadyArchivedError,
  ServerNotArchivedError,
  UnauthorizedServerAccessError,
} from './server.errors';
import {
  IServerRepository,
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
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createServer(dto: CreateServerDTO): Promise<ServerEntity> {
    const context = getServerContext();
    this.logger.info('Creating new server', { name: dto.name, ownerId: dto.ownerId });

    // Check if server name already exists
    const existing = await this.serverRepository.findAll();
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
    const server = await this.serverRepository.findById(serverId);
    if (!server) {
      throw new ServerNotFoundError(serverId);
    }
    return server;
  }

  async getServersByOwner(ownerId: string): Promise<ServerEntity[]> {
    return await this.serverRepository.findByOwner(ownerId);
  }

  async getServersByStatus(status: ServerStatus): Promise<ServerEntity[]> {
    return await this.serverRepository.findByStatus(status);
  }

  async getAllServers(): Promise<ServerEntity[]> {
    return await this.serverRepository.findAll();
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
      const existing = await this.serverRepository.findAll();
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

    const settingsUpdate: Partial<ServerSettings> = {};
    if (dto.allowPublicChannels !== undefined) settingsUpdate.allow_public_channels = dto.allowPublicChannels;
    if (dto.allowPrivateChannels !== undefined) settingsUpdate.allow_private_channels = dto.allowPrivateChannels;
    if (dto.allowDM !== undefined) settingsUpdate.allow_dm = dto.allowDM;
    if (dto.requireApproval !== undefined) settingsUpdate.require_approval = dto.requireApproval;
    if (dto.defaultMemberRole !== undefined) settingsUpdate.default_member_role = dto.defaultMemberRole;

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

    const limitsUpdate: Partial<ServerLimits> = {};
    if (dto.maxMembers !== undefined) limitsUpdate.max_members = dto.maxMembers;
    if (dto.maxProjects !== undefined) limitsUpdate.max_projects = dto.maxProjects;
    if (dto.maxChannels !== undefined) limitsUpdate.max_channels = dto.maxChannels;
    if (dto.maxAgents !== undefined) limitsUpdate.max_agents = dto.maxAgents;
    if (dto.maxStorageGb !== undefined) limitsUpdate.max_storage_gb = dto.maxStorageGb;

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
}
