import { HybridRepository } from './hybrid-repository.base';
import { ThreadEntity } from '../../domain/models/thread/thread.entity';
import { IThreadRepository } from '../../application/interfaces/repositories/thread.repository.interface';
import { getRealmContext } from '../../application/context/realm-context-store';

interface ThreadDbRecord {
  id: string;
  realmId: string;
  channelId: string;
  rootMessageId: string;
  participants: string;
  replyCount: number;
  lastReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  detailsPath: string;
}

interface ThreadContent {
  // Thread entity doesn't have additional content beyond what's in the database
  // This is just a placeholder for the hybrid pattern
}

export class HybridThreadRepository
  extends HybridRepository<ThreadEntity, ThreadDbRecord, ThreadContent>
  implements IThreadRepository
{
  getEntityType(): string { return 'threads'; }
  getEntityId(entity: ThreadEntity): string { return entity.threadId; }

  toDomain(dbRecord: ThreadDbRecord, _content: ThreadContent): ThreadEntity {
    return ThreadEntity.create({
      threadId: dbRecord.id,
      realmId: dbRecord.realmId,
      channelId: dbRecord.channelId,
      rootMessageId: dbRecord.rootMessageId,
      participants: JSON.parse(dbRecord.participants),
      replyCount: dbRecord.replyCount,
      lastReplyAt: dbRecord.lastReplyAt ?? undefined,
      createdAt: dbRecord.createdAt,
    });
  }

  toDatabase(entity: ThreadEntity): ThreadDbRecord {
    return {
      id: entity.threadId,
      realmId: entity.realmId,
      channelId: entity.channelId,
      rootMessageId: entity.rootMessageId,
      participants: JSON.stringify(entity.participants),
      replyCount: entity.replyCount,
      lastReplyAt: entity.lastReplyAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: new Date(),
      detailsPath: '',
    };
  }

  toStorage(_entity: ThreadEntity): ThreadContent {
    return {};
  }

  getContentPath(dbRecord: ThreadDbRecord): string {
    return dbRecord.detailsPath;
  }

  // --- IThreadRepository ---

  async findById(threadId: string, realmId: string): Promise<ThreadEntity | null> {
    return this.findEntityById(threadId, realmId);
  }

  async findByChannel(channelId: string): Promise<ThreadEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.thread.findMany({
      where: {
        channelId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as ThreadDbRecord[]);
  }

  async findByRootMessage(rootMessageId: string): Promise<ThreadEntity | null> {
    const context = getRealmContext();
    const record = await this.prisma.thread.findFirst({
      where: {
        rootMessageId,
        realmId: context.realmId,
      },
    });
    if (!record) return null;
    return this.findEntityById(record.id, context.realmId);
  }

  async save(thread: ThreadEntity): Promise<void> {
    await this.saveEntity(thread, thread.realmId);
  }

  async update(thread: ThreadEntity): Promise<void> {
    await this.updateEntity(thread, thread.realmId);
  }

  async delete(threadId: string, realmId: string): Promise<void> {
    await this.deleteEntity(threadId, realmId);
  }

  async exists(threadId: string): Promise<boolean> {
    const context = getRealmContext();
    const count = await this.prisma.thread.count({
      where: {
        id: threadId,
        realmId: context.realmId,
      },
    });
    return count > 0;
  }

  async incrementReplyCount(threadId: string): Promise<void> {
    await this.prisma.thread.update({
      where: { id: threadId },
      data: {
        replyCount: { increment: 1 },
        lastReplyAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // --- Database operations (required by HybridRepository) ---

  protected async saveToDatabase(dbRecord: ThreadDbRecord, contentPath: string): Promise<void> {
    await this.prisma.thread.create({
      data: {
        realmId: dbRecord.realmId,
        id: dbRecord.id,
        channelId: dbRecord.channelId,
        rootMessageId: dbRecord.rootMessageId,
        participants: dbRecord.participants,
        replyCount: dbRecord.replyCount,
        lastReplyAt: dbRecord.lastReplyAt,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
        detailsPath: contentPath,
      },
    });
  }

  protected async updateInDatabase(entityId: string, dbRecord: ThreadDbRecord, contentPath: string): Promise<void> {
    await this.prisma.thread.update({
      where: { id: entityId },
      data: {
        participants: dbRecord.participants,
        replyCount: dbRecord.replyCount,
        lastReplyAt: dbRecord.lastReplyAt,
        updatedAt: dbRecord.updatedAt,
        detailsPath: contentPath,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string, realmId: string): Promise<void> {
    await this.prisma.thread.delete({ where: { id: entityId, realmId } });
  }

  protected async findInDatabase(entityId: string, realmId: string): Promise<ThreadDbRecord | null> {
    const record = await this.prisma.thread.findFirst({
      where: {
        id: entityId,
        realmId,
      },
    });
    return record as unknown as ThreadDbRecord | null;
  }
}
