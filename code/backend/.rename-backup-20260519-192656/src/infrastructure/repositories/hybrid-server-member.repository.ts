/**
 * HybridServerMemberRepository - ServerMember 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, serverId, userId, role, status, joinedAt）
 * - 文件系统：存储完整的 ServerMember 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { ServerMemberEntity, ServerRole, MemberStatus, ServerPermission } from '../../domain/models/server-member/server-member.entity';
import { IServerMemberRepository } from '../../application/interfaces/repositories/server-member.repository.interface';

interface ServerMemberDbRecord {
  id: string;
  serverId: string;
  userId: string;
  role: string;
  customPermissions: string | null;
  status: string;
  joinedAt: Date;
  updatedAt: Date;
  meta: string | null;
}

interface ServerMemberContent {
  customPermissions?: ServerPermission[];
  meta?: Record<string, unknown>;
}

export class HybridServerMemberRepository
  extends HybridRepository<ServerMemberEntity, ServerMemberDbRecord, ServerMemberContent>
  implements IServerMemberRepository
{
  constructor(
    prisma: any,
    logger: any,
    private readonly serverId: string
  ) {
    super(prisma, logger);
  }

  getEntityType(): string {
    return `server-members/${this.serverId}`;
  }

  getEntityId(entity: ServerMemberEntity): string {
    return entity.member_id;
  }

  toDomain(dbRecord: ServerMemberDbRecord, content: ServerMemberContent): ServerMemberEntity {
    return ServerMemberEntity.create({
      member_id: dbRecord.id,
      server_id: dbRecord.serverId,
      user_id: dbRecord.userId,
      role: dbRecord.role as ServerRole,
      custom_permissions: content.customPermissions,
      status: dbRecord.status as MemberStatus,
      joined_at: dbRecord.joinedAt,
      updated_at: dbRecord.updatedAt,
      meta: content.meta || {},
    });
  }

  toDatabase(entity: ServerMemberEntity): ServerMemberDbRecord {
    return {
      id: entity.member_id,
      serverId: entity.server_id,
      userId: entity.user_id,
      role: entity.role,
      customPermissions: entity.custom_permissions ? JSON.stringify(entity.custom_permissions) : null,
      status: entity.status,
      joinedAt: entity.joined_at,
      updatedAt: entity.updated_at,
      meta: entity.meta ? JSON.stringify(entity.meta) : null,
    };
  }

  toStorage(entity: ServerMemberEntity): ServerMemberContent {
    return {
      customPermissions: entity.custom_permissions,
      meta: entity.meta,
    };
  }

  getContentPath(dbRecord: ServerMemberDbRecord): string {
    return `${this.getEntityType()}/${dbRecord.id}.json`;
  }

  // --- IServerMemberRepository ---

  async findById(memberId: string): Promise<ServerMemberEntity | null> {
    const record = await this.prisma.serverMember.findUnique({
      where: { id: memberId },
    });
    if (!record) return null;
    const contentPath = this.getContentPath(record);
    const content = await this.storage.loadJson(contentPath);
    return this.toDomain(record, content);
  }

  async findByServer(serverId: string): Promise<ServerMemberEntity[]> {
    const records = await this.prisma.serverMember.findMany({
      where: { serverId },
      orderBy: { joinedAt: 'asc' },
    });
    return Promise.all(
      records.map(async (record) => {
        const contentPath = this.getContentPath(record);
        const content = await this.storage.loadJson(contentPath);
        return this.toDomain(record, content);
      })
    );
  }

  async findByUser(userId: string): Promise<ServerMemberEntity[]> {
    const records = await this.prisma.serverMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
    });
    return Promise.all(
      records.map(async (record) => {
        const contentPath = this.getContentPath(record);
        const content = await this.storage.loadJson(contentPath);
        return this.toDomain(record, content);
      })
    );
  }

  async findByServerAndUser(serverId: string, userId: string): Promise<ServerMemberEntity | null> {
    const record = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });
    if (!record) return null;
    const contentPath = this.getContentPath(record);
    const content = await this.storage.loadJson(contentPath);
    return this.toDomain(record, content);
  }

  async findByRole(serverId: string, role: ServerRole): Promise<ServerMemberEntity[]> {
    const records = await this.prisma.serverMember.findMany({
      where: { serverId, role },
      orderBy: { joinedAt: 'asc' },
    });
    return Promise.all(
      records.map(async (record) => {
        const contentPath = this.getContentPath(record);
        const content = await this.storage.loadJson(contentPath);
        return this.toDomain(record, content);
      })
    );
  }

  async findByStatus(serverId: string, status: MemberStatus): Promise<ServerMemberEntity[]> {
    const records = await this.prisma.serverMember.findMany({
      where: { serverId, status },
      orderBy: { joinedAt: 'asc' },
    });
    return Promise.all(
      records.map(async (record) => {
        const contentPath = this.getContentPath(record);
        const content = await this.storage.loadJson(contentPath);
        return this.toDomain(record, content);
      })
    );
  }

  async save(member: ServerMemberEntity): Promise<void> {
    const dbRecord = this.toDatabase(member);
    const content = this.toStorage(member);
    const contentPath = this.getContentPath(dbRecord);

    await this.prisma.serverMember.create({
      data: dbRecord,
    });

    await this.storage.saveJson(contentPath, content);
  }

  async update(member: ServerMemberEntity): Promise<void> {
    const dbRecord = this.toDatabase(member);
    const content = this.toStorage(member);
    const contentPath = this.getContentPath(dbRecord);

    await this.prisma.serverMember.update({
      where: { id: member.member_id },
      data: dbRecord,
    });

    await this.storage.saveJson(contentPath, content);
  }

  async delete(memberId: string): Promise<void> {
    const record = await this.prisma.serverMember.findUnique({
      where: { id: memberId },
    });
    if (!record) return;

    const contentPath = this.getContentPath(record);
    await this.prisma.serverMember.delete({
      where: { id: memberId },
    });
    await this.storage.delete(contentPath);
  }

  async exists(memberId: string): Promise<boolean> {
    const count = await this.prisma.serverMember.count({
      where: { id: memberId },
    });
    return count > 0;
  }

  async existsByServerAndUser(serverId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.serverMember.count({
      where: { serverId, userId },
    });
    return count > 0;
  }
}
