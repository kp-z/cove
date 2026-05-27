/**
 * IThreadRepository - Thread Repository 接口
 *
 * Application Layer 通过此接口访问 Thread 数据。
 */

import { ThreadEntity } from '../../../domain/models/thread/thread.entity';

export interface IThreadRepository {
  findById(threadId: string, realmId: string): Promise<ThreadEntity | null>;
  findByChannel(channelId: string, realmId: string): Promise<ThreadEntity[]>;
  findByRootMessage(rootMessageId: string, realmId: string): Promise<ThreadEntity | null>;
  save(thread: ThreadEntity): Promise<void>;
  update(thread: ThreadEntity): Promise<void>;
  exists(threadId: string, realmId: string): Promise<boolean>;
}
