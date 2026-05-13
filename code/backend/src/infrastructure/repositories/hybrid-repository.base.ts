/**
 * HybridRepository 基类
 *
 * 混合持久化架构的抽象基类：
 * - 数据库存储索引和元数据（快速查询）
 * - 文件系统存储实际内容（灵活扩展）
 */

import { PrismaClient } from '@prisma/client';
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
  protected async saveEntity(entity: TEntity): Promise<void> {
    const entityId = this.getEntityId(entity);
    const entityType = this.getEntityType();

    try {
      // 1. 保存内容到文件
      const content = this.toStorage(entity);
      const contentPath = await this.storage.saveJsonAtomic(
        entityType,
        entityId,
        content
      );

      // 2. 保存索引到数据库
      const dbRecord = this.toDatabase(entity);
      await this.saveToDatabase(dbRecord, contentPath);

      this.logger.debug(`Saved ${entityType} ${entityId}`, { entityId });
    } catch (error: any) {
      this.logger.error(`Failed to save ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 更新实体（数据库 + 文件）
   */
  protected async updateEntity(entity: TEntity): Promise<void> {
    const entityId = this.getEntityId(entity);
    const entityType = this.getEntityType();

    try {
      // 1. 更新文件内容
      const content = this.toStorage(entity);
      const contentPath = await this.storage.saveJsonAtomic(
        entityType,
        entityId,
        content
      );

      // 2. 更新数据库索引
      const dbRecord = this.toDatabase(entity);
      await this.updateInDatabase(entityId, dbRecord, contentPath);

      this.logger.debug(`Updated ${entityType} ${entityId}`, { entityId });
    } catch (error: any) {
      this.logger.error(`Failed to update ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 删除实体（数据库 + 文件）
   */
  protected async deleteEntity(entityId: string): Promise<void> {
    const entityType = this.getEntityType();

    try {
      // 1. 从数据库删除
      await this.deleteFromDatabase(entityId);

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
  protected async findEntityById(entityId: string): Promise<TEntity | null> {
    const entityType = this.getEntityType();

    try {
      // 1. 从数据库查询索引
      const dbRecord = await this.findInDatabase(entityId);

      if (!dbRecord) {
        return null;
      }

      // 2. 从文件加载内容
      const contentPath = this.getContentPath(dbRecord);
      const content = await this.storage.loadJson(contentPath);

      // 3. 组装领域实体
      return this.toDomain(dbRecord, content);
    } catch (error: any) {
      this.logger.error(`Failed to find ${entityType} ${entityId}`, error);
      throw error;
    }
  }

  /**
   * 批量加载实体
   */
  protected async loadEntities(dbRecords: TDbRecord[]): Promise<TEntity[]> {
    // 并行加载所有内容文件
    const entities = await Promise.all(
      dbRecords.map(async (record) => {
        const contentPath = this.getContentPath(record);
        const content = await this.storage.loadJson(contentPath);
        return this.toDomain(record, content);
      })
    );

    return entities;
  }

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
  protected abstract deleteFromDatabase(entityId: string): Promise<void>;

  /**
   * 从数据库查找
   */
  protected abstract findInDatabase(entityId: string): Promise<TDbRecord | null>;

  /**
   * 从数据库记录获取内容路径
   */
  protected abstract getContentPath(dbRecord: TDbRecord): string;
}
