/**
 * Message Orchestrator
 *
 * 消息编排器实现：所有消息通过 Device 模式处理
 */

import type {
  IMessageOrchestrator,
  MessageTask,
  EnqueueMessage,
  MessageState
} from './message-orchestrator.interface'
import type { IMessageProcessor } from './message-processor.interface'
import { realmIdFromChannel } from '../../common/channel-ref'

/**
 * 消息队列接口
 */
export interface IMessageQueue {
  enqueue(task: MessageTask): Promise<string>
  dequeue(): Promise<MessageTask | null>
  peek(): Promise<MessageTask | null>
  size(): Promise<number>
}

/**
 * 任务存储接口
 */
export interface ITaskStore {
  upsert(task: MessageTask): Promise<void>
  get(taskId: string): Promise<MessageTask | null>
  getPending(): Promise<MessageTask[]>
  updateState(taskId: string, state: MessageState, error?: string): Promise<void>
}

/**
 * MessageOrchestrator 配置
 */
export interface MessageOrchestratorConfig {
  maxAttempts?: number
  pollInterval?: number
}

/**
 * 消息编排器实现
 */
export class MessageOrchestrator implements IMessageOrchestrator {
  private running = false
  private pollTimer?: NodeJS.Timeout

  constructor(
    private readonly deviceProcessor: IMessageProcessor,
    private readonly messageQueue: IMessageQueue,
    private readonly taskStore: ITaskStore,
    private readonly config: MessageOrchestratorConfig = {}
  ) {}

  /**
   * 将消息加入队列
   */
  async enqueue(message: EnqueueMessage): Promise<string> {
    // 1. 从 channelId 中提取 realmId (格式: realm-id:channel-id)
    const realmId = this.extractRealmId(message.channelId)

    // 2. 创建任务
    const task: MessageTask = {
      id: this.generateTaskId(),
      messageId: message.messageId,
      channelId: message.channelId,
      realmId,
      content: message.content,
      state: 'PENDING',
      attempts: 0,
      maxAttempts: this.config.maxAttempts ?? 3,
      priority: message.priority ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: message.metadata  // 传递 metadata
    }

    // 3. 入队
    const taskId = await this.messageQueue.enqueue(task)
    await this.taskStore.upsert(task)

    return taskId
  }

  /**
   * 结束等待中的 Device 任务。中止属于成功终态，不进入失败重试。
   */
  notifyAborted(userMessageId: string): void {
    this.deviceProcessor.notifyAborted?.(userMessageId)
  }

  /**
   * 处理下一条待处理消息
   */
  async processNext(): Promise<boolean> {
    const task = await this.messageQueue.dequeue()
    if (!task) {
      return false
    }

    // 更新任务状态为 PROCESSING
    task.state = 'PROCESSING'
    task.attempts += 1
    task.lastAttemptAt = new Date()
    task.updatedAt = new Date()
    await this.taskStore.upsert(task)

    try {
      // 始终使用 Device 处理器（所有 LLM 调用都在 Local Device 执行）
      const result = await this.deviceProcessor.process(task)

      if (result.success) {
        // 处理成功
        task.state = 'COMPLETED'
        task.completedAt = new Date()
        task.updatedAt = new Date()
        await this.taskStore.upsert(task)
      } else {
        // 处理失败
        await this.handleFailure(task, result.error)
      }
    } catch (error) {
      // 处理异常
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.handleFailure(task, errorMessage)
    }

    return true
  }

  /**
   * 处理失败
   */
  private async handleFailure(task: MessageTask, error?: string): Promise<void> {
    if (task.attempts >= task.maxAttempts) {
      // 超过最大重试次数，移入死信队列
      task.state = 'DEAD_LETTER'
      task.error = error
      task.updatedAt = new Date()
      await this.taskStore.upsert(task)
    } else {
      // 重新入队
      task.state = 'PENDING'
      task.error = error
      task.updatedAt = new Date()
      await this.messageQueue.enqueue(task)
      await this.taskStore.upsert(task)
    }
  }

  /**
   * 获取任务状态
   */
  async getTask(taskId: string): Promise<MessageTask | null> {
    return this.taskStore.get(taskId)
  }

  /**
   * 获取所有待处理任务
   */
  async getPendingTasks(): Promise<MessageTask[]> {
    return this.taskStore.getPending()
  }

  /**
   * 启动消息处理循环
   */
  async start(): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true
    this.poll()
  }

  /**
   * 停止消息处理循环
   */
  async stop(): Promise<void> {
    this.running = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = undefined
    }
  }

  /**
   * 轮询处理消息
   */
  private poll(): void {
    if (!this.running) {
      return
    }

    this.processNext()
      .then(hasMore => {
        if (hasMore) {
          // 有消息被处理，立即处理下一条
          this.poll()
        } else {
          // 没有消息，等待后再轮询
          const interval = this.config.pollInterval ?? 1000
          this.pollTimer = setTimeout(() => this.poll(), interval)
        }
      })
      .catch(error => {
        console.error('Error processing message:', error)
        // 出错后等待一段时间再继续
        const interval = this.config.pollInterval ?? 1000
        this.pollTimer = setTimeout(() => this.poll(), interval)
      })
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 从 channelId 中提取 realmId（契约3：统一收敛到 channel-ref helper）
   * @param channelId 格式: realm-id:channel-id
   * @returns realmId
   */
  private extractRealmId(channelId: string): string {
    return realmIdFromChannel(channelId)
  }
}
