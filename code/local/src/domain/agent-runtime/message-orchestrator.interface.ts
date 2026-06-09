/**
 * Message Orchestrator Interface
 *
 * 消息编排器：负责消息的入队、处理、状态管理
 *
 * 职责：
 * - 消息入队和出队
 * - 消息状态管理（PENDING → PROCESSING → COMPLETED/FAILED）
 * - 消息优先级调度
 * - 错误处理和重试
 * - 本地执行（Device 模式）：所有 LLM 调用均在本地设备完成
 *
 * 说明：历史上曾支持 Backend 模式（把消息转发回云端执行 LLM），
 * 但云端已不再执行 LLM（见 cloud/backend CLEANUP_PROGRESS），
 * 因此此处仅保留单一的 Device 执行模式。
 */

/**
 * 消息状态
 */
export type MessageState = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'

/**
 * 执行模式
 *
 * 仅保留 'device'：LLM 始终在本地设备执行。
 * 保留该字段（而非直接删除）是为了兼容已有的本地 SQLite 任务表结构。
 */
export type ExecutionMode = 'device'

/**
 * 消息任务
 */
export interface MessageTask {
  id: string
  messageId: string
  channelId: string
  content: string
  state: MessageState
  executionMode: ExecutionMode
  attempts: number
  maxAttempts: number
  priority: number
  createdAt: Date
  updatedAt: Date
  lastAttemptAt?: Date
  completedAt?: Date
  error?: string
  metadata?: {
    agentId?: string
    agentName?: string
    [key: string]: any
  }
}

/**
 * 消息编排器接口
 */
export interface IMessageOrchestrator {
  /**
   * 将消息加入队列
   * @param message 消息内容
   * @returns 任务 ID
   */
  enqueue(message: EnqueueMessage): Promise<string>

  /**
   * 处理下一条待处理消息
   * @returns 是否有消息被处理
   */
  processNext(): Promise<boolean>

  /**
   * 获取任务状态
   * @param taskId 任务 ID
   * @returns 任务信息
   */
  getTask(taskId: string): Promise<MessageTask | null>

  /**
   * 获取所有待处理任务
   * @returns 待处理任务列表
   */
  getPendingTasks(): Promise<MessageTask[]>

  /**
   * 启动消息处理循环
   */
  start(): Promise<void>

  /**
   * 停止消息处理循环
   */
  stop(): Promise<void>
}

/**
 * 入队消息
 */
export interface EnqueueMessage {
  messageId: string
  channelId: string
  content: string
  priority?: number
}
