/**
 * InMemoryThreadRepository - Thread Repository 的内存实现
 *
 * MVP 阶段使用 Map 存储数据，后续可替换为 Prisma/TypeORM 实现。
 * 实现 IThreadRepository 接口，遵循依赖倒置原则。
 */

import { IThreadRepository } from '../../02-application/interfaces/repositories/thread.repository.interface';
import { ThreadEntity } from '../../01-domain/models/thread/thread.entity';

export class InMemoryThreadRepository implements IThreadRepository {
  private threads: Map<string, ThreadEntity> = new Map();

  async findById(threadId: string): Promise<ThreadEntity | null> {
    return this.threads.get(threadId) || null;
  }

  async findByChannel(channelId: string): Promise<ThreadEntity[]> {
    return Array.from(this.threads.values())
      .filter(thread => thread.channelId === channelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async save(thread: ThreadEntity): Promise<void> {
    if (this.threads.has(thread.threadId)) {
      throw new Error(`Thread with ID ${thread.threadId} already exists`);
    }
    this.threads.set(thread.threadId, thread);
  }

  async update(thread: ThreadEntity): Promise<void> {
    if (!this.threads.has(thread.threadId)) {
      throw new Error(`Thread with ID ${thread.threadId} not found`);
    }
    this.threads.set(thread.threadId, thread);
  }

  clear(): void {
    this.threads.clear();
  }

  count(): number {
    return this.threads.size;
  }
}
