/**
 * SQLite Task Store
 *
 * 基于 Prisma 的任务存储实现
 */

import { PrismaClient } from '@prisma/client'
import type { ITaskStore, TaskRecord, UpsertTaskData } from './task-store.interface'
import type { MessageState } from '../../domain/agent-runtime/message-orchestrator.interface'

/**
 * SQLite 任务存储
 */
export class SqliteTaskStore implements ITaskStore {
  constructor(private prisma: PrismaClient) {}

  /**
   * 创建或更新任务
   */
  async upsert(task: UpsertTaskData): Promise<void> {
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
          updatedAt: new Date(),
          lastAttemptAt: task.lastAttemptAt,
          completedAt: task.completedAt
        }
      })
    } else {
      // 创建新记录
      await this.prisma.messageTask.create({
        data: {
          id: task.messageId, // 使用 messageId 作为 id
          messageId: task.messageId,
          channelId: task.channelId,
          content: '', // 默认空内容
          state: task.state,
          executionMode: 'device', // 默认 device 模式
          attempts: task.attempts ?? 0,
          maxAttempts: task.maxAttempts ?? 3,
          priority: 0, // 默认优先级
          error: task.error,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAttemptAt: task.lastAttemptAt,
          completedAt: task.completedAt
        }
      })
    }
  }

  /**
   * 获取任务
   */
  async get(messageId: string): Promise<TaskRecord | null> {
    const record = await this.prisma.messageTask.findFirst({
      where: { messageId }
    })

    if (!record) {
      return null
    }

    return this.toTaskRecord(record)
  }

  /**
   * 根据状态查找任务
   */
  async findByState(state: MessageState): Promise<TaskRecord[]> {
    const records = await this.prisma.messageTask.findMany({
      where: { state },
      orderBy: { createdAt: 'asc' }
    })

    return records.map((record: any) => this.toTaskRecord(record))
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
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect()
  }

  /**
   * 转换数据库记录为 TaskRecord
   */
  private toTaskRecord(record: any): TaskRecord {
    return {
      id: record.id,
      messageId: record.messageId,
      channelId: record.channelId,
      agentId: undefined,
      state: record.state as MessageState,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      result: undefined,
      error: record.error ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastAttemptAt: record.lastAttemptAt ?? undefined,
      completedAt: record.completedAt ?? undefined
    }
  }
}
