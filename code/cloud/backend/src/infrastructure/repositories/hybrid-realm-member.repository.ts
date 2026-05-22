/**
 * HybridRealmMemberRepository - ServerMember 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, realmId, userId, role, status, joinedAt）
 * - 文件系统：存储完整的 RealmMember 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { RealmMemberEntity, RealmRole, MemberStatus, RealmPermission } from '../../domain/models/realm-member/realm-member.entity';
import { IRealmMemberRepository } from '../../application/interfaces/repositories/realm-member.repository.interface';

interface RealmMemberDbRecord {
  id: string;
  realmId: string;
  userId: string;
  role: string;
  customPermissions: string | null;
  status: string;
  joinedAt: Date;
  updatedAt: Date;
  meta: string | null;
}

interface RealmMemberContent {
  customPermissions?: RealmPermission[];
  meta?: Record<string, unknown>;
}

export class HybridRealmMemberRepository
  extends HybridRepository<RealmMemberEntity, RealmMemberDbRecord, RealmMemberContent>
  implements IRealmMemberRepository
{
  constructor(
    prisma: any,
    storage: any,
    logger: any,
    private readonly realmId: string
  ) {
    super(prisma, storage, logger);
  }

  getEntityType(): string {
    return `realm-members/${this.realmId}`;
  }

  getEntityId(entity: RealmMemberEntity): string {
    return entity.memberId;
  }

  toDomain(dbRecord: RealmMemberDbRecord, content: RealmMemberContent): RealmMemberEntity {
    return RealmMemberEntity.create({
      member_id: dbRecord.id,
      realm_id: dbRecord.realmId,
      user_id: dbRecord.userId,
      role: dbRecord.role as RealmRole,
      custom_permissions: content.customPermissions,
      status: dbRecord.status as MemberStatus,
      joined_at: dbRecord.joinedAt,
      updated_at: dbRecord.updatedAt,
      meta: content.meta || {},
    });
  }

  toDatabase(entity: RealmMemberEntity): RealmMemberDbRecord {
    return {
      id: entity.memberId,
      realmId: entity.realmId,
      userId: entity.userId,
      role: entity.role,
      customPermissions: entity.customPermissions ? JSON.stringify(entity.customPermissions) : null,
      status: entity.status,
      joinedAt: entity.joinedAt,
      updatedAt: entity.updatedAt,
      meta: entity.meta ? JSON.stringify(entity.meta) : null,
    };
  }

  toStorage(entity: RealmMemberEntity): RealmMemberContent {
    return {
      customPermissions: entity.customPermissions,
      meta: entity.meta,
    };
  }

  getContentPath(dbRecord: RealmMemberDbRecord): string {
    return `${this.getEntityType()}/${dbRecord.id}.json`;
  }

  // ============================================
  // 抽象方法实现 - 数据库操作
  // ============================================

  protected async saveToDatabase(
    dbRecord: RealmMemberDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.realmMember.create({
      data: {
        ...dbRecord,
        meta: contentPath,
      },
    });
  }

  protected async updateInDatabase(
    entityId: string,
    dbRecord: RealmMemberDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.realmMember.update({
      where: { id: entityId },
      data: {
        ...dbRecord,
        meta: contentPath,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.realmMember.delete({
      where: { id: entityId },
    });
  }

  protected async findInDatabase(entityId: string): Promise<RealmMemberDbRecord | null> {
    return await this.prisma.realmMember.findUnique({
      where: { id: entityId },
    });
  }

  // ============================================
  // IRealmMemberRepository 接口实现
  // ============================================

  async findById(memberId: string): Promise<RealmMemberEntity | null> {
    return await this.findEntityById(memberId);
  }

  async findByServer(realmId: string): Promise<RealmMemberEntity[]> {
    const records = await this.prisma.realmMember.findMany({
      where: { realmId },
      orderBy: { joinedAt: 'asc' },
    });
    return await this.loadEntities(records);
  }

  async findByUser(userId: string): Promise<RealmMemberEntity[]> {
    const records = await this.prisma.realmMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
    });
    return await this.loadEntities(records);
  }

  async findByServerAndUser(realmId: string, userId: string): Promise<RealmMemberEntity | null> {
    const record = await this.prisma.realmMember.findUnique({
      where: {
        realmId_userId: {
          realmId,
          userId,
        },
      },
    });
    if (!record) return null;
    const contentPath = this.getContentPath(record);
    const contentWithServerId = await this.storage.loadJson(contentPath);
    const { _realm_id, ...content } = contentWithServerId;
    return this.toDomain(record, content as RealmMemberContent);
  }

  async findByRole(realmId: string, role: RealmRole): Promise<RealmMemberEntity[]> {
    const records = await this.prisma.realmMember.findMany({
      where: { realmId, role },
      orderBy: { joinedAt: 'asc' },
    });
    return await this.loadEntities(records);
  }

  async findByStatus(realmId: string, status: MemberStatus): Promise<RealmMemberEntity[]> {
    const records = await this.prisma.realmMember.findMany({
      where: { realmId, status },
      orderBy: { joinedAt: 'asc' },
    });
    return await this.loadEntities(records);
  }

  async save(member: RealmMemberEntity): Promise<void> {
    await this.saveEntity(member, this.realmId);
  }

  async update(member: RealmMemberEntity): Promise<void> {
    await this.updateEntity(member, this.realmId);
  }

  async delete(memberId: string): Promise<void> {
    await this.deleteEntity(memberId);
  }

  async exists(memberId: string): Promise<boolean> {
    const count = await this.prisma.realmMember.count({
      where: { id: memberId },
    });
    return count > 0;
  }

  async existsByServerAndUser(realmId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.realmMember.count({
      where: { realmId, userId },
    });
    return count > 0;
  }
}
