/**
 * IThreadRepository - Thread Repository 接口
 *
 * Application Layer 通过此接口访问 Thread 数据。
 */

import { ThreadEntity } from '../../../domain/models/thread/thread.entity';

export interface IThreadRepository {
  findById(threadId: string): Promise<ThreadEntity | null>;
  findByChannel(channelId: string): Promise<ThreadEntity[]>;
  save(thread: ThreadEntity): Promise<void>;
  update(thread: ThreadEntity): Promise<void>;
}
