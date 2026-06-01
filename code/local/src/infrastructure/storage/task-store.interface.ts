/**
 * Task Store Interface
 *
 * 任务状态存储：基于 SQLite 的任务状态持久化
 *
 * 职责：
 * - 任务状态持久化：保证任务状态不丢失
 * - 幂等性保证：防止重复处理
 * - 崩溃恢复：重启后恢复任务状态
 * - 任务查询：根据状态、消息 ID 查询任务
 */

import type { MessageState } from '../../domain/agent-runtime/message-orchestrator.interface'

/**
 * 任务记录
 */
export interface TaskRecord {
  id: string
  messageId: string
  channelId: string
  agentId?: string
  state: MessageState
  attempts: number
  maxAttempts: number
  result?: string
  error?: string
  createdAt: Date
  updatedAt: Date
  lastAttemptAt?: Date
  completedAt?: Date
}

/**
 * 任务存储接口
 */
export interface ITaskStore {
  /**
   * 创建或更新任务
   * @param task 任务数据
   */
  upsert(task: UpsertTaskData): Promise<void>

  /**
   * 获取任务
   * @param messageId 消息 ID
   * @returns 任务记录或 null
   */
  get(messageId: string): Promise<TaskRecord | null>

  /**
   * 根据状态查找任务
   * @param state 任务状态
   * @returns 任务列表
   */
  findByState(state: MessageState): Promise<TaskRecord[]>

  /**
   * 删除任务
   * @param messageId 消息 ID
   */
  delete(messageId: string): Promise<void>

  /**
   * 清空所有任务
   */
  clear(): Promise<void>

  /**
   * 关闭连接
   */
  close(): Promise<void>
}

/**
 * 更新任务数据
 */
export interface UpsertTaskData {
  messageId: string
  channelId: string
  agentId?: string
  state: MessageState
  attempts?: number
  maxAttempts?: number
  result?: string
  error?: string
  lastAttemptAt?: Date
  completedAt?: Date
}
