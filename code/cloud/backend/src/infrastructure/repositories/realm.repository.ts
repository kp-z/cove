/**
 * RealmRepository - Realm 纯数据库持久化实现
 *
 * 存储策略：
 * - 所有数据存储在数据库中
 * - settings, limits, meta 使用 JSON 字段存储
 */

import { PrismaClient } from '@prisma/client';
import { getRealmContext } from '../../application/context/realm-context-store';
import { RealmEntity, RealmStatus, RealmVisibility, RealmSettings, RealmLimits } from '../../domain/models/realm/realm.entity';
import { getRealmContext } from '../../application/context/realm-context-store';
import { IRealmRepository } from '../../application/interfaces/repositories/realm.repository.interface';
import { getRealmContext } from '../../application/context/realm-context-store';
import { ILogger } from '../../application/interfaces/logger.interface';
import { getRealmContext } from '../../application/context/realm-context-store';
import { Avatar } from '../../domain/types/avatar.types';
import { getRealmContext } from '../../application/context/realm-context-store';

interface RealmDbRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  ownerId: string;
  status: string;
  visibility: string;
  settings: string;
  limits: string;
  meta: string | null;
  logoUrl: string | null;
  logoType: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RealmRepository implements IRealmRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger
  ) {}

  private toDomain(dbRecord: RealmDbRecord): RealmEntity {
    const settings = JSON.parse(dbRecord.settings) as RealmSettings;
    const limits = JSON.parse(dbRecord.limits) as RealmLimits;
    const meta = dbRecord.meta ? JSON.parse(dbRecord.meta) : {};

    const logo: Avatar | undefined = dbRecord.logoUrl ? {
      url: dbRecord.logoUrl,
      type: dbRecord.logoType as 'uploaded' | 'dicebear' | 'default',
    } : undefined;

    return RealmEntity.create({
      realm_id: dbRecord.id,
      name: dbRecord.name,
      display_name: dbRecord.displayName,
      description: dbRecord.description || undefined,
      owner_id: dbRecord.ownerId,
      status: dbRecord.status as RealmStatus,
      visibility: dbRecord.visibility as RealmVisibility,
      settings,
      limits,
      meta,
      logo,
      created_at: dbRecord.createdAt,
      updated_at: dbRecord.updatedAt,
    });
  }

  private toDatabase(entity: RealmEntity): Omit<RealmDbRecord, 'createdAt' | 'updatedAt'> {
    return {
      id: entity.realm_id,
      name: entity.name,
      displayName: entity.display_name,
      description: entity.description || null,
      ownerId: entity.owner_id,
      status: entity.status,
      visibility: entity.visibility,
      settings: JSON.stringify(entity.settings),
      limits: JSON.stringify(entity.limits),
      meta: JSON.stringify(entity.meta),
      logoUrl: entity.logo?.url ?? null,
      logoType: entity.logo?.type ?? 'default',
    };
  }

  // --- IRealmRepository ---

  async find(filters?: { id?: string; ownerId?: string; status?: RealmStatus }): Promise<RealmEntity[]> {
    try {
      // 如果查询单个 ID，直接返回单个结果（或空数组）
      if (filters?.id) {
        const record = await this.prisma.realm.findUnique({
          where: { id: filters.id },
        });
        if (!record) return [];
        return [this.toDomain(record as unknown as RealmDbRecord)];
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
      return records.map(r => this.toDomain(r as unknown as RealmDbRecord));
    } catch (error: any) {
      this.logger.error('Failed to find realms', error);
      throw error;
    }
  }

  async findByName(name: string): Promise<RealmEntity | null> {
    try {
      const record = await this.prisma.realm.findUnique({
        where: { name },
      });
      if (!record) return null;
      return this.toDomain(record as unknown as RealmDbRecord);
    } catch (error: any) {
      this.logger.error(`Failed to find realm by name ${name}`, error);
      throw error;
    }
  }

  async save(realm: RealmEntity, _realmId: string): Promise<void> {
    try {
      const dbRecord = this.toDatabase(realm);

      await this.prisma.realm.create({
        data: {
          ...dbRecord,
          createdAt: realm.created_at,
          updatedAt: realm.updated_at,
        },
      });

      this.logger.debug(`Saved realm ${realm.realm_id}`, { realmId: realm.realm_id });
    } catch (error: any) {
      this.logger.error(`Failed to save realm ${realm.realm_id}`, error);
      throw error;
    }
  }

  async update(realm: RealmEntity, _realmId: string): Promise<void> {
    try {
      const dbRecord = this.toDatabase(realm);

      await this.prisma.realm.update({
        where: { id: realm.realm_id },
        data: {
          ...dbRecord,
          updatedAt: realm.updated_at,
        },
      });

      this.logger.debug(`Updated realm ${realm.realm_id}`, { realmId: realm.realm_id });
    } catch (error: any) {
      this.logger.error(`Failed to update realm ${realm.realm_id}`, error);
      throw error;
    }
  }

  async delete(realmId: string): Promise<void> {
    try {
      await this.prisma.realm.delete({
        where: { id: realmId },
      });

      this.logger.debug(`Deleted realm ${realmId}`, { realmId });
    } catch (error: any) {
      this.logger.error(`Failed to delete realm ${realmId}`, error);
      throw error;
    }
  }

  async exists(realmId: string): Promise<boolean> {
    try {
      const count = await this.prisma.realm.count({
        where: { id: realmId },
      });

      return count > 0;
    } catch (error: any) {
      this.logger.error(`Failed to check if realm ${realmId} exists`, error);
      throw error;
    }
  }
}
