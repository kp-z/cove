/**
 * HybridProjectRepository - Project 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, name, ownerId, status）
 * - 文件系统：存储完整的 Project 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { ProjectEntity, ProjectStatus } from '../../domain/models/project/project.entity';
import { IProjectRepository } from '../../application/interfaces/repositories/project.repository.interface';

interface ProjectDbRecord {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  status: string;
  metadataPath: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectContent {
  displayName: string;
  visibility: string;
  channelIds: string[];
  agentIds: string[];
  okrIds: string[];
}

export class HybridProjectRepository
  extends HybridRepository<ProjectEntity, ProjectDbRecord, ProjectContent>
  implements IProjectRepository
{
  getEntityType(): string { return 'projects'; }
  getEntityId(entity: ProjectEntity): string { return entity.projectId; }

  toDomain(dbRecord: ProjectDbRecord, content: ProjectContent): ProjectEntity {
    return ProjectEntity.create({
      projectId: dbRecord.id,
      name: dbRecord.name,
      displayName: content.displayName,
      description: dbRecord.description ?? undefined,
      ownerId: dbRecord.ownerId,
      status: dbRecord.status as ProjectStatus,
      visibility: content.visibility as any,
      channelIds: content.channelIds,
      agentIds: content.agentIds,
      okrIds: content.okrIds,
      createdAt: dbRecord.createdAt,
    });
  }

  toDatabase(entity: ProjectEntity): ProjectDbRecord {
    return {
      id: entity.projectId,
      name: entity.name,
      description: entity.description ?? null,
      ownerId: entity.ownerId,
      status: entity.status,
      metadataPath: '',
      createdAt: entity.createdAt,
      updatedAt: new Date(),
    };
  }

  toStorage(entity: ProjectEntity): ProjectContent {
    return {
      displayName: entity.displayName,
      visibility: entity.visibility,
      channelIds: Array.from(entity.channelIds || []),
      agentIds: Array.from(entity.agentIds || []),
      okrIds: Array.from(entity.okrIds || []),
    };
  }

  getContentPath(dbRecord: ProjectDbRecord): string {
    return dbRecord.metadataPath;
  }

  // --- IProjectRepository ---

  async findById(projectId: string): Promise<ProjectEntity | null> {
    return this.findEntityById(projectId);
  }

  async findByOwner(ownerId: string): Promise<ProjectEntity[]> {
    const records = await this.prisma.project.findMany({
      where: { ownerId },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as ProjectDbRecord[]);
  }

  async findByStatus(status: ProjectStatus): Promise<ProjectEntity[]> {
    const records = await this.prisma.project.findMany({
      where: { status },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as ProjectDbRecord[]);
  }

  async findAll(): Promise<ProjectEntity[]> {
    const records = await this.prisma.project.findMany({
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as ProjectDbRecord[]);
  }

  async save(project: ProjectEntity, serverId: string): Promise<void> {
    await this.saveEntity(project, serverId);
  }

  async update(project: ProjectEntity, serverId: string): Promise<void> {
    await this.updateEntity(project, serverId);
  }

  async delete(projectId: string): Promise<void> {
    await this.deleteEntity(projectId);
  }

  async exists(projectId: string): Promise<boolean> {
    const count = await this.prisma.project.count({ where: { id: projectId } });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: ProjectDbRecord, contentPath: string): Promise<void> {
    await this.prisma.project.create({
      data: {
        id: dbRecord.id,
        name: dbRecord.name,
        description: dbRecord.description,
        ownerId: dbRecord.ownerId,
        status: dbRecord.status,
        metadataPath: contentPath,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: ProjectDbRecord, contentPath: string): Promise<void> {
    await this.prisma.project.update({
      where: { id: entityId },
      data: {
        name: dbRecord.name,
        description: dbRecord.description,
        status: dbRecord.status,
        metadataPath: contentPath,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.project.delete({ where: { id: entityId } });
  }

  protected async findInDatabase(entityId: string): Promise<ProjectDbRecord | null> {
    const record = await this.prisma.project.findUnique({ where: { id: entityId } });
    return record as unknown as ProjectDbRecord | null;
  }
}
