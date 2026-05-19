/**
 * ThreadService - Thread 管理业务逻辑
 *
 * 职责：
 * - 创建和管理 Thread
 * - 处理线程回复
 * - 查询线程消息和元数据
 *
 * 依赖：
 * - IThreadRepository: Thread 数据访问
 * - IMessageRepository: Message 数据访问
 * - IEventBus: 事件发布
 * - ILogger: 日志记录
 */

import { RootMessageNotFoundError, NestedThreadError } from './thread.errors';

import { ThreadEntity } from '../../../domain/models/thread/thread.entity';
import { MessageEntity, SenderType } from '../../../domain/models/message/message.entity';
import {
  IThreadRepository,
  IMessageRepository,
  ILogger,
} from '../../interfaces';
import { getServerContext } from '../../context/server-context-store';

export class ThreadService {
  constructor(
    private readonly threadRepository: IThreadRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly logger: ILogger
  ) {}

  async getOrCreateThread(rootMessageId: string): Promise<ThreadEntity> {
      const context = getServerContext();
    const existing = await this.threadRepository.findById(rootMessageId);
    if (existing) {
      return existing;
    }

    const rootMessage = await this.messageRepository.findById(rootMessageId);
    if (!rootMessage) {
      throw new RootMessageNotFoundError(rootMessageId);
    }

    const thread = ThreadEntity.create({
      threadId: rootMessageId,
      channelId: rootMessage.channelId,
      rootMessageId,
      participants: [rootMessage.senderId],
      replyCount: 0,
      createdAt: new Date(),
    });

    await this.threadRepository.save(thread, context.serverId);

    this.logger.info('Thread created', { threadId: rootMessageId, channelId: rootMessage.channelId });

    return thread;
  }

  async replyInThread(
    rootMessageId: string,
    senderId: string,
    senderType: SenderType,
    content: string,
  ): Promise<MessageEntity> {
    const context = getServerContext();
    const rootMessage = await this.messageRepository.findById(rootMessageId);
    if (!rootMessage) {
      throw new RootMessageNotFoundError(rootMessageId);
    }

    if (rootMessage.threadId) {
      throw new NestedThreadError(rootMessageId);
    }

    const thread = await this.getOrCreateThread(rootMessageId);

    const messageId = this.generateMessageId();
    const msgShortId = messageId.split('-')[1]?.substring(0, 8) ?? 'unknown';
    const now = new Date();

    const message = MessageEntity.create({
      messageId,
      msgShortId,
      channelId: thread.channelId,
      channelName: rootMessage.channelName,
      senderId,
      senderName: senderId,
      senderType,
      content,
      contentType: 'text',
      contentFormat: 'plain',
      threadId: rootMessageId,
      isThreadRoot: false,
      attachments: [],
      mentions: [],
      references: [],
      reactions: [],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
      meta: {
        client: 'server',
        isPinned: false,
        isImportant: false,
      },
    });

    await this.messageRepository.save(message, context.serverId);

    const updatedThread = thread.addReply().addParticipant(senderId);
    await this.threadRepository.update(updatedThread, context.serverId);

    this.logger.info('Thread reply sent', { threadId: rootMessageId, messageId });

    return message;
  }

  async listThreadMessages(threadId: string, _cursor?: string, _limit?: number): Promise<MessageEntity[]> {
    return this.messageRepository.findByThread(threadId);
  }

  async listChannelThreads(channelId: string): Promise<ThreadEntity[]> {
    return this.threadRepository.findByChannel(channelId);
  }

  // --- Private helpers ---

  private generateMessageId(): string {
    return `message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// --- Application Layer Errors ---

