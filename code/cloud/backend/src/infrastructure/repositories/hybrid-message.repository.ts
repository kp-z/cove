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
import { getRealmContext } from '../../application/context/realm-context-store';

// 数据库记录类型
interface MessageDbRecord {
  id: string;
  realmId: string;
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
      realmId: dbRecord.realmId,
      msgShortId: dbRecord.shortId,
      senderId: dbRecord.senderId,
      senderType: dbRecord.senderType as 'human' | 'agent' | 'system',
      senderName: content.senderName || 'Unknown',
      channelId: dbRecord.channelId,
      channelName: content.channelName || 'Unknown',
      threadId: dbRecord.threadId || undefined,
      isThreadRoot: dbRecord.isThreadRoot,
      content: content.content,
      contentType: dbRecord.contentType as 'text' | 'markdown' | 'code' | 'image' | 'file' | 'combination',
      contentFormat: content.contentFormat as 'plain' | 'markdown' | 'html',
      attachments: content.attachments || [],
      mentions: content.mentions || [],
      references: content.references || [],
      status: dbRecord.status as MessageStatus,
      isEdited: dbRecord.isEdited,
      editHistory: (content.editHistory || []).map(h => ({
        ...h,
        editedAt: new Date(h.editedAt),
      })),
      reactions: content.reactions || [],
      agentExecutionMetadata: content.agentExecutionMetadata ? {
        thinking: content.agentExecutionMetadata.thinking,
        tool_logs: content.agentExecutionMetadata.toolLogs?.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          tool_name: log.toolName,
          action: log.action,
          params: log.params,
          status: log.status,
          duration: log.duration,
          result: log.result,
          meta: log.meta ? {
            file_count: log.meta.fileCount,
            lines_changed: log.meta.linesChanged,
            exit_code: log.meta.exitCode,
          } : undefined,
        })),
        usage: content.agentExecutionMetadata.usage ? {
          input_tokens: content.agentExecutionMetadata.usage.inputTokens,
          output_tokens: content.agentExecutionMetadata.usage.outputTokens,
          total_tokens: content.agentExecutionMetadata.usage.totalTokens,
          cache: content.agentExecutionMetadata.usage.cache ? {
            creation_tokens: content.agentExecutionMetadata.usage.cache.creationTokens,
            read_tokens: content.agentExecutionMetadata.usage.cache.readTokens,
            hit_rate: content.agentExecutionMetadata.usage.cache.hitRate,
          } : undefined,
          cost: content.agentExecutionMetadata.usage.cost ? {
            input_cost: content.agentExecutionMetadata.usage.cost.inputCost,
            output_cost: content.agentExecutionMetadata.usage.cost.outputCost,
            cache_cost: content.agentExecutionMetadata.usage.cost.cacheCost,
            total_cost: content.agentExecutionMetadata.usage.cost.totalCost,
          } : undefined,
          model: content.agentExecutionMetadata.usage.model,
          latency: content.agentExecutionMetadata.usage.latency ? {
            first_token_ms: content.agentExecutionMetadata.usage.latency.firstTokenMs,
            total_ms: content.agentExecutionMetadata.usage.latency.totalMs,
            tokens_per_second: content.agentExecutionMetadata.usage.latency.tokensPerSecond,
          } : undefined,
        } : undefined,
        execution_mode: content.agentExecutionMetadata.executionMode,
        streaming_status: content.agentExecutionMetadata.streamingStatus,
        sequence: content.agentExecutionMetadata.sequence,
        started_at: content.agentExecutionMetadata.startedAt,
        completed_at: content.agentExecutionMetadata.completedAt,
      } : undefined,
      createdAt: dbRecord.createdAt,
      updatedAt: dbRecord.updatedAt,
      deletedAt: dbRecord.deletedAt || undefined,
      meta: content.meta || {},
    });
  }

  toDatabase(entity: MessageEntity): MessageDbRecord {
    return {
      id: entity.messageId,
      realmId: entity.realmId,
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
      agentExecutionMetadata: entity.agentExecutionMetadata ? {
        thinking: entity.agentExecutionMetadata.thinking,
        toolLogs: entity.agentExecutionMetadata.tool_logs?.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          toolName: log.tool_name,
          action: log.action,
          params: log.params,
          status: log.status,
          duration: log.duration,
          result: log.result,
          meta: log.meta ? {
            fileCount: log.meta.file_count,
            linesChanged: log.meta.lines_changed,
            exitCode: log.meta.exit_code,
          } : undefined,
        })),
        usage: entity.agentExecutionMetadata.usage ? {
          inputTokens: entity.agentExecutionMetadata.usage.input_tokens,
          outputTokens: entity.agentExecutionMetadata.usage.output_tokens,
          totalTokens: entity.agentExecutionMetadata.usage.total_tokens,
          cache: entity.agentExecutionMetadata.usage.cache ? {
            creationTokens: entity.agentExecutionMetadata.usage.cache.creation_tokens,
            readTokens: entity.agentExecutionMetadata.usage.cache.read_tokens,
            hitRate: entity.agentExecutionMetadata.usage.cache.hit_rate,
          } : undefined,
          cost: entity.agentExecutionMetadata.usage.cost ? {
            inputCost: entity.agentExecutionMetadata.usage.cost.input_cost,
            outputCost: entity.agentExecutionMetadata.usage.cost.output_cost,
            cacheCost: entity.agentExecutionMetadata.usage.cost.cache_cost,
            totalCost: entity.agentExecutionMetadata.usage.cost.total_cost,
          } : undefined,
          model: entity.agentExecutionMetadata.usage.model,
          latency: entity.agentExecutionMetadata.usage.latency ? {
            firstTokenMs: entity.agentExecutionMetadata.usage.latency.first_token_ms,
            totalMs: entity.agentExecutionMetadata.usage.latency.total_ms,
            tokensPerSecond: entity.agentExecutionMetadata.usage.latency.tokens_per_second,
          } : undefined,
        } : undefined,
        executionMode: entity.agentExecutionMetadata.execution_mode,
        streamingStatus: entity.agentExecutionMetadata.streaming_status,
        sequence: entity.agentExecutionMetadata.sequence,
        startedAt: entity.agentExecutionMetadata.started_at,
        completedAt: entity.agentExecutionMetadata.completed_at,
      } : undefined,
    };
  }

  protected async saveToDatabase(
    dbRecord: MessageDbRecord,
    contentPath: string
  ): Promise<void> {
    await this.prisma.message.create({
      data: {
        realmId: dbRecord.realmId,
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

  protected async deleteFromDatabase(entityId: string, realmId: string): Promise<void> {
    await this.prisma.message.delete({
      where: { id: entityId, realmId },
    });
  }

  protected async findInDatabase(entityId: string, realmId: string): Promise<MessageDbRecord | null> {
    return await this.prisma.message.findFirst({
      where: {
        id: entityId,
        realmId,
      },
    }) as MessageDbRecord | null;
  }

  protected getContentPath(dbRecord: MessageDbRecord): string {
    return dbRecord.contentPath;
  }

  // ============================================
  // 实现 IMessageRepository 接口
  // ============================================

  async findById(messageId: string, realmId: string): Promise<MessageEntity | null> {
    return await this.findEntityById(messageId, realmId);
  }

  async findByChannel(
    channelId: string,
    limit?: number,
    offset?: number
  ): Promise<MessageEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.message.findMany({
      where: {
        channelId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async findBySender(senderId: string): Promise<MessageEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.message.findMany({
      where: {
        senderId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async findByThread(threadId: string): Promise<MessageEntity[]> {
    const context = getRealmContext();
    const records = await this.prisma.message.findMany({
      where: {
        threadId,
        realmId: context.realmId,
      },
      orderBy: { createdAt: 'asc' },
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async findByStatus(status: MessageStatus, realmId: string): Promise<MessageEntity[]> {
    const records = await this.prisma.message.findMany({
      where: {
        status,
        realmId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return await this.loadEntities(records as MessageDbRecord[]);
  }

  async save(message: MessageEntity): Promise<void> {
    await this.saveEntity(message, message.realmId);
  }

  async update(message: MessageEntity): Promise<void> {
    await this.updateEntity(message, message.realmId);
  }

  async delete(messageId: string, realmId: string): Promise<void> {
    await this.deleteEntity(messageId, realmId);
  }

  async exists(messageId: string): Promise<boolean> {
    const context = getRealmContext();
    const count = await this.prisma.message.count({
      where: {
        id: messageId,
        realmId: context.realmId,
      },
    });
    return count > 0;
  }

  async findByChannelCursor(channelId: string, cursor: string | null, limit: number): Promise<{ messages: MessageEntity[]; nextCursor: string | null }> {
    const context = getRealmContext();
    const where: any = {
      channelId,
      realmId: context.realmId,
    };
    if (cursor) {
      const cursorRecord = await this.prisma.message.findFirst({
        where: {
          id: cursor,
          realmId: context.realmId,
        },
      });
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
