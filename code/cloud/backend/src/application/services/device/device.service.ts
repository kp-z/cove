/**
 * DeviceService - Device 管理业务逻辑
 *
 * 职责：
 * - 创建和管理设备
 * - 设备查询
 * - 设备状态管理（上线、下线、维护、停用）
 * - 设备规格和网络配置管理
 */

import {
  DeviceEntity,
  DeviceStatus,
  DeviceType,
  DeviceSpecs,
  DeviceNetwork,
  DeviceLocation,
} from '../../../domain/models/device/device.entity';
import {
  DeviceNotFoundError,
  DeviceNameAlreadyExistsError,
} from './device.errors';
import {
  IDeviceRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { getRealmContext } from '../../context/realm-context-store';
import { RealmContext } from '../../context/realm-context';
import { runWithContext } from '../../context/realm-context-store';

export interface CreateDeviceDTO {
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly realmId: string;
  readonly type: DeviceType;
  readonly provider?: string;
  readonly specs: DeviceSpecs;
  readonly network?: DeviceNetwork;
  readonly location?: DeviceLocation;
}

export interface UpdateDeviceDTO {
  readonly name?: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly provider?: string;
  readonly status?: DeviceStatus;
}

export interface UpdateDeviceSpecsDTO {
  readonly cpuCores?: number;
  readonly memoryGb?: number;
  readonly storageGb?: number;
  readonly gpuCount?: number;
  readonly gpuModel?: string;
}

export interface UpdateDeviceNetworkDTO {
  readonly hostname?: string;
  readonly ipAddress?: string;
  readonly port?: number;
  readonly protocol?: 'http' | 'https';
  readonly domain?: string;
}

export interface UpdateDeviceLocationDTO {
  readonly datacenter?: string;
  readonly region?: string;
  readonly zone?: string;
  readonly rack?: string;
}

export class DeviceService {
  private offlineCheckInterval: NodeJS.Timeout | null = null;
  private deviceStatusCache: Map<string, 'online' | 'offline'> = new Map();
  private readonly HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

  constructor(
    private readonly deviceRepository: IDeviceRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger
  ) {}

  async createDevice(dto: CreateDeviceDTO): Promise<DeviceEntity> {
    const context = getRealmContext();
    this.logger.info('Creating new device', { name: dto.name, realmId: dto.realmId });

    // Check if device name already exists for this server
    const existing = await this.deviceRepository.findByServer(dto.realmId);
    if (existing.some(d => d.name === dto.name)) {
      throw new DeviceNameAlreadyExistsError(dto.name, context.userId);
    }

    const deviceId = this.generateDeviceId();

    const device = DeviceEntity.create({
      device_id: deviceId,
      name: dto.name,
      display_name: dto.displayName,
      description: dto.description,
      realm_id: dto.realmId,
      type: dto.type,
      provider: dto.provider,
      specs: dto.specs,
      network: dto.network,
      location: dto.location,
      status: 'provisioning',
      created_at: new Date(),
      updated_at: new Date(),
      meta: {},
    });

    await this.deviceRepository.save(device, dto.realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.created',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: {
        deviceId,
        name: dto.name,
        realmId: dto.realmId,
        type: dto.type,
      },
    });

    this.logger.info('Device created successfully', { deviceId });
    return device;
  }

  async getDeviceById(deviceId: string): Promise<DeviceEntity> {
    const device = await this.deviceRepository.findById(deviceId, getRealmContext().realmId);
    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }
    return device;
  }

  async getDevicesByServer(realmId: string): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findByServer(realmId);
  }

  async getDevicesByStatus(status: DeviceStatus): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findByStatus(status);
  }

  async getDevicesByServerAndStatus(realmId: string, status: DeviceStatus): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findByServerAndStatus(realmId, status);
  }

  async getAllDevices(): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findAll();
  }

  /**
   * Check if a realm has any device (for 1:1 constraint validation)
   */
  async hasDevice(realmId: string): Promise<boolean> {
    const devices = await this.deviceRepository.findByServer(realmId);
    return devices.length > 0;
  }

  /**
   * Get the device for a realm (assumes 1:1 relationship)
   */
  async getRealmDevice(realmId: string): Promise<DeviceEntity | null> {
    const devices = await this.deviceRepository.findByServer(realmId);
    return devices.length > 0 ? devices[0]! : null;
  }

  async updateDevice(deviceId: string, dto: UpdateDeviceDTO): Promise<DeviceEntity> {
    const context = getRealmContext();
    this.logger.info('Updating device', { deviceId });

    let device = await this.getDeviceById(deviceId);

    if (dto.name !== undefined) {
      // Check if new name already exists for this server
      const existing = await this.deviceRepository.findByServer(device.realm_id);
      const duplicateDevice = existing.find(d => d.name === dto.name && d.device_id !== deviceId);
      if (duplicateDevice) {
        throw new DeviceNameAlreadyExistsError(dto.name, context.userId);
      }
    }

    // Handle status transitions
    if (dto.status !== undefined && dto.status !== device.status) {
      switch (dto.status) {
        case 'online':
          device = device.markOnline();
          break;
        case 'offline':
          device = device.markOffline();
          break;
        case 'maintenance':
          device = device.enterMaintenance();
          break;
        case 'decommissioned':
          device = device.decommission();
          break;
        default:
          // For 'provisioning' and 'error', update directly
          break;
      }
    }

    // Build update object for other fields
    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.displayName !== undefined) updates.display_name = dto.displayName;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.provider !== undefined) updates.provider = dto.provider;
    if (dto.status !== undefined && ['provisioning', 'error'].includes(dto.status)) {
      updates.status = dto.status;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const json = device.toJSON();
      device = DeviceEntity.fromJSON({
        ...json,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    }

    await this.deviceRepository.update(device, device.realm_id);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.updated',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId, changes: dto },
    });

    this.logger.info('Device updated successfully', { deviceId });
    return device;
  }

  async updateDeviceSpecs(deviceId: string, dto: UpdateDeviceSpecsDTO): Promise<DeviceEntity> {
    this.logger.info('Updating device specs', { deviceId });

    let device = await this.getDeviceById(deviceId);

    const specsUpdate: Partial<DeviceSpecs> = {};
    if (dto.cpuCores !== undefined) specsUpdate.cpu_cores = dto.cpuCores;
    if (dto.memoryGb !== undefined) specsUpdate.memory_gb = dto.memoryGb;
    if (dto.storageGb !== undefined) specsUpdate.storage_gb = dto.storageGb;
    if (dto.gpuCount !== undefined) specsUpdate.gpu_count = dto.gpuCount;
    if (dto.gpuModel !== undefined) specsUpdate.gpu_model = dto.gpuModel;

    device = device.updateSpecs(specsUpdate);

    await this.deviceRepository.update(device, device.realm_id);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.specs_updated',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId, specs: dto },
    });

    this.logger.info('Device specs updated successfully', { deviceId });
    return device;
  }

  async updateDeviceNetwork(deviceId: string, dto: UpdateDeviceNetworkDTO): Promise<DeviceEntity> {
    this.logger.info('Updating device network', { deviceId });

    let device = await this.getDeviceById(deviceId);

    const networkUpdate: DeviceNetwork = {
      hostname: dto.hostname,
      ip_address: dto.ipAddress,
      port: dto.port,
      protocol: dto.protocol,
      domain: dto.domain,
    };

    device = device.updateNetwork(networkUpdate);

    await this.deviceRepository.update(device, device.realm_id);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.network_updated',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId, network: dto },
    });

    this.logger.info('Device network updated successfully', { deviceId });
    return device;
  }

  async updateDeviceLocation(deviceId: string, dto: UpdateDeviceLocationDTO): Promise<DeviceEntity> {
    this.logger.info('Updating device location', { deviceId });

    let device = await this.getDeviceById(deviceId);

    const locationUpdate: DeviceLocation = {
      datacenter: dto.datacenter,
      region: dto.region,
      zone: dto.zone,
      rack: dto.rack,
    };

    device = device.updateLocation(locationUpdate);

    await this.deviceRepository.update(device, device.realm_id);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.location_updated',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId, location: dto },
    });

    this.logger.info('Device location updated successfully', { deviceId });
    return device;
  }

  async updateDeviceHeartbeat(deviceId: string): Promise<DeviceEntity> {
    let device = await this.getDeviceById(deviceId);
    device = device.updateHeartbeat();

    await this.deviceRepository.update(device, device.realm_id);

    // Check if device status changed from offline to online
    const previousStatus = this.deviceStatusCache.get(deviceId);
    const currentStatus = 'online';

    if (previousStatus !== currentStatus) {
      this.deviceStatusCache.set(deviceId, currentStatus);

      // Publish device.heartbeat event for online detection
      await this.publishEvent({
        eventId: this.generateEventId(),
        eventType: 'device.heartbeat',
        aggregateId: deviceId,
        aggregateType: 'Device',
        occurredAt: new Date(),
        payload: {
          deviceId,
          realmId: device.realm_id,
          status: 'online',
        },
      });
    }

    return device;
  }

  async deleteDevice(deviceId: string): Promise<void> {
    getRealmContext(); // Validate context exists
    this.logger.info('Deleting device', { deviceId });

    const device = await this.getDeviceById(deviceId);

    await this.deviceRepository.delete(deviceId, getRealmContext().realmId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.deleted',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId, realmId: device.realm_id },
    });

    this.logger.info('Device deleted successfully', { deviceId });
  }

  /**
   * Start offline detection background task
   * Checks all devices periodically and emits device.offline event when heartbeat timeout
   */
  startOfflineDetection(): void {
    if (this.offlineCheckInterval) {
      this.logger.warn('Offline detection already started');
      return;
    }

    this.logger.debug('Starting device offline detection', {
      checkInterval: `${this.CHECK_INTERVAL_MS}ms`,
      heartbeatTimeout: `${this.HEARTBEAT_TIMEOUT_MS}ms`,
    });

    this.offlineCheckInterval = setInterval(() => {
      this.checkDevicesOffline().catch((error) => {
        this.logger.error('Error checking devices offline', error as Error);
      });
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop offline detection background task
   */
  stopOfflineDetection(): void {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
      this.logger.info('Stopped device offline detection');
    }
  }

  /**
   * Check all devices for offline status and emit events
   */
  private async checkDevicesOffline(): Promise<void> {
    try {
      // 在定时任务中，需要为每个 realm 创建上下文
      // 这里我们使用 default-server 作为 realmId，因为这是后台任务
      const context = RealmContext.create('default-server', 'system');

      await runWithContext(context, async () => {
        const allDevices = await this.deviceRepository.findAll();
        const now = Date.now();

        for (const device of allDevices) {
          const deviceId = device.device_id;
          const lastSeenAt = device.last_seen_at ? new Date(device.last_seen_at).getTime() : 0;
          const timeSinceLastSeen = now - lastSeenAt;

          // Determine current status based on last_seen_at
          const currentStatus = timeSinceLastSeen > this.HEARTBEAT_TIMEOUT_MS ? 'offline' : 'online';
          const previousStatus = this.deviceStatusCache.get(deviceId);

          // Only emit event if status changed from online to offline
          if (previousStatus === 'online' && currentStatus === 'offline') {
            this.logger.info('Device went offline', {
              deviceId,
              realmId: device.realm_id,
              lastSeenAt: device.last_seen_at,
              timeSinceLastSeen: `${Math.round(timeSinceLastSeen / 1000)}s`,
            });

            this.deviceStatusCache.set(deviceId, 'offline');

            // Emit device.offline event
            await this.publishEvent({
              eventId: this.generateEventId(),
              eventType: 'device.offline',
              aggregateId: deviceId,
              aggregateType: 'Device',
              occurredAt: new Date(),
              payload: {
                deviceId,
                realmId: device.realm_id,
                status: 'offline',
                lastSeenAt: device.last_seen_at,
              },
            });
          } else if (!previousStatus && currentStatus === 'offline') {
            // Initialize cache for devices that are already offline
            this.deviceStatusCache.set(deviceId, 'offline');
          } else if (!previousStatus && currentStatus === 'online') {
            // Initialize cache for devices that are online
            this.deviceStatusCache.set(deviceId, 'online');
          }
        }
      });
    } catch (error) {
      this.logger.error('Failed to check devices offline', error as Error);
      throw error;
    }
  }

  // --- Helper methods ---

  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', error as Error, {
        eventType: event.constructor.name
      });
      // Don't throw - event publishing failure shouldn't break the operation
    }
  }
}
