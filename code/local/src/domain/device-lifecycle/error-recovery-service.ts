/**
 * Error Recovery Service
 *
 * 错误恢复服务：处理设备崩溃恢复和错误降级
 */

import type { ITaskStore } from '../../infrastructure/storage/task-store.interface'
import type { ILogger } from '../../infrastructure/logger'

/**
 * 错误恢复配置
 */
export interface ErrorRecoveryConfig {
  maxRetries?: number  // 最大重试次数
  retryDelay?: number  // 重试延迟（毫秒）
  recoveryTimeout?: number  // 恢复超时（毫秒）
  logger?: ILogger
}

/**
 * 错误恢复服务
 */
export class ErrorRecoveryService {
  private readonly logger: ILogger

  constructor(
    private readonly taskStore: ITaskStore,
    private readonly config: ErrorRecoveryConfig = {}
  ) {
    this.logger = config.logger ?? {
      debug: () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      setLevel: () => {},
      scope: () => this.logger,
    }
  }

  /**
   * 恢复未完成的任务
   *
   * 在设备重启后调用，恢复处理中的任务
   */
  async recoverPendingTasks(): Promise<void> {
    try {
      // 1. 查找所有处理中的任务
      const processingTasks = await this.taskStore.findByState('PROCESSING')

      if (processingTasks.length > 0) {
        this.logger.info(`🔄 Recovering ${processingTasks.length} pending task(s)...`)
      } else {
        this.logger.debug('🔄 No pending tasks to recover')
      }

      // 2. 检查每个任务的状态
      for (const task of processingTasks) {
        await this.recoverTask(task.messageId)
      }
    } catch (error) {
      this.logger.error('❌ Failed to recover pending tasks', error as Error)
      throw error
    }
  }

  /**
   * 恢复单个任务
   */
  private async recoverTask(messageId: string): Promise<void> {
    try {
      const task = await this.taskStore.get(messageId)

      if (!task) {
        this.logger.warn(`⚠️  Task not found during recovery`, { messageId })
        return
      }

      // 检查任务是否超时
      const now = Date.now()
      const lastAttemptTime = task.lastAttemptAt?.getTime() || task.createdAt.getTime()
      const timeSinceLastAttempt = now - lastAttemptTime

      const recoveryTimeout = this.config.recoveryTimeout ?? 300000  // 默认 5 分钟

      if (timeSinceLastAttempt > recoveryTimeout) {
        const maxRetries = this.config.maxRetries ?? 3

        if (task.attempts >= maxRetries) {
          // 超过最大重试次数，移入死信队列
          await this.taskStore.upsert({
            messageId: task.messageId,
            channelId: task.channelId,
            agentId: task.agentId,
            state: 'DEAD_LETTER',
            attempts: task.attempts,
            maxAttempts: task.maxAttempts,
            error: 'Max retries exceeded after recovery'
          })
          this.logger.warn(`⚠️  Task exceeded max retries — moved to dead letter`, { messageId, attempts: task.attempts })
        } else {
          // 重置为 PENDING 状态，等待重新处理
          await this.taskStore.upsert({
            messageId: task.messageId,
            channelId: task.channelId,
            agentId: task.agentId,
            state: 'PENDING',
            attempts: task.attempts,
            maxAttempts: task.maxAttempts,
            error: 'Recovered from timeout'
          })
          this.logger.info(`🔄 Task reset to PENDING for retry`, { messageId, attempts: task.attempts })
        }
      } else {
        this.logger.debug(`Task still processing`, { messageId, elapsedMs: timeSinceLastAttempt })
      }
    } catch (error) {
      this.logger.error(`❌ Failed to recover task`, error as Error, { messageId })
    }
  }

  /**
   * 处理错误
   *
   * 根据错误类型决定是否重试或降级
   */
  async handleError(messageId: string, error: Error): Promise<'retry' | 'fail' | 'degrade'> {
    try {
      const task = await this.taskStore.get(messageId)

      if (!task) {
        this.logger.warn(`⚠️  Task not found for error handling`, { messageId })
        return 'fail'
      }

      const maxRetries = this.config.maxRetries ?? 3

      // 检查是否超过最大重试次数
      if (task.attempts >= maxRetries) {
        await this.taskStore.upsert({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: task.agentId,
          state: 'DEAD_LETTER',
          attempts: task.attempts,
          maxAttempts: task.maxAttempts,
          error: error.message
        })
        return 'fail'
      }

      // 根据错误类型决定策略
      if (this.isTransientError(error)) {
        // 临时错误，可以重试
        await this.taskStore.upsert({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: task.agentId,
          state: 'PENDING',
          attempts: task.attempts,
          maxAttempts: task.maxAttempts,
          error: error.message
        })
        return 'retry'
      } else if (this.isDegradableError(error)) {
        // 可降级错误，使用降级策略
        return 'degrade'
      } else {
        // 永久错误，直接失败
        await this.taskStore.upsert({
          messageId: task.messageId,
          channelId: task.channelId,
          agentId: task.agentId,
          state: 'DEAD_LETTER',
          attempts: task.attempts,
          maxAttempts: task.maxAttempts,
          error: error.message
        })
        return 'fail'
      }
    } catch (err) {
      this.logger.error(`❌ Failed to handle error for task`, err as Error, { messageId })
      return 'fail'
    }
  }

  /**
   * 判断是否为临时错误
   */
  private isTransientError(error: Error): boolean {
    const transientErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Network error',
      'Backend unavailable'
    ]

    return transientErrors.some(msg => error.message.includes(msg))
  }

  /**
   * 判断是否为可降级错误
   */
  private isDegradableError(error: Error): boolean {
    const degradableErrors = [
      'Rate limit exceeded',
      'Service overloaded',
      'Quota exceeded'
    ]

    return degradableErrors.some(msg => error.message.includes(msg))
  }
}
