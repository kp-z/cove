/**
 * SQLite Task Store
 *
 * 基于 Prisma 的任务存储实现
 */

import { PrismaClient } from '@prisma/client'
import type { ITaskStore } from '../../domain/message-orchestrator/message-orchestrator'
import type { MessageTask, MessageState } from '../../domain/message-orchestrator/message-orchestrator.interface'

/**
 * SQLite 任务存储
 */
export class SqliteTaskStore implements ITaskStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * 插入或更新任务
   */
  async upsert(task: MessageTask): Promise<void> {
    await this.prisma.messageTask.upsert({
      where: { id: task.id },
      create: {
        id: task.id,
        messageId: task.messageId,
        channelId: task.channelId,
        realmId: task.realmId,
        content: task.content,
        state: task.state,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        priority: task.priority,
        error: task.error,
        metadata: task.metadata ? JSON.stringify(task.metadata) : null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        lastAttemptAt: task.lastAttemptAt,
        completedAt: task.completedAt
      },
      update: {
        state: task.state,
        attempts: task.attempts,
        error: task.error,
        updatedAt: task.updatedAt,
        lastAttemptAt: task.lastAttemptAt,
        completedAt: task.completedAt
      }
    })
  }

  /**
   * 获取任务
   */
  async get(taskId: string): Promise<MessageTask | null> {
    const record = await this.prisma.messageTask.findUnique({
      where: { id: taskId }
    })

    if (!record) {
      return null
    }

    return this.toMessageTask(record)
  }

  /**
   * 获取所有待处理任务
   */
  async getPending(): Promise<MessageTask[]> {
    const records = await this.prisma.messageTask.findMany({
      where: { state: 'PENDING' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return records.map(record => this.toMessageTask(record))
  }

  /**
   * 更新任务状态
   */
  async updateState(taskId: string, state: MessageState, error?: string): Promise<void> {
    await this.prisma.messageTask.update({
      where: { id: taskId },
      data: {
        state,
        error,
        updatedAt: new Date(),
        ...(state === 'COMPLETED' && { completedAt: new Date() })
      }
    })
  }

  /**
   * 转换数据库记录为 MessageTask
   */
  private toMessageTask(record: any): MessageTask {
    return {
      id: record.id,
      messageId: record.messageId,
      channelId: record.channelId,
      realmId: record.realmId ?? '',
      content: record.content,
      state: record.state as MessageState,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      priority: record.priority,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastAttemptAt: record.lastAttemptAt,
      completedAt: record.completedAt,
      error: record.error ?? undefined,
      metadata: record.metadata ? JSON.parse(record.metadata) : undefined
    }
  }
}
