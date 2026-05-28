/**
 * Backend Processor
 *
 * Backend 模式处理器：在 Cloud Backend 本地调用 LLM API 处理消息
 */

import type { IMessageProcessor, ProcessResult } from './message-processor.interface'
import type { MessageTask } from './message-orchestrator.interface'
import type { IMessageRepository } from '../../application/interfaces/repositories/message.repository.interface'
import type { LlmAdapter, ChatMessage } from '../../infrastructure/adapters/llm/llm-adapter.interface'

/**
 * Backend 处理器配置
 */
export interface BackendProcessorConfig {
  timeout?: number
  defaultAdapter?: string
  systemPrompt?: string
}

/**
 * Backend 处理器依赖
 */
export interface BackendProcessorDependencies {
  messageRepository: IMessageRepository
  llmAdapter: LlmAdapter
}

/**
 * Backend 模式处理器
 */
export class BackendProcessor implements IMessageProcessor {
  private readonly timeout: number
  private readonly systemPrompt: string

  constructor(
    private readonly dependencies: BackendProcessorDependencies,
    config: BackendProcessorConfig = {}
  ) {
    this.timeout = config.timeout ?? 30000
    this.systemPrompt = config.systemPrompt ?? 'You are a helpful assistant.'
  }

  /**
   * 处理消息任务
   */
  async process(task: MessageTask): Promise<ProcessResult> {
    try {
      // 1. 获取对话历史
      const history = await this.getMessageHistory(task.channelId, task.realmId)

      // 2. 调用 LLM API 生成响应
      const response = await this.generateResponse(task, history)

      // 3. 保存响应到数据库
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
  private async getMessageHistory(channelId: string, realmId: string): Promise<ChatMessage[]> {
    try {
      const messages = await this.dependencies.messageRepository.findByChannel(channelId, 50)

      return messages.map(msg => ({
        role: msg.senderId === 'system' ? 'assistant' : 'user',
        content: msg.content
      }))
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
    history: ChatMessage[]
  ): Promise<string> {
    const messages: ChatMessage[] = [
      ...history,
      {
        role: 'user',
        content: task.content
      }
    ]

    const response = await Promise.race([
      this.dependencies.llmAdapter.generateResponse({
        systemPrompt: this.systemPrompt,
        messages,
        streaming: {
          onThinking: async (chunk: string) => {
            // 流式响应回调（可选）
            console.debug('Thinking chunk:', chunk.substring(0, 50))
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
   * 保存响应
   */
  private async saveResponse(task: MessageTask, content: string): Promise<void> {
    const { MessageEntity } = await import('../../domain/models/message/message.entity')

    // 创建响应消息实体
    const responseMessage = MessageEntity.create({
      messageId: `${task.messageId}-response`,
      realmId: task.realmId,
      msgShortId: `msg-${Date.now()}`,
      senderId: 'system',
      senderType: 'agent',
      senderName: 'AI Assistant',
      channelId: task.channelId,
      channelName: '',
      isThreadRoot: false,
      content,
      contentType: 'text',
      contentFormat: 'markdown',
      attachments: [],
      mentions: [],
      references: [],
      status: 'sent',
      isEdited: false,
      editHistory: [],
      reactions: [],
      agentExecutionMetadata: {
        thinking: '',
        tool_logs: [],
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      meta: {
        client: 'backend-processor',
        isPinned: false,
        isImportant: false
      }
    })

    await this.dependencies.messageRepository.save(responseMessage, task.realmId)
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
