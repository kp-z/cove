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
  DeviceNotActiveError,
  DeviceAlreadyRevokedError,
  DeviceNotRevokedError,
  UnauthorizedDeviceAccessError,
} from './device.errors';
import {
  IDeviceRepository,
  IEventBus,
  ILogger,
  DomainEvent,
} from '../../interfaces';
import { getServerContext } from '../../context/server-context-store';

export interface CreateDeviceDTO {
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly serverId: string;
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
    const context = getServerContext();
    this.logger.info('Creating new device', { name: dto.name, serverId: dto.serverId });

    // Check if device name already exists for this server
    const existing = await this.deviceRepository.findByServer(dto.serverId);
    if (existing.some(d => d.name === dto.name)) {
      throw new DeviceNameAlreadyExistsError(dto.name, context.userId);
    }

    const deviceId = this.generateDeviceId();

    const device = DeviceEntity.create({
      device_id: deviceId,
      name: dto.name,
      display_name: dto.displayName,
      description: dto.description,
      server_id: dto.serverId,
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

    await this.deviceRepository.save(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.created',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: {
        deviceId,
        name: dto.name,
        serverId: dto.serverId,
        type: dto.type,
      },
    });

    this.logger.info('Device created successfully', { deviceId });
    return device;
  }

  async getDeviceById(deviceId: string): Promise<DeviceEntity> {
    const device = await this.deviceRepository.findById(deviceId);
    if (!device) {
      throw new DeviceNotFoundError(deviceId);
    }
    return device;
  }

  async getDevicesByServer(serverId: string): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findByServer(serverId);
  }

  async getDevicesByStatus(status: DeviceStatus): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findByStatus(status);
  }

  async getDevicesByServerAndStatus(serverId: string, status: DeviceStatus): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findByServerAndStatus(serverId, status);
  }

  async getAllDevices(): Promise<DeviceEntity[]> {
    return await this.deviceRepository.findAll();
  }

  async updateDevice(deviceId: string, dto: UpdateDeviceDTO): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Updating device', { deviceId });

    let device = await this.getDeviceById(deviceId);

    if (dto.name !== undefined) {
      // Check if new name already exists for this server
      const existing = await this.deviceRepository.findByServer(device.server_id);
      const duplicateDevice = existing.find(d => d.name === dto.name && d.device_id !== deviceId);
      if (duplicateDevice) {
        throw new DeviceNameAlreadyExistsError(dto.name, context.userId);
      }
    }

    // Build update object
    const updates: any = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.displayName !== undefined) updates.display_name = dto.displayName;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.provider !== undefined) updates.provider = dto.provider;

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const json = device.toJSON();
      device = DeviceEntity.fromJSON({
        ...json,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    }

    await this.deviceRepository.update(device, context.serverId);

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
    const context = getServerContext();
    this.logger.info('Updating device specs', { deviceId });

    let device = await this.getDeviceById(deviceId);

    const specsUpdate: Partial<DeviceSpecs> = {};
    if (dto.cpuCores !== undefined) specsUpdate.cpu_cores = dto.cpuCores;
    if (dto.memoryGb !== undefined) specsUpdate.memory_gb = dto.memoryGb;
    if (dto.storageGb !== undefined) specsUpdate.storage_gb = dto.storageGb;
    if (dto.gpuCount !== undefined) specsUpdate.gpu_count = dto.gpuCount;
    if (dto.gpuModel !== undefined) specsUpdate.gpu_model = dto.gpuModel;

    device = device.updateSpecs(specsUpdate);

    await this.deviceRepository.update(device, context.serverId);

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
    const context = getServerContext();
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

    await this.deviceRepository.update(device, context.serverId);

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
    const context = getServerContext();
    this.logger.info('Updating device location', { deviceId });

    let device = await this.getDeviceById(deviceId);

    const locationUpdate: DeviceLocation = {
      datacenter: dto.datacenter,
      region: dto.region,
      zone: dto.zone,
      rack: dto.rack,
    };

    device = device.updateLocation(locationUpdate);

    await this.deviceRepository.update(device, context.serverId);

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

  async markDeviceOnline(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Marking device online', { deviceId });

    let device = await this.getDeviceById(deviceId);
    device = device.markOnline();

    await this.deviceRepository.update(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.online',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId },
    });

    this.logger.info('Device marked online', { deviceId });
    return device;
  }

  async markDeviceOffline(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Marking device offline', { deviceId });

    let device = await this.getDeviceById(deviceId);
    device = device.markOffline();

    await this.deviceRepository.update(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.offline',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId },
    });

    this.logger.info('Device marked offline', { deviceId });
    return device;
  }

  async enterDeviceMaintenance(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Entering device maintenance', { deviceId });

    let device = await this.getDeviceById(deviceId);
    device = device.enterMaintenance();

    await this.deviceRepository.update(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.maintenance_started',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId },
    });

    this.logger.info('Device entered maintenance', { deviceId });
    return device;
  }

  async exitDeviceMaintenance(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Exiting device maintenance', { deviceId });

    let device = await this.getDeviceById(deviceId);
    device = device.exitMaintenance();

    await this.deviceRepository.update(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.maintenance_ended',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId },
    });

    this.logger.info('Device exited maintenance', { deviceId });
    return device;
  }

  async reportDeviceError(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Reporting device error', { deviceId });

    let device = await this.getDeviceById(deviceId);
    device = device.reportError();

    await this.deviceRepository.update(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.error_reported',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId },
    });

    this.logger.info('Device error reported', { deviceId });
    return device;
  }

  async decommissionDevice(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();
    this.logger.info('Decommissioning device', { deviceId });

    let device = await this.getDeviceById(deviceId);
    device = device.decommission();

    await this.deviceRepository.update(device, context.serverId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.decommissioned',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId },
    });

    this.logger.info('Device decommissioned', { deviceId });
    return device;
  }

  async updateDeviceHeartbeat(deviceId: string): Promise<DeviceEntity> {
    const context = getServerContext();

    let device = await this.getDeviceById(deviceId);
    device = device.updateHeartbeat();

    await this.deviceRepository.update(device, context.serverId);

    // No event for heartbeat updates (too frequent)
    return device;
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const context = getServerContext();
    this.logger.info('Deleting device', { deviceId });

    const device = await this.getDeviceById(deviceId);

    await this.deviceRepository.delete(deviceId);

    await this.publishEvent({
      eventId: this.generateEventId(),
      eventType: 'device.deleted',
      aggregateId: deviceId,
      aggregateType: 'Device',
      occurredAt: new Date(),
      payload: { deviceId, serverId: device.server_id },
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
      this.logger.error('Failed to publish event', { event, error });
      // Don't throw - event publishing failure shouldn't break the operation
    }
  }
}
