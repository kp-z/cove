import { PrismaClient } from '@prisma/client';
import { ChannelEntity } from '../../domain/models/channel/channel.entity';
import { IChannelRepository } from '../../application/interfaces/repositories/channel.repository.interface';
import { ILogger } from '../../application/interfaces/logger.interface';
import type { ChannelType } from '../../domain/models/channel/channel.types';

interface ChannelDbRecord {
  id: string;
  name: string;
  displayName: string;
  type: string;
  status: string;
  projectId: string | null;
  parentChannelId: string | null;
  description: string | null;
  icon: string | null;
  membersData: string;
  agentPool: string;
  taskPool: string;
  conversationPool: string;
  communicationRules: string;
  workspace: string;
  metaTags: string;
  metaCategory: string | null;
  createdById: string;
  createdByType: string;
  messageCount: number;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ChannelRepository implements IChannelRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  private toDomain(dbRecord: ChannelDbRecord): ChannelEntity {
    const membersData = JSON.parse(dbRecord.membersData);
    const agentPool = JSON.parse(dbRecord.agentPool);
    const taskPool = JSON.parse(dbRecord.taskPool);
    const conversationPool = JSON.parse(dbRecord.conversationPool);
    const communicationRules = JSON.parse(dbRecord.communicationRules);
    const workspace = JSON.parse(dbRecord.workspace);
    const metaTags = JSON.parse(dbRecord.metaTags);

    return ChannelEntity.create({
      channelId: dbRecord.id,
      name: dbRecord.name,
      displayName: dbRecord.displayName,
      type: dbRecord.type as ChannelType,
      status: dbRecord.status as 'active' | 'archived',
      projectId: dbRecord.projectId ?? undefined,
      parentChannelId: dbRecord.parentChannelId ?? undefined,
      description: dbRecord.description ?? undefined,
      icon: dbRecord.icon ?? undefined,
      members: membersData.map((m: any) => ({
        memberId: m.memberId,
        memberType: m.memberType,
        role: m.role,
        joinedAt: new Date(m.joinedAt),
      })),
      agentPool,
      taskPool,
      conversationPool: conversationPool.map((c: any) => ({
        conversationId: c.conversationId,
        agentId: c.agentId,
        status: c.status,
        messageCount: c.messageCount,
      })),
      communicationRules: {
        allowMentions: communicationRules.allowMentions ?? true,
        allowThreads: communicationRules.allowThreads ?? true,
        allowAttachments: communicationRules.allowAttachments ?? true,
        maxMessageLength: communicationRules.maxMessageLength ?? 10000,
        maxMembers: communicationRules.maxMembers,
        rateLimit: communicationRules.rateLimit,
      },
      workspace: {
        root: workspace.root ?? '',
        sharedFiles: workspace.sharedFiles ?? [],
        attachments: workspace.attachments ?? [],
      },
      meta: {
        tags: metaTags.length > 0 ? metaTags : undefined,
        category: dbRecord.metaCategory ?? undefined,
        messageCount: dbRecord.messageCount,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
        createdBy: {
          id: dbRecord.createdById,
          type: dbRecord.createdByType as any,
        },
      },
    });
  }

  private toDatabase(entity: ChannelEntity): Omit<ChannelDbRecord, 'createdAt' | 'updatedAt'> {
    return {
      id: entity.channelId,
      name: entity.name,
      displayName: entity.displayName,
      type: entity.type,
      status: entity.status,
      projectId: entity.projectId ?? null,
      parentChannelId: entity.parentChannelId ?? null,
      description: entity.description ?? null,
      icon: entity.icon ?? null,
      membersData: JSON.stringify(entity.members.map(m => ({
        memberId: m.memberId,
        memberType: m.memberType,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      }))),
      agentPool: JSON.stringify(entity.agentPool),
      taskPool: JSON.stringify(entity.taskPool),
      conversationPool: JSON.stringify(entity.conversationPool.map(c => ({
        conversationId: c.conversationId,
        agentId: c.agentId,
        status: c.status,
        messageCount: c.messageCount,
      }))),
      communicationRules: JSON.stringify(entity.communicationRules),
      workspace: JSON.stringify(entity.workspace),
      metaTags: JSON.stringify(entity.meta.tags ?? []),
      metaCategory: entity.meta.category ?? null,
      createdById: entity.meta.createdBy.id,
      createdByType: entity.meta.createdBy.type,
      messageCount: entity.meta.messageCount,
      memberCount: entity.members.length,
    };
  }

  async findById(channelId: string): Promise<ChannelEntity | null> {
    try {
      const record = await this.prisma.channel.findUnique({
        where: { id: channelId },
      });

      if (!record) {
        return null;
      }

      return this.toDomain(record as unknown as ChannelDbRecord);
    } catch (error: any) {
      this.logger.error(`Failed to find channel ${channelId}`, error);
      throw error;
    }
  }

  async findByProject(projectId: string): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        where: { projectId },
        orderBy: { name: 'asc' },
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error(`Failed to find channels by project ${projectId}`, error);
      throw error;
    }
  }

  async findByType(type: ChannelType): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        where: { type },
        orderBy: { name: 'asc' },
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error(`Failed to find channels by type ${type}`, error);
      throw error;
    }
  }

  async findByMember(memberId: string): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        where: {
          membersData: {
            contains: `"${memberId}"`,
          },
        },
        orderBy: { name: 'asc' },
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error(`Failed to find channels by member ${memberId}`, error);
      throw error;
    }
  }

  async findAll(): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        orderBy: { name: 'asc' },
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error('Failed to find all channels', error);
      throw error;
    }
  }

  async save(channel: ChannelEntity, realmId: string): Promise<void> {
    try {
      const dbRecord = this.toDatabase(channel);

      await this.prisma.channel.create({
        data: {
          ...dbRecord,
          createdAt: channel.meta.createdAt,
          updatedAt: channel.meta.updatedAt,
        },
      });

      this.logger.debug(`Saved channel ${channel.channelId}`, { channelId: channel.channelId, realmId });
    } catch (error: any) {
      this.logger.error(`Failed to save channel ${channel.channelId}`, error);
      throw error;
    }
  }

  async update(channel: ChannelEntity, realmId: string): Promise<void> {
    try {
      const dbRecord = this.toDatabase(channel);

      await this.prisma.channel.update({
        where: { id: channel.channelId },
        data: {
          ...dbRecord,
          updatedAt: channel.meta.updatedAt,
        },
      });

      this.logger.debug(`Updated channel ${channel.channelId}`, { channelId: channel.channelId, realmId });
    } catch (error: any) {
      this.logger.error(`Failed to update channel ${channel.channelId}`, error);
      throw error;
    }
  }

  async delete(channelId: string): Promise<void> {
    try {
      await this.prisma.channel.delete({
        where: { id: channelId },
      });

      this.logger.debug(`Deleted channel ${channelId}`, { channelId });
    } catch (error: any) {
      this.logger.error(`Failed to delete channel ${channelId}`, error);
      throw error;
    }
  }

  async exists(channelId: string): Promise<boolean> {
    try {
      const count = await this.prisma.channel.count({
        where: { id: channelId },
      });

      return count > 0;
    } catch (error: any) {
      this.logger.error(`Failed to check if channel ${channelId} exists`, error);
      throw error;
    }
  }
}
