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
} from './realm.errors';
import {
  IRealmRepository,
  IRealmMemberRepository,
  IAgentRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { IChannelRepository } from '../../interfaces/repositories/channel.repository.interface';
import { IRealmPermissionService } from '../../interfaces/services/realm-permission.service.interface';
import { RealmPermission } from '../../../domain/models/realm-member/realm-member.entity';
import { getRealmContext } from '../../context/realm-context-store';
import { AdapterBootstrapService } from '../adapter/adapter-bootstrap.service';
import { DeviceService } from '../device/device.service';
import { DeviceAuthService } from '../device/device-auth.service';
import { DeviceEntity } from '../../../domain/models/device/device.entity';
import { DefaultChannelsInitializer } from '../../../infrastructure/database/default-channels-initializer';
import { buildDeviceStartCommand } from '../../../infrastructure/device/device-start-command';

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
    private readonly permissionService: IRealmPermissionService,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly agentRepository?: IAgentRepository,
    private readonly adapterBootstrapService?: AdapterBootstrapService,
    private readonly deviceService?: DeviceService,
    private readonly deviceAuthService?: DeviceAuthService,
    private readonly defaultChannelsInitializer?: DefaultChannelsInitializer,
    private readonly channelRepository?: IChannelRepository
  ) {}

  async createRealm(dto: CreateRealmDTO): Promise<RealmEntity> {
    // Note: No RealmContext needed for creating a new realm
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
        url: '/public/cove-logo.svg',
        type: 'default',
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

    // Auto-create device and bootstrap adapters with real device context
    let deviceId = 'system'; // fallback
    let deviceName = 'System';

    if (this.deviceService && this.deviceAuthService) {
      try {
        const device = await this.createRealmDevice(realmId);
        deviceId = device.device_id;
        deviceName = device.display_name || device.name;
      } catch (error) {
        this.logger.error('Failed to create device for realm', error as Error, { realmId });
        // Continue with fallback 'system' device
      }
    }

    // Auto-bootstrap adapters (CC-Switch profiles, etc.)
    if (this.adapterBootstrapService) {
      try {
        this.logger.info('Bootstrapping adapters for new realm', { realmId });
        const bootstrapResult = await this.adapterBootstrapService.bootstrap(
          realmId,
          dto.ownerId,
          deviceId,    // Use real device ID
          deviceName   // Use real device name
        );
        this.logger.info('Adapter bootstrap completed', {
          realmId,
          created: bootstrapResult.created.length,
          skipped: bootstrapResult.skipped.length,
          errors: bootstrapResult.errors.length,
        });
      } catch (error) {
        // Log error but don't fail realm creation
        this.logger.error('Failed to bootstrap adapters', error as Error, { realmId });
      }
    }

    // Auto-create default channels
    if (this.defaultChannelsInitializer) {
      try {
        this.logger.info('Creating default channels for new realm', { realmId });
        await this.defaultChannelsInitializer.initializeForRealm(
          realmId,
          dto.ownerId
        );
        this.logger.info('Default channels created', { realmId });

        // Add owner to default channels
        if (this.channelRepository) {
          try {
            this.logger.info('Adding owner to default channels', { realmId, ownerId: dto.ownerId });

            const allChannels = await this.channelRepository.findAll(realmId);
            const defaultChannels = allChannels.filter(ch =>
              ch.name === 'general' || ch.name === 'welcome'
            );

            for (const channel of defaultChannels) {
              if (!channel.hasMember(dto.ownerId)) {
                const updatedChannel = channel.addMember({
                  memberId: dto.ownerId,
                  memberType: 'human',
                  role: 'member',
                  joinedAt: new Date(),
                });
                await this.channelRepository.update(updatedChannel, realmId);
                this.logger.info('Owner added to channel', {
                  channelId: channel.channelId,
                  channelName: channel.name,
                });
              }
            }

            this.logger.info('Owner added to default channels successfully', { realmId });
          } catch (error) {
            this.logger.error('Failed to add owner to default channels', error as Error, { realmId });
          }
        }
      } catch (error) {
        // Log error but don't fail realm creation
        this.logger.error('Failed to create default channels', error as Error, { realmId });
      }
    }

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

  /**
   * Create a realm and return device information (including API key and start command)
   */
  async createRealmWithDevice(dto: CreateRealmDTO): Promise<{
    realm: RealmEntity;
    device: {
      deviceId: string;
      apiKey: string;
      startCommand: string;
      warning: string;
    } | null;
  }> {
    const realm = await this.createRealm(dto);

    if (!this.deviceService || !this.deviceAuthService) {
      this.logger.warn('Device services not configured, cannot return device info');
      return { realm, device: null };
    }

    try {
      const device = await this.deviceService.getRealmDevice(realm.realm_id);
      if (!device) {
        throw new Error('Device not found after realm creation');
      }

      // Generate fresh API key for immediate use
      const apiKey = await this.deviceAuthService.generateApiKey(
        device.device_id,
        realm.realm_id
      );

      const startCommand = buildDeviceStartCommand({
        deviceId: device.device_id,
        apiKey,
        realmId: realm.realm_id,
      });

      return {
        realm,
        device: {
          deviceId: device.device_id,
          apiKey,
          startCommand,
          warning: '⚠️ API Key will only be shown once. Please save it securely.',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get device info', error as Error, { realmId: realm.realm_id });
      return { realm, device: null };
    }
  }

  /**
   * Create a device for a realm (private helper)
   */
  private async createRealmDevice(
    realmId: string
  ): Promise<DeviceEntity> {
    if (!this.deviceService || !this.deviceAuthService) {
      throw new Error('Device services not configured');
    }

    // Check 1:1 constraint
    const hasDevice = await this.deviceService.hasDevice(realmId);
    if (hasDevice) {
      this.logger.info('Realm already has device, skipping creation', { realmId });
      const device = await this.deviceService.getRealmDevice(realmId);
      if (!device) {
        throw new Error('Device check inconsistency');
      }
      return device;
    }

    // Create device
    const device = await this.deviceService.createDevice({
      name: `${realmId}-device`,
      displayName: `Device for ${realmId}`,
      description: `Auto-generated device for realm ${realmId}`,
      type: 'virtual',
      provider: 'local',
      specs: {
        cpu_cores: 1,
        memory_gb: 1,
        storage_gb: 1,
      },
      realmId,
    });

    this.logger.info('Device created for realm', {
      realmId,
      deviceId: device.device_id,
    });

    return device;
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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_MANAGE
    );

    let server = await this.getRealmById(realmId);

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

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.SERVER_DELETE
    );

    // Verify realm exists before deleting
    await this.getRealmById(realmId);

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
    const context = getRealmContext();
    this.logger.info('Adding member to server', { realmId, userId, role });

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.MEMBER_INVITE
    );

    // Business rule: Cannot add owner role (only via transfer)
    if (role === 'owner') {
      throw new Error('Cannot add owner role directly. Use transferOwnership instead.');
    }

    // Business rule: Admin can only add member/guest, not admin
    const currentMember = await this.serverMemberRepository.findByServerAndUser(realmId, context.userId);
    if (currentMember?.role === 'admin' && role === 'admin') {
      throw new Error('Admin cannot add another admin. Only owner can add admin.');
    }

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
    const context = getRealmContext();
    this.logger.info('Updating realm member', { realmId, userId, dto });

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.MEMBER_MANAGE_ROLES
    );

    const member = await this.serverMemberRepository.findByServerAndUser(realmId, userId);
    if (!member) {
      throw new Error(`Member not found: ${userId} in server ${realmId}`);
    }

    // Business rule: Cannot modify owner
    if (member.role === 'owner') {
      throw new Error('Cannot modify owner. Transfer ownership first.');
    }

    // Business rule: Cannot modify self
    if (userId === context.userId) {
      throw new Error('Cannot modify your own role or status.');
    }

    // Business rule: Admin cannot promote to admin
    const currentMember = await this.serverMemberRepository.findByServerAndUser(realmId, context.userId);
    if (currentMember?.role === 'admin' && dto.role === 'admin') {
      throw new Error('Admin cannot promote members to admin. Only owner can do this.');
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
    const context = getRealmContext();

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.MEMBER_VIEW
    );

    if (filters?.role) {
      return await this.serverMemberRepository.findByRole(realmId, filters.role);
    }
    if (filters?.status) {
      return await this.serverMemberRepository.findByStatus(realmId, filters.status);
    }
    return await this.serverMemberRepository.findByServer(realmId);
  }

  async getServerMember(realmId: string, userId: string): Promise<RealmMemberEntity | null> {
    const context = getRealmContext();

    // Check permission using RBAC system
    await this.permissionService.requirePermission(
      context.userId,
      realmId,
      RealmPermission.MEMBER_VIEW
    );

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
      const zhangAgent = await this.agentRepository.findById('agent-zhang', realmId);
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
    const members = await this.serverMemberRepository.findAllByUser(userId);

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
