import { HybridRepository } from './hybrid-repository.base';
import { ThreadEntity } from '../../domain/models/thread/thread.entity';
import { IThreadRepository } from '../../application/interfaces/repositories/thread.repository.interface';

interface ThreadDbRecord {
  id: string;
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

  async findById(threadId: string): Promise<ThreadEntity | null> {
    return this.findEntityById(threadId);
  }

  async findByChannel(channelId: string): Promise<ThreadEntity[]> {
    const records = await this.prisma.thread.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
    });
    return this.loadEntities(records as unknown as ThreadDbRecord[]);
  }

  async findByRootMessage(rootMessageId: string): Promise<ThreadEntity | null> {
    const record = await this.prisma.thread.findUnique({
      where: { rootMessageId },
    });
    if (!record) return null;
    return this.findEntityById(record.id);
  }

  async save(thread: ThreadEntity): Promise<void> {
    await this.saveEntity(thread);
  }

  async update(thread: ThreadEntity): Promise<void> {
    await this.updateEntity(thread);
  }

  async delete(threadId: string): Promise<void> {
    await this.deleteEntity(threadId);
  }

  async exists(threadId: string): Promise<boolean> {
    const count = await this.prisma.thread.count({ where: { id: threadId } });
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

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.thread.delete({ where: { id: entityId } });
  }

  protected async findInDatabase(entityId: string): Promise<ThreadDbRecord | null> {
    const record = await this.prisma.thread.findUnique({ where: { id: entityId } });
    return record as unknown as ThreadDbRecord | null;
  }
}
