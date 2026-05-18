/**
 * HybridDeviceRepository - Device 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, serverId, name, type, status, platform）
 * - 文件系统：存储完整的 Device 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { DeviceEntity, DeviceType, DeviceStatus } from '../../domain/models/device/device.entity';
import { IDeviceRepository } from '../../application/interfaces/repositories/device.repository.interface';

interface DeviceDbRecord {
  id: string;
  serverId: string;
  name: string;
  displayName: string | null;
  type: string;
  status: string;
  platform: string | null;
  configPath: string;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DeviceContent {
  metadata?: Record<string, any>;
  capabilities?: string[];
  location?: string;
}

export class HybridDeviceRepository
  extends HybridRepository<DeviceEntity, DeviceDbRecord, DeviceContent>
  implements IDeviceRepository
{
  getEntityType(): string {
    return 'devices';
  }

  getEntityId(entity: DeviceEntity): string {
    return entity.device_id;
  }

  toDomain(dbRecord: DeviceDbRecord, content: DeviceContent): DeviceEntity {
    return DeviceEntity.create({
      device_id: dbRecord.id,
      server_id: dbRecord.serverId,
      name: dbRecord.name,
      display_name: dbRecord.displayName || undefined,
      type: dbRecord.type as DeviceType,
      status: dbRecord.status as DeviceStatus,
      platform: dbRecord.platform || undefined,
      metadata: content.metadata,
      capabilities: content.capabilities,
      location: content.location,
      last_seen_at: dbRecord.lastSeenAt || undefined,
      created_at: dbRecord.createdAt,
      updated_at: dbRecord.updatedAt,
    });
  }

  toDatabase(entity: DeviceEntity): DeviceDbRecord {
    return {
      id: entity.device_id,
      serverId: entity.server_id,
      name: entity.name,
      displayName: entity.display_name || null,
      type: entity.type,
      status: entity.status,
      platform: entity.platform || null,
      configPath: '',
      lastSeenAt: entity.last_seen_at || null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  toStorage(entity: DeviceEntity): DeviceContent {
    return {
      metadata: entity.metadata,
      capabilities: entity.capabilities,
      location: entity.location,
    };
  }

  getContentPath(dbRecord: DeviceDbRecord): string {
    return dbRecord.configPath;
  }

  // --- IDeviceRepository ---

  async findById(deviceId: string, serverId: string): Promise<DeviceEntity | null> {
    const record = await this.prisma.device.findFirst({
      where: { id: deviceId, serverId },
    });
    if (!record) return null;
    const content = await this.storage.loadJson(record.configPath);
    return this.toDomain(record as unknown as DeviceDbRecord, content);
  }

  async findByServer(serverId: string): Promise<DeviceEntity[]> {
    const records = await this.prisma.device.findMany({
      where: { serverId },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findByStatus(status: DeviceStatus, serverId: string): Promise<DeviceEntity[]> {
    const records = await this.prisma.device.findMany({
      where: { serverId, status },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findByType(type: DeviceType, serverId: string): Promise<DeviceEntity[]> {
    const records = await this.prisma.device.findMany({
      where: { serverId, type },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findAll(serverId: string): Promise<DeviceEntity[]> {
    return this.findByServer(serverId);
  }

  async save(device: DeviceEntity, serverId: string): Promise<void> {
    await this.saveEntity(device, serverId);
  }

  async update(device: DeviceEntity, serverId: string): Promise<void> {
    await this.updateEntity(device, serverId);
  }

  async delete(deviceId: string, serverId: string): Promise<void> {
    await this.deleteEntity(deviceId);
  }

  async exists(deviceId: string, serverId: string): Promise<boolean> {
    const count = await this.prisma.device.count({
      where: { id: deviceId, serverId },
    });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: DeviceDbRecord, contentPath: string): Promise<void> {
    await this.prisma.device.create({
      data: {
        id: dbRecord.id,
        serverId: dbRecord.serverId,
        name: dbRecord.name,
        displayName: dbRecord.displayName,
        type: dbRecord.type,
        status: dbRecord.status,
        platform: dbRecord.platform,
        configPath: contentPath,
        lastSeenAt: dbRecord.lastSeenAt,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async updateInDatabase(dbRecord: DeviceDbRecord, contentPath: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: dbRecord.id },
      data: {
        name: dbRecord.name,
        displayName: dbRecord.displayName,
        type: dbRecord.type,
        status: dbRecord.status,
        platform: dbRecord.platform,
        configPath: contentPath,
        lastSeenAt: dbRecord.lastSeenAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.device.delete({
      where: { id: entityId },
    });
  }

  protected async loadEntities(dbRecords: DeviceDbRecord[]): Promise<DeviceEntity[]> {
    const entities: DeviceEntity[] = [];
    for (const record of dbRecords) {
      const content = await this.storage.loadJson(record.configPath);
      entities.push(this.toDomain(record, content));
    }
    return entities;
  }
}
