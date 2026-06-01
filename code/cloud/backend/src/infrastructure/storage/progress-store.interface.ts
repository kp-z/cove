/**
 * Progress Store Interface
 *
 * 流式进度存储：基于 SQLite 的流式响应进度持久化
 *
 * 职责：
 * - 进度持久化：保存流式响应的每个 chunk
 * - 断点续传：支持从中断点继续
 * - 进度查询：获取当前进度
 * - 进度清理：清理已完成的进度记录
 */

/**
 * 进度记录
 */
export interface ProgressRecord {
  id: string
  messageId: string
  channelId: string
  agentId: string
  chunkIndex: number
  chunkContent: string
  timestamp: Date
  completed: boolean
}

/**
 * 进度摘要
 */
export interface ProgressSummary {
  messageId: string
  totalChunks: number
  completedChunks: number
  lastChunkIndex: number
  completed: boolean
  startedAt: Date
  completedAt?: Date
}

/**
 * 流式进度存储接口
 */
export interface IProgressStore {
  /**
   * 保存进度 chunk
   * @param progress 进度数据
   */
  saveChunk(progress: SaveChunkData): Promise<void>

  /**
   * 获取进度摘要
   * @param messageId 消息 ID
   * @returns 进度摘要或 null
   */
  getSummary(messageId: string): Promise<ProgressSummary | null>

  /**
   * 获取所有 chunks
   * @param messageId 消息 ID
   * @returns chunk 列表
   */
  getChunks(messageId: string): Promise<ProgressRecord[]>

  /**
   * 获取从指定索引开始的 chunks（断点续传）
   * @param messageId 消息 ID
   * @param fromIndex 起始索引
   * @returns chunk 列表
   */
  getChunksFrom(messageId: string, fromIndex: number): Promise<ProgressRecord[]>

  /**
   * 标记为已完成
   * @param messageId 消息 ID
   */
  markCompleted(messageId: string): Promise<void>

  /**
   * 删除进度记录
   * @param messageId 消息 ID
   */
  delete(messageId: string): Promise<void>

  /**
   * 清理已完成的进度记录（超过指定天数）
   * @param daysOld 天数
   */
  cleanupCompleted(daysOld: number): Promise<number>

  /**
   * 关闭连接
   */
  close(): Promise<void>
}

/**
 * 保存 chunk 数据
 */
export interface SaveChunkData {
  messageId: string
  channelId: string
  agentId: string
  chunkIndex: number
  chunkContent: string
  completed?: boolean
}
