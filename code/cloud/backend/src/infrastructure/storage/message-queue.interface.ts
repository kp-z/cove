/**
 * Message Queue Interface
 *
 * 消息队列：基于 SQLite 的持久化消息队列
 *
 * 职责：
 * - 消息持久化：保证消息不丢失
 * - 状态管理：PENDING → PROCESSING → COMPLETED/FAILED
 * - 崩溃恢复：重启后恢复未完成的消息
 * - 优先级调度：支持消息优先级
 */

import type { MessageState } from '../../domain/message-orchestrator/message-orchestrator.interface'

/**
 * 队列中的消息
 */
export interface QueuedMessage {
  id: string
  messageId: string
  channelId: string
  content: string
  state: MessageState
  priority: number
  attempts: number
  maxAttempts: number
  createdAt: Date
  updatedAt: Date
  lastAttemptAt?: Date
  completedAt?: Date
  error?: string
}

/**
 * 消息队列接口
 */
export interface IMessageQueue {
  /**
   * 将消息加入队列
   * @param message 消息内容
   * @returns 队列 ID
   */
  enqueue(message: EnqueueMessageData): Promise<string>

  /**
   * 获取下一条待处理消息（按优先级）
   * @returns 消息或 null
   */
  dequeue(): Promise<QueuedMessage | null>

  /**
   * 更新消息状态
   * @param id 队列 ID
   * @param state 新状态
   * @param error 错误信息（可选）
   */
  updateState(id: string, state: MessageState, error?: string): Promise<void>

  /**
   * 获取消息
   * @param id 队列 ID
   * @returns 消息或 null
   */
  get(id: string): Promise<QueuedMessage | null>

  /**
   * 根据状态查找消息
   * @param state 消息状态
   * @returns 消息列表
   */
  findByState(state: MessageState): Promise<QueuedMessage[]>

  /**
   * 删除消息
   * @param id 队列 ID
   */
  delete(id: string): Promise<void>

  /**
   * 清空队列
   */
  clear(): Promise<void>

  /**
   * 关闭连接
   */
  close(): Promise<void>
}

/**
 * 入队消息数据
 */
export interface EnqueueMessageData {
  messageId: string
  channelId: string
  content: string
  priority?: number
  maxAttempts?: number
}
