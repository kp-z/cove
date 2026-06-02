/**
 * HybridRepository 基类
 *
 * 混合持久化架构的抽象基类：
 * - 数据库存储索引和元数据（快速查询）
 * - 文件系统存储实际内容（灵活扩展）
 */

import { PrismaClient } from '../../../generated/client';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';

export abstract class HybridRepository<TEntity, TDbRecord = any, TContent = any> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly storage: StorageService,
    protected readonly logger: ILogger
  ) {}

  // ============================================
  // 抽象方法 - 子类必须实现
  // ============================================

  /**
   * 获取实体类型（用于文件存储路径）
   */
  abstract getEntityType(): string;

  /**
   * 将数据库记录和文件内容转换为领域实体
   */
  abstract toDomain(dbRecord: TDbRecord, content: TContent): TEntity;

  /**
   * 将领域实体转换为数据库记录
   */
  abstract toDatabase(entity: TEntity): TDbRecord;

  /**
   * 将领域实体转换为文件存储内容
   */
  abstract toStorage(entity: TEntity): TContent;

  /**
   * 从实体获取 ID
   */
  abstract getEntityId(entity: TEntity): string;

  // ============================================
  // 通用方法 - 子类可以直接使用
  // ============================================

  /**
   * 保存实体（数据库 + 文件）
   */
  protected async saveEntity(entity: TEntity, realmId: string): Promise<void> {
    const entityId = this.getEntityId(entity);
    const entityType = this.getEntityType();

    try {
      // 1. 保存内容到文件（添加 _realm_id）
      const content = this.toStorage(entity);
      const contentWithServerId = {
        ...content,
        _realm_id: realmId,
      };
      const contentPath = await this.storage.saveJsonAtomic(
        entityType,
        entityId,
        contentWithServerId
      );

      // 2. 保存索引到数据库
      const dbRecord = this.toDatabase(entity);
      await this.saveToDatabase(dbRecord, contentPath);

      this.logger.debug(`Saved ${entityType} ${entityId}`, { entityId, realmId });
    } catch (error: any) {
      this.logger.error(`Failed to save ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 更新实体（数据库 + 文件）
   */
  protected async updateEntity(entity: TEntity, realmId: string): Promise<void> {
    const entityId = this.getEntityId(entity);
    const entityType = this.getEntityType();

    try {
      // 1. 更新文件内容（添加 _realm_id）
      const content = this.toStorage(entity);
      const contentWithServerId = {
        ...content,
        _realm_id: realmId,
      };
      const contentPath = await this.storage.saveJsonAtomic(
        entityType,
        entityId,
        contentWithServerId
      );

      // 2. 更新数据库索引
      const dbRecord = this.toDatabase(entity);
      await this.updateInDatabase(entityId, dbRecord, contentPath);

      this.logger.debug(`Updated ${entityType} ${entityId}`, { entityId, realmId });
    } catch (error: any) {
      this.logger.error(`Failed to update ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 删除实体（数据库 + 文件）
   */
  protected async deleteEntity(entityId: string, realmId: string): Promise<void> {
    const entityType = this.getEntityType();

    try {
      // 1. 从数据库删除
      await this.deleteFromDatabase(entityId, realmId);

      // 2. 删除文件（可选，也可以保留用于审计）
      const relativePath = `storage/${entityType}/${entityId}.json`;
      await this.storage.deleteFile(relativePath);

      this.logger.debug(`Deleted ${entityType} ${entityId}`, { entityId });
    } catch (error: any) {
      this.logger.error(`Failed to delete ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 根据 ID 查找实体
   */
  protected async findEntityById(entityId: string, realmId: string): Promise<TEntity | null> {
    const entityType = this.getEntityType();
    const startTime = Date.now();

    try {
      // 1. 从数据库查询索引
      const dbRecord = await this.findInDatabase(entityId, realmId);

      if (!dbRecord) {
        return null;
      }

      // 2. 从文件加载内容
      const contentPath = this.getContentPath(dbRecord);
      const contentWithServerId = await this.storage.loadJson(contentPath);

      // 3. 移除 _realm_id（Entity 层不需要）
      const { _realm_id, ...content } = contentWithServerId;

      // 4. 组装领域实体
      const entity = this.toDomain(dbRecord, content as TContent);

      // 5. 性能监控
      const duration = Date.now() - startTime;
      if (duration > 50) {
        this.logger.warn(`Slow query: findEntityById(${entityId}) took ${duration}ms`, {
          entityType,
          entityId,
          duration,
        });
      }

      return entity;
    } catch (error: any) {
      this.logger.error(`Failed to find ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 批量加载实体
   */
  protected async loadEntities(dbRecords: TDbRecord[]): Promise<TEntity[]> {
    const startTime = Date.now();
    const entityType = this.getEntityType();

    try {
      // 并行加载所有内容文件
      const entityPromises = dbRecords.map(async (record) => {
        try {
          const contentPath = this.getContentPath(record);
          const contentWithServerId = await this.storage.loadJson(contentPath);

          // 移除 _realm_id（Entity 层不需要）
          const { _realm_id, ...content } = contentWithServerId;

          return this.toDomain(record, content as TContent);
        } catch (error: any) {
          // If content file doesn't exist, skip this entity
          if (error.code === 'ENOENT') {
            this.logger.warn(`Content file not found for ${entityType}, skipping`, {
              entityId: this.getEntityId(record as any),
              contentPath: this.getContentPath(record),
            });
            return null;
          }
          throw error;
        }
      });

      const results = await Promise.all(entityPromises);
      // Filter out null values (entities with missing content files)
      const entities = results.filter((e): e is Awaited<TEntity> => e !== null) as TEntity[];

      // 性能监控
      const duration = Date.now() - startTime;
      if (duration > 100) {
        this.logger.warn(`Slow batch query: loadEntities(${dbRecords.length} records) took ${duration}ms`, {
          entityType,
          count: dbRecords.length,
          duration,
          avgPerRecord: Math.round(duration / dbRecords.length),
        });
      }

      return entities;
    } catch (error: any) {
      this.logger.error(`Failed to load ${entityType} entities`, error);
      throw error;
    }
  }

  // ============================================
  // 验证和修复钩子（子类可覆盖）
  // ============================================

  /**
   * 验证实体一致性（数据库 + 文件系统）
   * 子类可覆盖以添加特定验证逻辑
   */
  protected async validateEntityConsistency(
    entityId: string,
    realmId: string
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    const entityType = this.getEntityType();

    try {
      // 1. 检查数据库记录
      const dbRecord = await this.findInDatabase(entityId, realmId);
      if (!dbRecord) {
        issues.push('MISSING_DB_RECORD');
        return { valid: false, issues };
      }

      // 2. 检查内容文件
      const contentPath = this.getContentPath(dbRecord);
      try {
        await this.storage.loadJson(contentPath);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          issues.push('MISSING_CONTENT_FILE');
        } else {
          issues.push(`INVALID_CONTENT_FILE: ${error.message}`);
        }
      }

      return { valid: issues.length === 0, issues };
    } catch (error: any) {
      this.logger.error(`Failed to validate ${entityType} ${entityId}`, error);
      issues.push(`VALIDATION_ERROR: ${error.message}`);
      return { valid: false, issues };
    }
  }

  /**
   * 修复实体文件（从数据库重新生成）
   */
  protected async repairEntityFiles(
    entityId: string,
    realmId: string
  ): Promise<void> {
    const entityType = this.getEntityType();

    this.logger.info(`Repairing entity ${entityId}`, {
      entityType,
      entityId,
      realmId,
    });

    try {
      const dbRecord = await this.findInDatabase(entityId, realmId);
      if (!dbRecord) {
        throw new Error(`Cannot repair: entity ${entityId} not found in database`);
      }

      // 重建实体并重新保存
      const entity = await this.reconstructEntity(dbRecord);
      await this.updateEntity(entity, realmId);

      this.logger.info(`Successfully repaired entity ${entityId}`, {
        entityType,
        entityId,
      });
    } catch (error: any) {
      this.logger.error(`Failed to repair entity ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 从数据库记录重建实体（子类实现）
   * 用于修复缺失或损坏的文件
   */
  protected abstract reconstructEntity(dbRecord: TDbRecord): Promise<TEntity>;

  // ============================================
  // 抽象方法 - 数据库操作（子类实现）
  // ============================================

  /**
   * 保存到数据库
   */
  protected abstract saveToDatabase(
    dbRecord: TDbRecord,
    contentPath: string
  ): Promise<void>;

  /**
   * 更新数据库记录
   */
  protected abstract updateInDatabase(
    entityId: string,
    dbRecord: TDbRecord,
    contentPath: string
  ): Promise<void>;

  /**
   * 从数据库删除
   */
  protected abstract deleteFromDatabase(entityId: string, realmId: string): Promise<void>;

  /**
   * 从数据库查找
   */
  protected abstract findInDatabase(entityId: string, realmId: string): Promise<TDbRecord | null>;

  /**
   * 从数据库记录获取内容路径
   */
  protected abstract getContentPath(dbRecord: TDbRecord): string;
}
