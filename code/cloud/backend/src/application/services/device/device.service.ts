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

    // No event for heartbeat updates (too frequent)
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
