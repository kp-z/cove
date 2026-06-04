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
import type { LlmAdapter } from '../../infrastructure/adapters/llm/llm-adapter.interface'
import {
  PostProcessorManager,
  ValidationPostProcessor,
  FormattingPostProcessor,
  MetadataExtractionPostProcessor
} from './post-processors'
import { DeduplicationManager } from './deduplication'
import {
  MetadataCollectorFactory,
  ResilientTransmissionStrategy,
  type ExecutionMetadata
} from './execution-metadata'

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
  enableMetadataPooling?: boolean
  metadataPoolSize?: number
  enableTransmissionRetry?: boolean
  maxTransmissionRetries?: number
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
  private readonly postProcessorManager: PostProcessorManager | undefined
  private readonly deduplicationManager: DeduplicationManager | undefined
  private readonly collectorFactory: MetadataCollectorFactory
  private readonly transmissionStrategy: ResilientTransmissionStrategy

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

    // 初始化 Metadata Collector Factory
    this.collectorFactory = new MetadataCollectorFactory({
      enablePooling: config.enableMetadataPooling ?? false,
      maxPoolSize: config.metadataPoolSize ?? 10
    })

    // 初始化 Transmission Strategy
    this.transmissionStrategy = new ResilientTransmissionStrategy(
      this.backendGateway,
      {
        enableRetry: config.enableTransmissionRetry ?? true,
        maxRetries: config.maxTransmissionRetries ?? 3
      }
    )
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

          // 构建简单的元数据（缓存响应）
          const cachedMetadata: ExecutionMetadata = {
            thinking: undefined,
            toolUses: [],
            usage: undefined,
            statusHistory: [
              { status: 'completed', timestamp: 0 }
            ],
            executionMode: 'batch',
            adapter: 'cache',
            timestamp: new Date().toISOString(),
            processingTime: metrics.totalTime
          }

          // 保存缓存的响应
          await this.saveResponse(task, cached.content, cachedMetadata)

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

          // 3. 调用 LLM API 生成响应（返回 response + metadata）
          const llmStart = Date.now()
          const { response: rawResponse, metadata: executionMetadata } = await this.generateResponse(task, history, adapter)
          metrics.llmCallTime = Date.now() - llmStart

          // 4. 后处理响应
          let response = rawResponse
          if (this.postProcessorManager) {
            const postProcessStart = Date.now()
            const postProcessResult = await this.postProcessorManager.process(
              rawResponse,
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

          // 5. 保存响应到 Backend（使用 ExecutionMetadata）
          const saveStart = Date.now()
          await this.saveResponse(task, response, executionMetadata)
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

      return {
        success: false,
        error: lastError ?? 'All adapters failed'
      }
    } catch (error) {
      metrics.totalTime = Date.now() - startTime

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
   * 生成响应（支持批量和流式双模式）
   */
  private async generateResponse(
    task: MessageTask,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    adapter: LlmAdapter
  ): Promise<{ response: string; metadata: ExecutionMetadata }> {
    const capabilities = adapter.getCapabilities()
    const truncatedHistory = this.truncateHistory(history)
    const messages = [
      ...truncatedHistory,
      {
        role: 'user' as const,
        content: task.content
      }
    ]
    const systemPrompt = this.getSystemPrompt(task)

    // 批量模式：Adapter 直接返回完整元数据（Claude CLI）
    if (capabilities.supportsBatchMetadata && adapter.generateBatchResponse) {
      console.log('[DeviceProcessor] Using batch mode for', this.defaultAdapter)

      const batch = await adapter.generateBatchResponse({
        systemPrompt,
        messages,
        maxTokens: undefined
      })

      // 可选：推送 usage 到 Backend（实时显示）
      if (batch.metadata.usage) {
        await this.transmissionStrategy.transmitUsage(
          task,
          batch.metadata.usage
        ).catch(() => {})
      }

      return { response: batch.content, metadata: batch.metadata }
    }

    // 流式模式：使用 Collector 收集元数据（Anthropic/OpenAI）
    console.log('[DeviceProcessor] Using streaming mode for', this.defaultAdapter)

    const collector = this.collectorFactory.create(
      this.defaultAdapter,
      'streaming'
    )

    try {
      const response = await Promise.race([
        adapter.generateResponse({
          systemPrompt,
          messages,
          streaming: this.createStreamingCallbacks(task, collector)
        }),
        this.createTimeout()
      ])

      if (typeof response !== 'string') {
        throw new Error('Request timeout')
      }

      const metadata = await collector.build()
      return { response, metadata }
    } finally {
      this.collectorFactory.release(collector)
    }
  }

  /**
   * 创建流式回调（封装 Collector + Transmission）
   */
  private createStreamingCallbacks(task: MessageTask, collector: any) {
    return {
      onThinking: async (chunk: string) => {
        // 收集元数据
        collector.recordThinking(chunk)

        // 传输到 Backend（错误隔离）
        await this.transmissionStrategy.transmitThinking(task, chunk)
      },

      onToolUse: async (toolLog: any) => {
        // 收集元数据
        collector.recordToolUse(toolLog)

        // 传输到 Backend
        await this.transmissionStrategy.transmitToolUse(task, toolLog)
      },

      onUsage: async (usage: any) => {
        // 收集元数据
        collector.recordUsage(usage)

        // 传输到 Backend
        await this.transmissionStrategy.transmitUsage(task, usage)
      },

      onStatusChange: async (status: string) => {
        // 收集元数据
        collector.recordStatus(status as any)

        // 传输到 Backend
        await this.transmissionStrategy.transmitStatus(task, status)
      }
    }
  }

  /**
   * 保存响应（使用强类型 ExecutionMetadata）
   */
  private async saveResponse(
    task: MessageTask,
    content: string,
    metadata: ExecutionMetadata
  ): Promise<void> {
    // 传输最终元数据（包含重试失败的传输）
    await this.transmissionStrategy.transmitFinalMetadata(task, metadata)

    // 保存响应
    await this.backendGateway.saveAgentResponse({
      channelId: task.channelId,
      messageId: task.messageId,
      content,
      metadata: {
        execution: metadata
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
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
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
}
