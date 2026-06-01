/**
 * Device Processor
 *
 * Device 模式处理器：在本地调用 LLM API 处理消息
 */

import type { IMessageProcessor, ProcessResult } from './message-processor.interface'
import type { MessageTask } from './message-orchestrator.interface'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { IAdapterManager } from '../../infrastructure/adapters/adapter-manager.interface'
import type { PostProcessorConfig } from './post-processors'
import type { DeduplicationConfig } from './deduplication'
import {
  PostProcessorManager,
  ValidationPostProcessor,
  FormattingPostProcessor,
  MetadataExtractionPostProcessor
} from './post-processors'
import { DeduplicationManager } from './deduplication'

/**
 * Device 处理器配置
 */
export interface DeviceProcessorConfig {
  timeout?: number
  defaultAdapter?: string
  fallbackAdapters?: string[]
  maxHistoryMessages?: number
  maxContextTokens?: number
  defaultSystemPrompt?: string
  postProcessing?: PostProcessorConfig
  deduplication?: DeduplicationConfig
}

/**
 * Device 模式处理器
 */
export class DeviceProcessor implements IMessageProcessor {
  private readonly timeout: number
  private readonly defaultAdapter: string
  private readonly fallbackAdapters: string[]
  private readonly maxHistoryMessages: number
  private readonly maxContextTokens: number | undefined
  private readonly defaultSystemPrompt: string
  private readonly failedChunks: Map<string, string[]> = new Map()
  private readonly postProcessorManager: PostProcessorManager | undefined
  private readonly deduplicationManager: DeduplicationManager | undefined

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly adapterManager: IAdapterManager,
    config: DeviceProcessorConfig = {}
  ) {
    this.timeout = config.timeout ?? 30000
    this.defaultAdapter = config.defaultAdapter ?? 'anthropic-adapter'
    this.fallbackAdapters = config.fallbackAdapters ?? []
    this.maxHistoryMessages = config.maxHistoryMessages ?? 20
    this.maxContextTokens = config.maxContextTokens
    this.defaultSystemPrompt = config.defaultSystemPrompt ?? 'You are a helpful assistant.'

    // 初始化后处理器
    if (config.postProcessing) {
      this.postProcessorManager = new PostProcessorManager(config.postProcessing)

      // 注册内置后处理器
      this.postProcessorManager.register(
        new ValidationPostProcessor(config.postProcessing.options?.validation)
      )
      this.postProcessorManager.register(
        new FormattingPostProcessor(config.postProcessing.options?.formatting)
      )
      this.postProcessorManager.register(
        new MetadataExtractionPostProcessor(config.postProcessing.options?.metadataExtraction)
      )
    }

    // 初始化去重管理器
    if (config.deduplication) {
      this.deduplicationManager = new DeduplicationManager(config.deduplication)
    }
  }

  /**
   * 处理消息任务
   */
  async process(task: MessageTask): Promise<ProcessResult> {
    const startTime = Date.now()
    const metrics: Record<string, any> = {
      historyFetchTime: 0,
      llmCallTime: 0,
      responseSaveTime: 0,
      totalTime: 0,
      adapterUsed: this.defaultAdapter
    }

    try {
      // 1. 检查请求去重
      if (this.deduplicationManager) {
        const idempotencyKey = (task as any).idempotencyKey
        const cached = this.deduplicationManager.checkDuplicate(
          task.content,
          idempotencyKey
        )

        if (cached) {
          console.log('Request is duplicate, returning cached response')
          metrics.fromCache = true
          metrics.totalTime = Date.now() - startTime

          // 保存缓存的响应
          await this.saveResponse(task, cached.content, {
            ...metrics,
            ...cached.metadata,
            cached: true
          })

          return { success: true }
        }
      }

      // 2. 获取对话历史
      const historyStart = Date.now()
      const history = await this.getMessageHistory(task.channelId)
      metrics.historyFetchTime = Date.now() - historyStart

      // 3. 尝试主 Adapter 和备用 Adapters
      const adapters = [this.defaultAdapter, ...this.fallbackAdapters]
      let lastError: string | undefined

      for (const adapterName of adapters) {
        const adapter = await this.adapterManager.getAdapter(adapterName)
        if (!adapter) {
          lastError = `Adapter '${adapterName}' not found`
          console.warn(lastError)
          continue
        }

        try {
          metrics.adapterUsed = adapterName

          // 3. 调用 LLM API 生成响应
          const llmStart = Date.now()
          let response = await this.generateResponse(task, history, adapter)
          metrics.llmCallTime = Date.now() - llmStart

          // 4. 后处理响应
          if (this.postProcessorManager) {
            const postProcessStart = Date.now()
            const postProcessResult = await this.postProcessorManager.process(
              response,
              {
                channelId: task.channelId,
                messageId: task.messageId,
                taskId: task.id,
                adapter: adapterName,
                timestamp: new Date(),
                metrics
              }
            )

            response = postProcessResult.content
            metrics.postProcessingTime = Date.now() - postProcessStart

            // 合并后处理元数据
            if (postProcessResult.metadata) {
              metrics.postProcessing = postProcessResult.metadata
            }

            // 记录验证错误
            if (postProcessResult.validationErrors) {
              console.warn('Response validation errors:', postProcessResult.validationErrors)
              metrics.validationErrors = postProcessResult.validationErrors
            }
          }

          // 5. 保存响应到 Backend
          const saveStart = Date.now()
          await this.saveResponse(task, response, metrics)
          metrics.responseSaveTime = Date.now() - saveStart

          metrics.totalTime = Date.now() - startTime

          // 6. 缓存响应（用于去重）
          if (this.deduplicationManager) {
            const idempotencyKey = (task as any).idempotencyKey
            this.deduplicationManager.cacheResponse(
              task.content,
              response,
              metrics,
              idempotencyKey
            )
          }

          // 7. 上报性能指标
          await this.reportMetrics(task, metrics).catch(err => {
            console.warn('Failed to report metrics:', err)
          })

          return { success: true }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`Adapter '${adapterName}' failed:`, lastError)

          // 如果不是最后一个 adapter，继续尝试下一个
          if (adapterName !== adapters[adapters.length - 1]) {
            console.log(`Trying next adapter...`)
            continue
          }
        }
      }

      // 所有 Adapters 都失败
      metrics.totalTime = Date.now() - startTime
      await this.reportMetrics(task, metrics).catch(() => {})

      return {
        success: false,
        error: lastError ?? 'All adapters failed'
      }
    } catch (error) {
      metrics.totalTime = Date.now() - startTime
      await this.reportMetrics(task, metrics).catch(() => {})

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 获取对话历史
   */
  private async getMessageHistory(channelId: string): Promise<Array<{
    role: 'user' | 'assistant'
    content: string
  }>> {
    try {
      return await this.backendGateway.getMessageHistory(channelId)
    } catch (error) {
      console.warn('Failed to get message history, using empty history:', error)
      return []
    }
  }

  /**
   * 生成响应
   */
  private async generateResponse(
    task: MessageTask,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    adapter: any
  ): Promise<string> {
    // 截断历史消息以适应上下文窗口
    const truncatedHistory = this.truncateHistory(history)

    // 添加当前消息到历史
    const messages = [
      ...truncatedHistory,
      {
        role: 'user' as const,
        content: task.content
      }
    ]

    // 获取系统提示
    const systemPrompt = this.getSystemPrompt(task)

    // 调用 LLM API（支持流式和所有回调）
    const response = await Promise.race([
      adapter.generateResponse({
        systemPrompt,
        messages,
        streaming: {
          onThinking: async (chunk: string) => {
            await this.pushChunk(task, chunk).catch(err => {
              console.warn('Failed to push thinking chunk:', err)
            })
          },
          onToolUse: async (toolLog: any) => {
            await this.pushToolUse(task, toolLog).catch(err => {
              console.warn('Failed to push tool use:', err)
            })
          },
          onUsage: async (usage: any) => {
            await this.recordUsage(task, usage).catch(err => {
              console.warn('Failed to record usage:', err)
            })
          },
          onStatusChange: async (status: string) => {
            await this.updateStatus(task, status).catch(err => {
              console.warn('Failed to update status:', err)
            })
          }
        }
      }),
      this.createTimeout()
    ])

    if (typeof response !== 'string') {
      throw new Error('Request timeout')
    }

    return response
  }

  /**
   * 推送响应 chunk
   */
  private async pushChunk(task: MessageTask, chunk: string): Promise<void> {
    try {
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk
      })
    } catch (error) {
      // 记录失败的 chunks，稍后重试
      const chunks = this.failedChunks.get(task.messageId) ?? []
      chunks.push(chunk)
      this.failedChunks.set(task.messageId, chunks)
      console.warn('Failed to push chunk, will retry later:', error)
    }
  }

  /**
   * 保存响应
   */
  private async saveResponse(
    task: MessageTask,
    content: string,
    metrics: any
  ): Promise<void> {
    // 重试失败的 chunks
    const failedChunks = this.failedChunks.get(task.messageId)
    if (failedChunks && failedChunks.length > 0) {
      console.log(`Retrying ${failedChunks.length} failed chunks`)
      for (const chunk of failedChunks) {
        await this.pushChunk(task, chunk).catch(() => {
          // 最终失败也不影响主流程
        })
      }
      this.failedChunks.delete(task.messageId)
    }

    // 保存响应，包含元数据
    await this.backendGateway.saveAgentResponse({
      channelId: task.channelId,
      messageId: task.messageId,
      content,
      metadata: {
        executionMode: 'device',
        adapter: metrics.adapterUsed,
        timestamp: new Date().toISOString(),
        processingTime: metrics.totalTime,
        historyFetchTime: metrics.historyFetchTime,
        llmCallTime: metrics.llmCallTime,
        responseSaveTime: metrics.responseSaveTime
      }
    })
  }

  /**
   * 创建超时 Promise
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.timeout}ms`))
      }, this.timeout)
    })
  }

  /**
   * 获取系统提示
   */
  private getSystemPrompt(task: MessageTask): string {
    // 优先级：任务级 > 配置级 > 默认
    return (task as any).systemPrompt ?? this.defaultSystemPrompt
  }

  /**
   * 截断历史消息以适应上下文窗口
   */
  private truncateHistory(
    history: Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    if (history.length <= this.maxHistoryMessages) {
      return history
    }

    // 保留最近的 maxHistoryMessages 条消息
    const truncated = history.slice(-this.maxHistoryMessages)
    console.log(
      `Truncated history from ${history.length} to ${truncated.length} messages`
    )
    return truncated
  }

  /**
   * 推送工具使用日志
   */
  private async pushToolUse(task: MessageTask, toolLog: any): Promise<void> {
    try {
      // 通过 pushResponseChunk 发送工具使用日志
      // 使用特殊格式标记为工具日志
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({
          type: 'tool_use',
          data: toolLog
        })
      })
    } catch (error) {
      console.warn('Failed to push tool use:', error)
    }
  }

  /**
   * 记录使用量统计
   */
  private async recordUsage(task: MessageTask, usage: any): Promise<void> {
    try {
      // 通过 pushResponseChunk 发送使用量统计
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({
          type: 'usage',
          data: usage
        })
      })
    } catch (error) {
      console.warn('Failed to record usage:', error)
    }
  }

  /**
   * 更新处理状态
   */
  private async updateStatus(task: MessageTask, status: string): Promise<void> {
    try {
      // 通过 pushResponseChunk 发送状态更新
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({
          type: 'status',
          data: { status }
        })
      })
    } catch (error) {
      console.warn('Failed to update status:', error)
    }
  }

  /**
   * 上报性能指标
   */
  private async reportMetrics(task: MessageTask, metrics: any): Promise<void> {
    try {
      // 通过 pushResponseChunk 发送性能指标
      await this.backendGateway.pushResponseChunk({
        channelId: task.channelId,
        messageId: task.messageId,
        chunk: JSON.stringify({
          type: 'metrics',
          data: metrics
        })
      })
    } catch (error) {
      console.warn('Failed to report metrics:', error)
    }
  }
}
