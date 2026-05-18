/**
 * HybridUserRepository - User 混合持久化实现
 *
 * 混合策略：
 * - 数据库：存储索引字段（id, username, email, role, status）
 * - 文件系统：存储完整的 User 实体 JSON
 */

import { HybridRepository } from './hybrid-repository.base';
import { UserEntity, UserRole } from '../../domain/models/user/user.entity';
import { IUserRepository } from '../../application/interfaces/repositories/user.repository.interface';

interface UserDbRecord {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  profilePath: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserContent {
  avatar?: string;
  permissions: string[];
  preference?: {
    pinned_channels?: readonly string[];
  };
}

export class HybridUserRepository
  extends HybridRepository<UserEntity, UserDbRecord, UserContent>
  implements IUserRepository
{
  getEntityType(): string { return 'users'; }
  getEntityId(entity: UserEntity): string { return entity.userId; }

  toDomain(dbRecord: UserDbRecord, content: UserContent): UserEntity {
    return UserEntity.create({
      userId: dbRecord.id,
      username: dbRecord.username,
      email: dbRecord.email,
      displayName: dbRecord.displayName,
      role: dbRecord.role as UserRole,
      avatar: content.avatar,
      permissions: content.permissions,
      preference: content.preference,
      createdAt: dbRecord.createdAt,
    });
  }

  toDatabase(entity: UserEntity): UserDbRecord {
    return {
      id: entity.userId,
      username: entity.username,
      email: entity.email,
      displayName: entity.displayName,
      role: entity.role,
      status: 'active',
      profilePath: '',
      createdAt: entity.createdAt,
      updatedAt: new Date(),
    };
  }

  toStorage(entity: UserEntity): UserContent {
    return {
      avatar: entity.avatar,
      permissions: Array.from(entity.permissions || []),
      preference: entity.preference,
    };
  }

  getContentPath(dbRecord: UserDbRecord): string {
    return dbRecord.profilePath;
  }

  // --- IUserRepository ---

  async findById(userId: string): Promise<UserEntity | null> {
    return this.findEntityById(userId);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { username } });
    if (!record) return null;
    const content = await this.storage.loadJson(record.profilePath);
    return this.toDomain(record as unknown as UserDbRecord, content);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) return null;
    const content = await this.storage.loadJson(record.profilePath);
    return this.toDomain(record as unknown as UserDbRecord, content);
  }

  async findByRole(role: UserRole): Promise<UserEntity[]> {
    const records = await this.prisma.user.findMany({ where: { role } });
    return this.loadEntities(records as unknown as UserDbRecord[]);
  }

  async findAll(): Promise<UserEntity[]> {
    const records = await this.prisma.user.findMany();
    return this.loadEntities(records as unknown as UserDbRecord[]);
  }

  async save(user: UserEntity, serverId: string): Promise<void> {
    await this.saveEntity(user, serverId);
  }

  async update(user: UserEntity, serverId: string): Promise<void> {
    await this.updateEntity(user, serverId);
  }

  async delete(userId: string): Promise<void> {
    await this.deleteEntity(userId);
  }

  async exists(userId: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { id: userId } });
    return count > 0;
  }

  async usernameExists(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { username } });
    return count > 0;
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: UserDbRecord, contentPath: string): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: dbRecord.id,
        username: dbRecord.username,
        email: dbRecord.email,
        displayName: dbRecord.displayName,
        role: dbRecord.role,
        status: dbRecord.status,
        profilePath: contentPath,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: UserDbRecord, contentPath: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: entityId },
      data: {
        username: dbRecord.username,
        email: dbRecord.email,
        displayName: dbRecord.displayName,
        role: dbRecord.role,
        status: dbRecord.status,
        profilePath: contentPath,
        updatedAt: dbRecord.updatedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: entityId } });
  }

  protected async findInDatabase(entityId: string): Promise<UserDbRecord | null> {
    const record = await this.prisma.user.findUnique({ where: { id: entityId } });
    return record as unknown as UserDbRecord | null;
  }
}
