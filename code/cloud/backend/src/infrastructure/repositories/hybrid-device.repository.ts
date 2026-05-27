/**
 * HybridDeviceRepository - Device 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, realmId, name, type, status）
 * - 文件系统：存储完整的 Device 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { DeviceEntity, DeviceType, DeviceStatus } from '../../domain/models/device/device.entity';
import { IDeviceRepository } from '../../application/interfaces/repositories/device.repository.interface';
import { getRealmContext } from '../../application/context/realm-context-store';

interface DeviceDbRecord {
  id: string;
  realmId: string;
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
  description?: string;
  provider?: string;
  specs: {
    cpu_cores: number;
    memory_gb: number;
    storage_gb: number;
    gpu_count?: number;
    gpu_model?: string;
  };
  network?: {
    hostname?: string;
    ip_address?: string;
    port?: number;
    protocol?: 'http' | 'https';
    domain?: string;
  };
  location?: {
    datacenter?: string;
    region?: string;
    zone?: string;
    rack?: string;
  };
  meta?: Record<string, unknown>;
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
      realm_id: dbRecord.realmId,
      name: dbRecord.name,
      display_name: dbRecord.displayName || undefined,
      description: content.description,
      type: dbRecord.type as DeviceType,
      provider: content.provider,
      specs: content.specs,
      network: content.network,
      location: content.location,
      status: dbRecord.status as DeviceStatus,
      last_seen_at: dbRecord.lastSeenAt || undefined,
      created_at: dbRecord.createdAt,
      updated_at: dbRecord.updatedAt,
      meta: content.meta,
    });
  }

  toDatabase(entity: DeviceEntity): DeviceDbRecord {
    return {
      id: entity.device_id,
      realmId: entity.realm_id,
      name: entity.name,
      displayName: entity.display_name || null,
      type: entity.type,
      status: entity.status,
      platform: null, // Platform field removed from entity
      configPath: '',
      lastSeenAt: entity.last_seen_at || null,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  toStorage(entity: DeviceEntity): DeviceContent {
    return {
      description: entity.description,
      provider: entity.provider,
      specs: entity.specs,
      network: entity.network,
      location: entity.location,
      meta: entity.meta,
    };
  }

  getContentPath(dbRecord: DeviceDbRecord): string {
    return dbRecord.configPath;
  }

  // --- IDeviceRepository ---

  async findById(deviceId: string, realmId: string): Promise<DeviceEntity | null> {
    const record = await this.prisma.device.findFirst({
      where: { id: deviceId, realmId },
    });
    if (!record) return null;
    const content = await this.storage.loadJson(record.configPath);
    return this.toDomain(record as unknown as DeviceDbRecord, content);
  }

  async findByServer(realmId: string): Promise<DeviceEntity[]> {
    const records = await this.prisma.device.findMany({
      where: { realmId },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findByStatus(status: DeviceStatus): Promise<DeviceEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.device.findMany({
      where: { realmId: context.realmId, status },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findByServerAndStatus(realmId: string, status: DeviceStatus): Promise<DeviceEntity[]> {
    const records = await this.prisma.device.findMany({
      where: { realmId, status },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findByType(type: DeviceType, realmId: string): Promise<DeviceEntity[]> {
    const records = await this.prisma.device.findMany({
      where: { realmId, type },
    });
    return this.loadEntities(records as unknown as DeviceDbRecord[]);
  }

  async findAll(): Promise<DeviceEntity[]> {
    const context = getRealmContext();
    return this.findByServer(context.realmId);
  }

  async save(device: DeviceEntity, realmId: string): Promise<void> {
    await this.saveEntity(device, realmId);
  }

  async update(device: DeviceEntity, realmId: string): Promise<void> {
    await this.updateEntity(device, realmId);
  }

  async delete(deviceId: string, realmId: string): Promise<void> {
    await this.deleteEntity(deviceId, realmId);
  }

  async exists(deviceId: string): Promise<boolean> {
    const context = getRealmContext();
    const count = await this.prisma.device.count({
      where: { id: deviceId, realmId: context.realmId },
    });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async findInDatabase(entityId: string, realmId: string): Promise<DeviceDbRecord | null> {
    const record = await this.prisma.device.findFirst({
      where: {
        id: entityId,
        realmId,
      },
    });
    return record as unknown as DeviceDbRecord | null;
  }

  protected async saveToDatabase(dbRecord: DeviceDbRecord, contentPath: string): Promise<void> {
    await this.prisma.device.create({
      data: {
        id: dbRecord.id,
        realmId: dbRecord.realmId,
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

  protected async updateInDatabase(entityId: string, dbRecord: DeviceDbRecord, contentPath: string): Promise<void> {
    await this.prisma.device.update({
      where: { id: entityId },
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

  protected async deleteFromDatabase(entityId: string, realmId: string): Promise<void> {
    await this.prisma.device.delete({
      where: { id: entityId, realmId },
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
