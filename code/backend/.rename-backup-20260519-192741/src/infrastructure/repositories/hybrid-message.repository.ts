/**
 * HybridMessageRepository - 消息混合持久化实现
 *
 * 数据库存储：索引、元数据、关系
 * 文件存储：消息内容、附件、提及、反应、编辑历史
 */

import { PrismaClient } from '@prisma/client';
import { HybridRepository } from './hybrid-repository.base';
import { StorageService } from '../storage/storage.service';
import { ILogger } from '../../application/interfaces/logger.interface';
import { IMessageRepository } from '../../application/interfaces/repositories/message.repository.interface';
import { MessageEntity, MessageStatus, MessageContent } from '../../domain/models/message/message.entity';

// 数据库记录类型
interface MessageDbRecord {
  id: string;
  shortId: string;
  channelId: string;
  senderId: string;
  senderType: string;
  threadId: string | null;
  isThreadRoot: boolean;
  contentPath: string;
  contentType: string;
  status: string;
  isEdited: boolean;
  reactionCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class HybridMessageRepository
  extends HybridRepository<MessageEntity, MessageDbRecord, MessageContent>
  implements IMessageRepository
{
  constructor(
    prisma: PrismaClient,
    storage: StorageService,
    logger: ILogger
  ) {
    super(prisma, storage, logger);
  }

  // ============================================
  // 实现抽象方法
  // ============================================

  getEntityType(): string {
    return 'messages';
  }

  getEntityId(entity: MessageEntity): string {
    return entity.messageId;
  }

  toDomain(dbRecord: MessageDbRecord, content: MessageContent): MessageEntity {
    return MessageEntity.create({
      messageId: dbRecord.id,
      msgShortId: dbRecord.shortId,
      senderId: dbRecord.senderId,
      senderType: dbRecord.senderType as 'human' | 'agent' | 'system',
      senderName: content.senderName,
      channelId: dbRecord.channelId,
      channelName: content.channelName,
      threadId: dbRecord.threadId || undefined,
      isThreadRoot: dbRecord.isThreadRoot,
      content: content.content,
      contentType: dbRecord.contentType as 'text' | 'markdown' | 'code' | 'image' | 'file' | 'combination',
      contentFormat: content.contentFormat as 'plain' | 'markdown' | 'html',
      attachments: content.attachments,
      mentions: content.mentions,
      references: content.references,
      status: dbRecord.status as MessageStatus,
      isEdited: dbRecord.isEdited,
      editHistory: content.editHistory.map(h => ({
        ...h,
        editedAt: new Date(h.editedAt),
      })),
      reactions: content.reactions,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
      deletedAt: dbRecord.deletedAt || undefined,
      meta: content.meta,
    });
  }

  toDatabase(entity: MessageEntity): MessageDbRecord {
    return {
      id: entity.messageId,
      shortId: entity.msgShortId,
      channelId: entity.channelId,
      senderId: entity.senderId,
      senderType: entity.senderType,
      threadId: entity.threadId || null,
      isThreadRoot: entity.isThreadRoot,
      contentPath: '', // 将在 saveToDatabase 中设置
      contentType: entity.contentType,
      status: entity.status,
      isEdited: entity.isEdited,
      reactionCount: entity.reactions.length,
      replyCount: 0, // TODO: 从数据库查询
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      deletedAt: entity.deletedAt || null,
    };
  }

  toStorage(entity: MessageEntity): MessageContent {
    return {
      content: entity.content,
      senderName: entity.senderName,
      channelName: entity.channelName,
      contentFormat: entity.contentFormat,
      attachments: entity.attachments.map(a => ({
        attachmentId: a.attachmentId,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
        fileUrl: a.fileUrl,
        thumbnailUrl: a.thumbnailUrl,
      })),
      mentions: entity.mentions.map(m => ({
        mentionType: m.mentionType,
        mentionId: m.mentionId,
        mentionName: m.mentionName,
        mentionPosition: m.mentionPosition,
      })),
      references: entity.references.map(r => ({
        refType: r.refType,
        refId: r.refId,
        refTitle: r.refTitle,
      })),
      reactions: entity.reactions.map(r => ({
        emoji: r.emoji,
        userIds: [...r.userIds],
        count: r.count,
      })),
      editHistory: entity.editHistory.map(h => ({
        editedAt: h.editedAt.toISOString(),
        previousContent: h.previousContent,
        editedBy: h.editedBy,
      })),
      meta: entity.meta,
    };
  }

  protected async saveToDatabase(
    dbRecord: MessageDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.message.create({
      data: {
        id: dbRecord.id,
        shortId: dbRecord.shortId,
        channelId: dbRecord.channelId,
        senderId: dbRecord.senderId,
        senderType: dbRecord.senderType,
        threadId: dbRecord.threadId,
        isThreadRoot: dbRecord.isThreadRoot,
        contentPath,
        contentType: dbRecord.contentType,
        status: dbRecord.status,
        isEdited: dbRecord.isEdited,
        reactionCount: dbRecord.reactionCount,
        replyCount: dbRecord.replyCount,
        createdAt: dbRecord.createdAt,
        updatedAt: dbRecord.updatedAt,
        deletedAt: dbRecord.deletedAt,
      },
    });
  }

  protected async updateInDatabase(
    entityId: string,
    dbRecord: MessageDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.message.update({
      where: { id: entityId },
      data: {
        shortId: dbRecord.shortId,
        channelId: dbRecord.channelId,
        senderId: dbRecord.senderId,
        senderType: dbRecord.senderType,
        threadId: dbRecord.threadId,
        isThreadRoot: dbRecord.isThreadRoot,
        contentPath,
        contentType: dbRecord.contentType,
        status: dbRecord.status,
        isEdited: dbRecord.isEdited,
        reactionCount: dbRecord.reactionCount,
        replyCount: dbRecord.replyCount,
        updatedAt: dbRecord.updatedAt,
        deletedAt: dbRecord.deletedAt,
      },
    });
  }

  protected async deleteFromDatabase(entityId: string): Promise<void> {
    await this.prisma.message.delete({
      where: { id: entityId },
    });
  }

  protected async findInDatabase(entityId: string): Promise<MessageDbRecord | null> {
    return await this.prisma.message.findUnique({
      where: { id: entityId },
    }) as MessageDbRecord | null;
  }

  protected getContentPath(dbRecord: MessageDbRecord): string {
    return dbRecord.contentPath;
  }

  // ============================================
  // 实现 IMessageRepository 接口
  // ============================================

  async findById(messageId: string): Promise<MessageEntity | null> {
    return await this.findEntityById(messageId);
  }

  async findByChannel(
    channelId: string,
    limit?: number,
    offset?: number
  ): Promise<MessageEntity[]> {
    const records = await this.prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async findBySender(senderId: string): Promise<MessageEntity[]> {
    const records = await this.prisma.message.findMany({
      where: { senderId },
      orderBy: { createdAt: 'desc' },
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async findByThread(threadId: string): Promise<MessageEntity[]> {
    const records = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async findByStatus(status: MessageStatus): Promise<MessageEntity[]> {
    const records = await this.prisma.message.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async save(message: MessageEntity, serverId: string): Promise<void> {
    await this.saveEntity(message, serverId);
  }

  async update(message: MessageEntity, serverId: string): Promise<void> {
    await this.updateEntity(message, serverId);
  }

  async delete(messageId: string): Promise<void> {
    await this.deleteEntity(messageId);
  }

  async exists(messageId: string): Promise<boolean> {
    const count = await this.prisma.message.count({
      where: { id: messageId },
    });
    return count > 0;
  }

  async findByChannelCursor(channelId: string, cursor: string | null, limit: number): Promise<{ messages: MessageEntity[]; nextCursor: string | null }> {
    const where: any = { channelId };
    if (cursor) {
      const cursorRecord = await this.prisma.message.findUnique({ where: { id: cursor } });
      if (cursorRecord) {
        where.createdAt = { lt: cursorRecord.createdAt };
      }
    }
    const records = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = records.length > limit;
    const slice = hasMore ? records.slice(0, limit) : records;
    const entities = await this.loadEntities(slice as any);
    const nextCursor = hasMore && slice.length > 0 ? slice[slice.length - 1]!.id : null;

    return { messages: entities, nextCursor };
  }

  async countRecentByChannelAndSender(channelId: string, senderId: string, sinceMinutes: number): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return this.prisma.message.count({
      where: {
        channelId,
        senderId,
        createdAt: { gte: since },
      },
    });
  }
}
