import { HybridRepository } from './hybrid-repository.base';
import { ChannelEntity } from '../../domain/models/channel/channel.entity';
import { IChannelRepository } from '../../application/interfaces/repositories/channel.repository.interface';
import type { ChannelType } from '../../domain/models/channel/channel.types';

interface ChannelDbRecord {
  id: string;
  name: string;
  displayName: string;
  type: string;
  status: string;
  projectId: string | null;
  parentChannelId: string | null;
  metadataPath: string;
  messageCount: number;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChannelContent {
  description?: string;
  icon?: string;
  members: any[];
  agentPool: string[];
  taskPool: string[];
  conversationPool: any[];
  communicationRules: any;
  workspace: any;
  meta: any;
}

export class HybridChannelRepository
  extends HybridRepository<ChannelEntity, ChannelDbRecord, ChannelContent>
  implements IChannelRepository
{
  getEntityType(): string { return 'channels'; }
  getEntityId(entity: ChannelEntity): string { return entity.channelId; }

  toDomain(dbRecord: ChannelDbRecord, content: ChannelContent): ChannelEntity {
    return ChannelEntity.create({
      channelId: dbRecord.id,
      name: dbRecord.name,
      displayName: dbRecord.displayName,
      type: dbRecord.type as ChannelType,
      status: dbRecord.status as 'active' | 'archived',
      projectId: dbRecord.projectId ?? undefined,
      parentChannelId: dbRecord.parentChannelId ?? undefined,
      description: content.description,
      icon: content.icon,
      members: content.members.map((m: any) => ({
        memberId: m.memberId,
        memberType: m.memberType,
        role: m.role,
        joinedAt: new Date(m.joinedAt),
      })),
      agentPool: content.agentPool ?? [],
      taskPool: content.taskPool ?? [],
      conversationPool: content.conversationPool ?? [],
      communicationRules: content.communicationRules,
      workspace: content.workspace,
      meta: {
        ...content.meta,
        messageCount: dbRecord.messageCount,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  toDatabase(entity: ChannelEntity): ChannelDbRecord {
    return {
      id: entity.channelId,
      name: entity.name,
      displayName: entity.displayName,
      type: entity.type,
      status: entity.status,
      projectId: entity.projectId ?? null,
      parentChannelId: entity.parentChannelId ?? null,
      metadataPath: '',
      messageCount: entity.meta.messageCount,
      memberCount: entity.members.length,
      createdAt: entity.meta.createdAt,
      updatedAt: entity.meta.updatedAt,
    };
  }

  toStorage(entity: ChannelEntity): ChannelContent {
    return {
      description: entity.description,
      icon: entity.icon,
      members: entity.members.map(m => ({
        memberId: m.memberId,
        memberType: m.memberType,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      agentPool: [...entity.agentPool],
      taskPool: [...entity.taskPool],
      conversationPool: [...entity.conversationPool],
      communicationRules: entity.communicationRules,
      workspace: entity.workspace,
      meta: {
        tags: entity.meta.tags,
        category: entity.meta.category,
        createdBy: entity.meta.createdBy,
      },
    };
  }

  getContentPath(dbRecord: ChannelDbRecord): string {
    return dbRecord.metadataPath;
  }

  // --- IChannelRepository ---

  async findById(channelId: string): Promise<ChannelEntity | null> {
    return this.findEntityById(channelId);
  }

  async findByProject(projectId: string): Promise<ChannelEntity[]> {
    const records = await this.prisma.channel.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as ChannelDbRecord[]);
  }

  async findByType(type: ChannelType): Promise<ChannelEntity[]> {
    const records = await this.prisma.channel.findMany({
      where: { type },
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as ChannelDbRecord[]);
  }

  async findByMember(memberId: string): Promise<ChannelEntity[]> {
    const all = await this.findAll();
    return all.filter(ch => ch.hasMember(memberId));
  }

  async findAll(): Promise<ChannelEntity[]> {
    const records = await this.prisma.channel.findMany({
      orderBy: { name: 'asc' },
    });
    return this.loadEntities(records as unknown as ChannelDbRecord[]);
  }

  async save(channel: ChannelEntity): Promise<void> {
    await this.saveEntity(channel);
  }

  async update(channel: ChannelEntity): Promise<void> {
    await this.updateEntity(channel);
  }

  async delete(channelId: string): Promise<void> {
    await this.deleteEntity(channelId);
  }

  async exists(channelId: string): Promise<boolean> {
    const count = await this.prisma.channel.count({ where: { id: channelId } });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: ChannelDbRecord, contentPath: string): Promise<void> {
    await this.prisma.channel.create({
      data: {
        id: dbRecord.id,
        name: dbRecord.name,
        displayName: dbRecord.displayName,
        type: dbRecord.type,
        status: dbRecord.status,
        projectId: dbRecord.projectId,
        parentChannelId: dbRecord.parentChannelId,
        metadataPath: contentPath,
        messageCount: dbRecord.messageCount,
        memberCount: dbRecord.memberCount,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: ChannelDbRecord, contentPath: string): Promise<void> {
    await this.prisma.channel.update({
      where: { id: entityId },
      data: {
        name: dbRecord.name,
        displayName: dbRecord.displayName,
        type: dbRecord.type,
        status: dbRecord.status,
        projectId: dbRecord.projectId,
        metadataPath: contentPath,
        messageCount: dbRecord.messageCount,
        memberCount: dbRecord.memberCount,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.channel.delete({ where: { id: entityId } });
  }

  protected async findInDatabase(entityId: string): Promise<ChannelDbRecord | null> {
    const record = await this.prisma.channel.findUnique({ where: { id: entityId } });
    return record as unknown as ChannelDbRecord | null;
  }
}
