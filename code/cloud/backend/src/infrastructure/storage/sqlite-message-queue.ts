/**
 * SQLite Message Queue
 *
 * 基于 Prisma 的消息队列实现
 */

import { PrismaClient } from '@prisma/client'
import type { IMessageQueue } from '../../domain/message-orchestrator/message-orchestrator'
import type { MessageTask } from '../../domain/message-orchestrator/message-orchestrator.interface'

/**
 * SQLite 消息队列
 */
export class SqliteMessageQueue implements IMessageQueue {
  constructor(private prisma: PrismaClient) {}

  /**
   * 入队
   */
  async enqueue(task: MessageTask): Promise<string> {
    await this.prisma.messageTask.create({
      data: {
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
      }
    })

    return task.id
  }

  /**
   * 出队（获取并删除）
   */
  async dequeue(): Promise<MessageTask | null> {
    // 使用事务确保原子性
    return await this.prisma.$transaction(async (tx) => {
      // 查找优先级最高、最早创建的待处理任务
      const record = await tx.messageTask.findFirst({
        where: { state: 'PENDING' },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      })

      if (!record) {
        return null
      }

      // 删除任务（从队列中移除）
      await tx.messageTask.delete({
        where: { id: record.id }
      })

      return this.toMessageTask(record)
    })
  }

  /**
   * 查看队首（不删除）
   */
  async peek(): Promise<MessageTask | null> {
    const record = await this.prisma.messageTask.findFirst({
      where: { state: 'PENDING' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    if (!record) {
      return null
    }

    return this.toMessageTask(record)
  }

  /**
   * 获取队列大小
   */
  async size(): Promise<number> {
    return await this.prisma.messageTask.count({
      where: { state: 'PENDING' }
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
      state: record.state,
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
