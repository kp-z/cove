/**
 * SQLite Task Store
 *
 * 基于 Prisma 的任务存储实现
 */

import { PrismaClient } from '../../../generated/client'
import type { MessageTask, MessageState } from '../../domain/agent-runtime/message-orchestrator.interface'

/**
 * SQLite 任务存储
 */
export class SqliteTaskStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * 创建或更新任务
   */
  async upsert(task: MessageTask): Promise<void> {
    // 先查找是否存在
    const existing = await this.prisma.messageTask.findFirst({
      where: { messageId: task.messageId }
    })

    if (existing) {
      // 更新现有记录
      await this.prisma.messageTask.update({
        where: { id: existing.id },
        data: {
          state: task.state,
          attempts: task.attempts,
          error: task.error,
          updatedAt: new Date()
        }
      })
    } else {
      // 创建新记录
      await this.prisma.messageTask.create({
        data: {
          id: task.messageId,
          messageId: task.messageId,
          channelId: task.channelId,
          content: task.content,
          state: task.state,
          executionMode: task.executionMode,
          attempts: task.attempts ?? 0,
          maxAttempts: task.maxAttempts ?? 3,
          priority: task.priority ?? 0,
          error: task.error,
          // 契约1/契约3：持久化 metadata，保证崩溃恢复后 agentMessageId 不丢失。
          metadata: task.metadata ? JSON.stringify(task.metadata) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * 获取任务
   */
  async get(taskId: string): Promise<MessageTask | null> {
    const record = await this.prisma.messageTask.findFirst({
      where: { messageId: taskId }
    })

    if (!record) {
      return null
    }

    return this.toMessageTask(record)
  }

  /**
   * 根据状态查找任务
   */
  async findByState(state: MessageState): Promise<MessageTask[]> {
    const records = await this.prisma.messageTask.findMany({
      where: { state },
      orderBy: { createdAt: 'asc' }
    })

    return records.map((record: any) => this.toMessageTask(record))
  }

  /**
   * 删除任务
   */
  async delete(messageId: string): Promise<void> {
    await this.prisma.messageTask.deleteMany({
      where: { messageId }
    })
  }

  /**
   * 清空所有任务
   */
  async clear(): Promise<void> {
    await this.prisma.messageTask.deleteMany()
  }

  /**
   * 获取待处理任务
   */
  async getPending(): Promise<MessageTask[]> {
    const records = await this.prisma.messageTask.findMany({
      where: {
        state: { in: ['PENDING', 'PROCESSING'] }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return records.map((record: any) => this.toMessageTask(record))
  }

  /**
   * 更新任务状态
   */
  async updateState(taskId: string, state: MessageState, error?: string): Promise<void> {
    const existing = await this.prisma.messageTask.findFirst({
      where: { messageId: taskId }
    })

    if (existing) {
      await this.prisma.messageTask.update({
        where: { id: existing.id },
        data: {
          state,
          error,
          updatedAt: new Date()
        }
      })
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect()
  }

  /**
   * 转换数据库记录为 MessageTask
   */
  private toMessageTask(record: any): MessageTask {
    return {
      id: record.id,
      messageId: record.messageId,
      channelId: record.channelId,
      content: record.content,
      state: record.state as MessageState,
      executionMode: record.executionMode,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      priority: record.priority,
      error: record.error ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      // 契约1/契约3：还原 metadata JSON 字符串。
      metadata: this.parseMetadata(record.metadata)
    }
  }

  /**
   * 解析持久化的 metadata JSON 字符串。
   * 解析失败时返回 undefined，避免污染任务处理流程。
   */
  private parseMetadata(raw: unknown): MessageTask['metadata'] {
    if (typeof raw !== 'string' || raw.length === 0) {
      return undefined
    }
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  }
}
