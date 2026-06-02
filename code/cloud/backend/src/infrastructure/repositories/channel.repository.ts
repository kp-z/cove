import { PrismaClient } from '../../../generated/client';
import { ChannelEntity } from '../../domain/models/channel/channel.entity';
import { IChannelRepository } from '../../application/interfaces/repositories/channel.repository.interface';
import { ILogger } from '../../application/interfaces/logger.interface';
import type { ChannelType } from '../../domain/models/channel/channel.types';

interface ChannelDbRecord {
  id: string;
  realmId: string;
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
  avatarUrl: string | null;
  avatarType: string;
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
      realmId: dbRecord.realmId,
      name: dbRecord.name,
      displayName: dbRecord.displayName,
      type: dbRecord.type as ChannelType,
      status: dbRecord.status as 'active' | 'archived',
      projectId: dbRecord.projectId ?? undefined,
      parentChannelId: dbRecord.parentChannelId ?? undefined,
      description: dbRecord.description ?? undefined,
      icon: dbRecord.icon ?? undefined,
      avatar: dbRecord.avatarUrl ? {
        url: dbRecord.avatarUrl,
        type: (dbRecord.avatarType as 'uploaded' | 'dicebear' | 'default') || 'dicebear',
      } : undefined,
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
      realmId: entity.realmId,
      name: entity.name,
      displayName: entity.displayName,
      type: entity.type,
      status: entity.status,
      projectId: entity.projectId ?? null,
      parentChannelId: entity.parentChannelId ?? null,
      description: entity.description ?? null,
      icon: entity.icon ?? null,
      avatarUrl: entity.avatar?.url ?? null,
      avatarType: entity.avatar?.type ?? 'dicebear',
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

  async findById(channelId: string, realmId: string): Promise<ChannelEntity | null> {
    try {
      const record = await this.prisma.channel.findFirst({
        where: {
          id: channelId,
          realmId,
        },
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

  async findByProject(projectId: string, realmId: string): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        where: {
          projectId,
          realmId,
        },
        orderBy: { name: 'asc' },
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error(`Failed to find channels by project ${projectId}`, error);
      throw error;
    }
  }

  async findByType(type: ChannelType, realmId: string): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        where: {
          type,
          realmId,
        },
        orderBy: { name: 'asc' },
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error(`Failed to find channels by type ${type}`, error);
      throw error;
    }
  }

  async findByMember(memberId: string, realmId: string): Promise<ChannelEntity[]> {
    try {
      this.logger.info('[DEBUG] Finding channels by member', { memberId, realmId });

      const records = await this.prisma.channel.findMany({
        where: {
          realmId,
          membersData: {
            contains: `"${memberId}"`,
          },
        },
        orderBy: { name: 'asc' },
      });

      this.logger.info('[DEBUG] Found channels by member', {
        memberId,
        channelCount: records.length,
        channels: records.map(r => ({
          id: r.id,
          name: r.name,
          membersData: r.membersData,
        })),
      });

      return records.map(r => this.toDomain(r as unknown as ChannelDbRecord));
    } catch (error: any) {
      this.logger.error(`Failed to find channels by member ${memberId}`, error);
      throw error;
    }
  }

  async findAgentDMChannel(agentId: string, realmId: string, userId?: string): Promise<ChannelEntity | null> {
    try {
      // 查找 type='dm' 且 agentPool 只包含该 agent 的 channel
      const records = await this.prisma.channel.findMany({
        where: {
          realmId,
          type: 'dm',
          agentPool: `["${agentId}"]`, // 精确匹配单个 agent 的 JSON 数组
        },
      });

      // 如果提供了 userId，进一步过滤匹配该用户的 channel
      if (userId && records.length > 0) {
        const matchingRecords = records.filter(record => {
          try {
            const membersData = JSON.parse(record.membersData || '[]');
            return membersData.some((m: any) => m.memberId === userId && m.memberType === 'human');
          } catch {
            return false;
          }
        });

        if (matchingRecords.length > 0) {
          if (matchingRecords.length > 1) {
            this.logger.warn(`Found ${matchingRecords.length} DM channels for agent ${agentId} and user ${userId}, expected 1`);
          }
          return this.toDomain(matchingRecords[0] as unknown as ChannelDbRecord);
        }

        return null;
      }

      // 如果没有提供 userId，返回第一个（向后兼容）
      if (records.length > 0) {
        if (records.length > 1) {
          this.logger.warn(`Found ${records.length} DM channels for agent ${agentId}, expected 1`);
        }
        return this.toDomain(records[0] as unknown as ChannelDbRecord);
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Failed to find agent DM channel for ${agentId}`, error);
      throw error;
    }
  }

  async findByRealmAndName(realmId: string, name: string): Promise<ChannelEntity | null> {
    try {
      const record = await this.prisma.channel.findUnique({
        where: {
          realmId_name: {
            realmId,
            name,
          },
        },
      });

      return record ? this.toDomain(record as unknown as ChannelDbRecord) : null;
    } catch (error: any) {
      this.logger.error(`Failed to find channel by realm ${realmId} and name ${name}`, error);
      throw error;
    }
  }

  async findAll(realmId: string): Promise<ChannelEntity[]> {
    try {
      const records = await this.prisma.channel.findMany({
        where: { realmId },
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

      this.logger.info('[DEBUG] Saving channel to database', {
        channelId: channel.channelId,
        realmId,
        membersData: dbRecord.membersData,
        memberCount: channel.members.length,
      });

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

  async delete(channelId: string, realmId: string): Promise<void> {
    try {
      await this.prisma.channel.delete({
        where: { id: channelId, realmId },
      });

      this.logger.debug(`Deleted channel ${channelId}`, { channelId, realmId });
    } catch (error: any) {
      this.logger.error(`Failed to delete channel ${channelId}`, error);
      throw error;
    }
  }

  async exists(channelId: string, realmId: string): Promise<boolean> {
    try {
      const count = await this.prisma.channel.count({
        where: {
          id: channelId,
          realmId,
        },
      });

      return count > 0;
    } catch (error: any) {
      this.logger.error(`Failed to check if channel ${channelId} exists`, error);
      throw error;
    }
  }
}
