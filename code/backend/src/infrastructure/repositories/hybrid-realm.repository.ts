/**
 * HybridRealmRepository - Server 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, name, ownerId, status, visibility）
 * - 文件系统：存储完整的 Realm 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { RealmEntity, RealmStatus, RealmVisibility, ServerSettings, ServerLimits } from '../../domain/models/realm/realm.entity';
import { IRealmRepository } from '../../application/interfaces/repositories/realm.repository.interface';

interface RealmDbRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  ownerId: string;
  status: string;
  visibility: string;
  configPath: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RealmContent {
  settings: ServerSettings;
  limits: ServerLimits;
  meta?: {
    readonly tags?: readonly string[];
    readonly icon?: string;
    readonly banner?: string;
  };
}

export class HybridRealmRepository
  extends HybridRepository<RealmEntity, RealmDbRecord, RealmContent>
  implements IRealmRepository
{
  getEntityType(): string {
    return 'servers';
  }

  getEntityId(entity: RealmEntity): string {
    return entity.realm_id;
  }

  toDomain(dbRecord: RealmDbRecord, content: RealmContent): RealmEntity {
    return RealmEntity.create({
      realm_id: dbRecord.id,
      name: dbRecord.name,
      display_name: dbRecord.displayName,
      description: dbRecord.description || undefined,
      owner_id: dbRecord.ownerId,
      status: dbRecord.status as RealmStatus,
      visibility: dbRecord.visibility as RealmVisibility,
      settings: content.settings,
      limits: content.limits,
      meta: content.meta || {},
      created_at: dbRecord.createdAt,
      updated_at: dbRecord.updatedAt,
    });
  }

  toDatabase(entity: RealmEntity): RealmDbRecord {
    return {
      id: entity.realm_id,
      name: entity.name,
      displayName: entity.display_name,
      description: entity.description || null,
      ownerId: entity.owner_id,
      status: entity.status,
      visibility: entity.visibility,
      configPath: '',
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
  }

  toStorage(entity: RealmEntity): RealmContent {
    return {
      settings: entity.settings,
      limits: entity.limits,
      meta: entity.meta,
    };
  }

  getContentPath(dbRecord: RealmDbRecord): string {
    return dbRecord.configPath;
  }

  // --- IRealmRepository ---

  async find(filters?: { id?: string; ownerId?: string; status?: RealmStatus }): Promise<RealmEntity[]> {
    // 如果查询单个 ID，直接返回单个结果（或空数组）
    if (filters?.id) {
      const record = await this.prisma.realm.findUnique({
        where: { id: filters.id },
      });
      if (!record) return [];
      const content = await this.storage.loadJson(record.configPath);
      return [this.toDomain(record as unknown as RealmDbRecord, content)];
    }

    // 构建查询条件
    const where: any = {};
    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }

    const records = await this.prisma.realm.findMany({ where });
    return this.loadEntities(records as unknown as RealmDbRecord[]);
  }

  async findByName(name: string): Promise<RealmEntity | null> {
    const record = await this.prisma.realm.findUnique({
      where: { name },
    });
    if (!record) return null;
    const content = await this.storage.loadJson(record.configPath);
    return this.toDomain(record as unknown as RealmDbRecord, content);
  }

  async save(server: RealmEntity, realmId: string): Promise<void> {
    await this.saveEntity(server, realmId);
  }

  async update(server: RealmEntity, realmId: string): Promise<void> {
    await this.updateEntity(server, realmId);
  }

  async delete(realmId: string): Promise<void> {
    await this.deleteEntity(realmId);
  }

  async exists(realmId: string): Promise<boolean> {
    const count = await this.prisma.realm.count({
      where: { id: realmId },
    });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async findInDatabase(entityId: string): Promise<RealmDbRecord | null> {
    const record = await this.prisma.realm.findUnique({
      where: { id: entityId },
    });
    return record as unknown as RealmDbRecord | null;
  }

  protected async saveToDatabase(dbRecord: RealmDbRecord, contentPath: string): Promise<void> {
    await this.prisma.realm.create({
      data: {
        id: dbRecord.id,
        name: dbRecord.name,
        displayName: dbRecord.displayName,
        description: dbRecord.description,
        ownerId: dbRecord.ownerId,
        status: dbRecord.status,
        visibility: dbRecord.visibility,
        configPath: contentPath,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: RealmDbRecord, contentPath: string): Promise<void> {
    await this.prisma.realm.update({
      where: { id: entityId },
      data: {
        name: dbRecord.name,
        displayName: dbRecord.displayName,
        description: dbRecord.description,
        status: dbRecord.status,
        visibility: dbRecord.visibility,
        configPath: contentPath,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.realm.delete({
      where: { id: entityId },
    });
  }

  protected async loadEntities(dbRecords: RealmDbRecord[]): Promise<RealmEntity[]> {
    const entities: RealmEntity[] = [];
    for (const record of dbRecords) {
      const content = await this.storage.loadJson(record.configPath);
      entities.push(this.toDomain(record, content));
    }
    return entities;
  }
}
