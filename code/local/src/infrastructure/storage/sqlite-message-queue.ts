/**
 * SQLite Message Queue
 *
 * 基于 Prisma 的消息队列实现
 */

import { PrismaClient } from '../../../generated/client'
import type { IMessageQueue } from './message-queue.interface'
import type { MessageTask } from '../../domain/agent-runtime/message-orchestrator.interface'

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
        content: task.content,
        state: task.state,
        executionMode: task.executionMode,
        attempts: task.attempts,
        maxAttempts: task.maxAttempts,
        priority: task.priority,
        error: task.error,
        // 契约1/契约3：metadata 以 JSON 字符串持久化，出队时还原，避免 agentMessageId 丢失。
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
      content: record.content,
      state: record.state,
      executionMode: record.executionMode,
      attempts: record.attempts,
      maxAttempts: record.maxAttempts,
      priority: record.priority,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastAttemptAt: record.lastAttemptAt,
      completedAt: record.completedAt,
      error: record.error ?? undefined,
      // 契约1/契约3：还原 JSON 字符串为 metadata 对象。
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
