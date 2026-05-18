/**
 * HybridServerRepository - Server 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, name, ownerId, status, visibility）
 * - 文件系统：存储完整的 Server 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { ServerEntity, ServerStatus, ServerVisibility } from '../../domain/models/server/server.entity';
import { IServerRepository } from '../../application/interfaces/repositories/server.repository.interface';

interface ServerDbRecord {
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

interface ServerContent {
  settings?: Record<string, any>;
  features?: string[];
}

export class HybridServerRepository
  extends HybridRepository<ServerEntity, ServerDbRecord, ServerContent>
  implements IServerRepository
{
  getEntityType(): string {
    return 'servers';
  }

  getEntityId(entity: ServerEntity): string {
    return entity.server_id;
  }

  toDomain(dbRecord: ServerDbRecord, content: ServerContent): ServerEntity {
    return ServerEntity.create({
      server_id: dbRecord.id,
      name: dbRecord.name,
      display_name: dbRecord.displayName,
      description: dbRecord.description || undefined,
      owner_id: dbRecord.ownerId,
      status: dbRecord.status as ServerStatus,
      visibility: dbRecord.visibility as ServerVisibility,
      settings: content.settings,
      features: content.features,
      created_at: dbRecord.createdAt,
      updated_at: dbRecord.updatedAt,
    });
  }

  toDatabase(entity: ServerEntity): ServerDbRecord {
    return {
      id: entity.server_id,
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

  toStorage(entity: ServerEntity): ServerContent {
    return {
      settings: entity.settings,
      features: entity.features,
    };
  }

  getContentPath(dbRecord: ServerDbRecord): string {
    return dbRecord.configPath;
  }

  // --- IServerRepository ---

  async findById(serverId: string): Promise<ServerEntity | null> {
    const record = await this.prisma.server.findUnique({
      where: { id: serverId },
    });
    if (!record) return null;
    const content = await this.storage.loadJson(record.configPath);
    return this.toDomain(record as unknown as ServerDbRecord, content);
  }

  async findByName(name: string): Promise<ServerEntity | null> {
    const record = await this.prisma.server.findUnique({
      where: { name },
    });
    if (!record) return null;
    const content = await this.storage.loadJson(record.configPath);
    return this.toDomain(record as unknown as ServerDbRecord, content);
  }

  async findByOwner(ownerId: string): Promise<ServerEntity[]> {
    const records = await this.prisma.server.findMany({
      where: { ownerId },
    });
    return this.loadEntities(records as unknown as ServerDbRecord[]);
  }

  async findByStatus(status: ServerStatus): Promise<ServerEntity[]> {
    const records = await this.prisma.server.findMany({
      where: { status },
    });
    return this.loadEntities(records as unknown as ServerDbRecord[]);
  }

  async findAll(): Promise<ServerEntity[]> {
    const records = await this.prisma.server.findMany();
    return this.loadEntities(records as unknown as ServerDbRecord[]);
  }

  async save(server: ServerEntity, serverId: string): Promise<void> {
    await this.saveEntity(server, serverId);
  }

  async update(server: ServerEntity, serverId: string): Promise<void> {
    await this.updateEntity(server, serverId);
  }

  async delete(serverId: string): Promise<void> {
    await this.deleteEntity(serverId);
  }

  async exists(serverId: string): Promise<boolean> {
    const count = await this.prisma.server.count({
      where: { id: serverId },
    });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: ServerDbRecord, contentPath: string): Promise<void> {
    await this.prisma.server.create({
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

  protected async updateInDatabase(dbRecord: ServerDbRecord, contentPath: string): Promise<void> {
    await this.prisma.server.update({
      where: { id: dbRecord.id },
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
    await this.prisma.server.delete({
      where: { id: entityId },
    });
  }

  protected async loadEntities(dbRecords: ServerDbRecord[]): Promise<ServerEntity[]> {
    const entities: ServerEntity[] = [];
    for (const record of dbRecords) {
      const content = await this.storage.loadJson(record.configPath);
      entities.push(this.toDomain(record, content));
    }
    return entities;
  }
}
