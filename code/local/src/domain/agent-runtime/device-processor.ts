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
import type { ILogger } from '../../infrastructure/logger'
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
  logger?: ILogger
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
  private readonly logger: ILogger

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly adapterManager: IAdapterManager,
    config: DeviceProcessorConfig = {}
  ) {
    this.logger = config.logger ?? {
      debug: () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      setLevel: () => {},
      scope: () => this.logger,
    }

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
        maxRetries: config.maxTransmissionRetries ?? 3,
        logger: this.logger.scope('Transmission'),
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

    // 可观测性：以 agentMessageId 作为贯穿三进程（前端/Backend/Local）的 correlation id，
    // 所有关键日志统一带上，便于一次 grep 还原整条消息链路。
    const corr = this.correlationFields(task)

    try {
      this.logger.info('🚀 Processing agent task', corr)

      // 1. 检查请求去重
      if (this.deduplicationManager) {
        const idempotencyKey = (task as any).idempotencyKey
        const cached = this.deduplicationManager.checkDuplicate(
          task.content,
          idempotencyKey
        )

        if (cached) {
          this.logger.debug('📨 Duplicate request — returning cached response', corr)
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
          this.logger.warn(`⚠️  Adapter not found`, { adapter: adapterName })
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
              this.logger.warn('⚠️  Response validation errors', { errors: postProcessResult.validationErrors })
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
          this.logger.warn(`⚠️  Adapter failed`, { adapter: adapterName, error: lastError })

          // 如果不是最后一个 adapter，继续尝试下一个
          if (adapterName !== adapters[adapters.length - 1]) {
            this.logger.info(`🔄 Falling back to next adapter`)
            continue
          }
        }
      }

      // 所有 Adapters 都失败
      metrics.totalTime = Date.now() - startTime

      const allFailedError = lastError ?? 'All adapters failed'
      this.logger.error('❌ All adapters failed for agent task', undefined, { ...corr, error: allFailedError })
      await this.reportFailure(task, allFailedError)

      return {
        success: false,
        error: allFailedError
      }
    } catch (error) {
      metrics.totalTime = Date.now() - startTime

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error('❌ Agent task processing threw', error as Error, corr)
      await this.reportFailure(task, errorMessage)

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * 可观测性：构造贯穿三进程的 correlation 日志字段。
   * 以 agentMessageId 为主关联键（与前端占位、流式事件、最终落库消息 id 一致）。
   */
  private correlationFields(task: MessageTask): Record<string, unknown> {
    return {
      agentMessageId: task.metadata?.agentMessageId || task.messageId,
      userMessageId: task.metadata?.userMessageId || task.messageId,
      channelId: task.channelId,
      agentId: task.metadata?.agentId,
    }
  }

  /**
   * 契约2：上报 agent 响应失败，触发后端发布 agent.response.failed 事件。
   * 使用服务端权威 agentMessageId，使前端占位消息正确进入失败态（而非 30s 超时误判）。
   * best-effort：上报失败不应掩盖原始错误。
   */
  private async reportFailure(task: MessageTask, error: string): Promise<void> {
    try {
      await this.backendGateway.reportAgentFailure({
        channelId: task.channelId,
        messageId: task.metadata?.agentMessageId || task.messageId,
        agentId: task.metadata?.agentId,
        error,
      })
    } catch (reportErr) {
      this.logger.warn('⚠️  Failed to report agent failure', {
        agentMessageId: task.metadata?.agentMessageId || task.messageId,
        error: (reportErr as Error).message,
      })
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
      this.logger.warn('⚠️  Failed to get message history, using empty history', { error: (error as Error).message })
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
      this.logger.debug(`🤖 [batch] Adapter: ${this.defaultAdapter}`)

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
    this.logger.debug(`🤖 [stream] Adapter: ${this.defaultAdapter}`)

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
    // 准备最终化（重试失败的传输）
    const { hadTransmissionFailures } = await this.transmissionStrategy.prepareFinalization(task)

    // 契约1：使用服务端预分配的权威 agentMessageId 落库，
    // 使最终持久化消息 id 与前端占位、流式事件中的 messageId 完全一致（幂等）。
    const agentMessageId = task.metadata?.agentMessageId || task.messageId

    // 契约 L4：将结构化执行元数据作为顶层 execution 传给网关，
    // 由网关映射为后端 saveResponse 期望的 schema；metadata 仅保留向后兼容的附加信息。
    await this.backendGateway.saveAgentResponse({
      channelId: task.channelId,
      messageId: agentMessageId,
      content,
      // 契约 L5：透传触发本次响应的 agentId，供后端 senderId 直接使用
      agentId: task.metadata?.agentId,
      execution: metadata,
      metadata: {
        hadTransmissionFailures
      }
    })

    this.logger.info('💾 Agent response saved', {
      agentMessageId,
      channelId: task.channelId,
      agentId: task.metadata?.agentId,
      hadTransmissionFailures,
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
    this.logger.debug(`History truncated`, { from: history.length, to: truncated.length })
    return truncated
  }
}
