/**
 * Device Processor
 *
 * Device 模式处理器：在本地调用 LLM API 处理消息
 */

import type { IMessageProcessor, ProcessResult } from './message-processor.interface'
import type { MessageTask } from './message-orchestrator.interface'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { IAdapterManager } from '../../infrastructure/adapters/adapter-manager.interface'

/**
 * Device 处理器配置
 */
export interface DeviceProcessorConfig {
  timeout?: number
  defaultAdapter?: string
}

/**
 * Device 模式处理器
 */
export class DeviceProcessor implements IMessageProcessor {
  private readonly timeout: number
  private readonly defaultAdapter: string

  constructor(
    private readonly backendGateway: BackendGateway,
    private readonly adapterManager: IAdapterManager,
    config: DeviceProcessorConfig = {}
  ) {
    this.timeout = config.timeout ?? 30000
    this.defaultAdapter = config.defaultAdapter ?? 'anthropic-adapter'
  }

  /**
   * 处理消息任务
   */
  async process(task: MessageTask): Promise<ProcessResult> {
    try {
      // 1. 获取对话历史
      const history = await this.getMessageHistory(task.channelId)

      // 2. 获取 LLM Adapter
      const adapter = await this.adapterManager.getAdapter(this.defaultAdapter)
      if (!adapter) {
        return {
          success: false,
          error: `Adapter '${this.defaultAdapter}' not found`
        }
      }

      // 3. 调用 LLM API 生成响应
      const response = await this.generateResponse(task, history, adapter)

      // 4. 保存响应到 Backend
      await this.saveResponse(task, response)

      return {
        success: true
      }
    } catch (error) {
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
    // 添加当前消息到历史
    const messages = [
      ...history,
      {
        role: 'user' as const,
        content: task.content
      }
    ]

    // 调用 LLM API（支持流式）
    const response = await Promise.race([
      adapter.generateResponse({
        systemPrompt: 'You are a helpful assistant.',
        messages,
        streaming: {
          onThinking: async (chunk: string) => {
            // 推送 thinking chunk 到 Backend
            await this.pushChunk(task, chunk).catch(err => {
              console.warn('Failed to push thinking chunk:', err)
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
      // 推送失败不影响主流程
      console.warn('Failed to push chunk:', error)
    }
  }

  /**
   * 保存响应
   */
  private async saveResponse(task: MessageTask, content: string): Promise<void> {
    await this.backendGateway.saveAgentResponse({
      channelId: task.channelId,
      messageId: task.messageId,
      content
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
}
