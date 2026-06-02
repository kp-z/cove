/**
 * SQLite Progress Store
 *
 * 基于 Prisma 的流式进度存储实现
 */

import { PrismaClient } from '../../../generated/client'
import type {
  IProgressStore,
  ProgressRecord,
  ProgressSummary,
  SaveChunkData
} from './progress-store.interface'

/**
 * SQLite 进度存储
 */
export class SqliteProgressStore implements IProgressStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * 保存进度 chunk
   */
  async saveChunk(data: SaveChunkData): Promise<void> {
    await this.prisma.progressRecord.create({
      data: {
        id: `${data.messageId}-${data.chunkIndex}`,
        messageId: data.messageId,
        channelId: data.channelId,
        agentId: data.agentId,
        chunkIndex: data.chunkIndex,
        chunkContent: data.chunkContent,
        completed: data.completed ?? false,
        timestamp: new Date()
      }
    })
  }

  /**
   * 获取进度摘要
   */
  async getSummary(messageId: string): Promise<ProgressSummary | null> {
    const records = await this.prisma.progressRecord.findMany({
      where: { messageId },
      orderBy: { chunkIndex: 'asc' }
    })

    if (records.length === 0) {
      return null
    }

    const completed = records.some(r => r.completed)
    const lastRecord = records[records.length - 1]

    return {
      messageId,
      totalChunks: records.length,
      completedChunks: completed ? records.length : records.length - 1,
      lastChunkIndex: lastRecord.chunkIndex,
      completed,
      startedAt: records[0].timestamp,
      completedAt: completed ? lastRecord.timestamp : undefined
    }
  }

  /**
   * 获取所有 chunks
   */
  async getChunks(messageId: string): Promise<ProgressRecord[]> {
    const records = await this.prisma.progressRecord.findMany({
      where: { messageId },
      orderBy: { chunkIndex: 'asc' }
    })

    return records.map(r => this.toProgressRecord(r))
  }

  /**
   * 获取从指定索引开始的 chunks（断点续传）
   */
  async getChunksFrom(messageId: string, fromIndex: number): Promise<ProgressRecord[]> {
    const records = await this.prisma.progressRecord.findMany({
      where: {
        messageId,
        chunkIndex: { gte: fromIndex }
      },
      orderBy: { chunkIndex: 'asc' }
    })

    return records.map(r => this.toProgressRecord(r))
  }

  /**
   * 标记为已完成
   */
  async markCompleted(messageId: string): Promise<void> {
    // 找到最后一个 chunk 并标记为完成
    const lastChunk = await this.prisma.progressRecord.findFirst({
      where: { messageId },
      orderBy: { chunkIndex: 'desc' }
    })

    if (lastChunk) {
      await this.prisma.progressRecord.update({
        where: { id: lastChunk.id },
        data: { completed: true }
      })
    }
  }

  /**
   * 删除进度记录
   */
  async delete(messageId: string): Promise<void> {
    await this.prisma.progressRecord.deleteMany({
      where: { messageId }
    })
  }

  /**
   * 清理已完成的进度记录（超过指定天数）
   */
  async cleanupCompleted(daysOld: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await this.prisma.progressRecord.deleteMany({
      where: {
        completed: true,
        timestamp: { lt: cutoffDate }
      }
    })

    return result.count
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect()
  }

  /**
   * 转换数据库记录为 ProgressRecord
   */
  private toProgressRecord(record: any): ProgressRecord {
    return {
      id: record.id,
      messageId: record.messageId,
      channelId: record.channelId,
      agentId: record.agentId,
      chunkIndex: record.chunkIndex,
      chunkContent: record.chunkContent,
      timestamp: record.timestamp,
      completed: record.completed
    }
  }
}
