/**
 * Backend Processor
 *
 * Backend 模式处理器：将消息转发到 Backend 处理
 */

import type { IMessageProcessor, ProcessResult } from './message-processor.interface'
import type { MessageTask } from './message-orchestrator.interface'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'

/**
 * Backend 处理器配置
 */
export interface BackendProcessorConfig {
  timeout?: number
  pollInterval?: number
}

/**
 * Backend 模式处理器
 */
export class BackendProcessor implements IMessageProcessor {
  private readonly timeout: number
  private readonly pollInterval: number

  constructor(
    private readonly backendGateway: BackendGateway,
    config: BackendProcessorConfig = {}
  ) {
    this.timeout = config.timeout ?? 60000 // 60 秒超时
    this.pollInterval = config.pollInterval ?? 1000 // 1 秒轮询间隔
  }

  /**
   * 处理消息任务
   */
  async process(task: MessageTask): Promise<ProcessResult> {
    try {
      // 1. 转发消息到 Backend
      await this.sendToBackend(task)

      // 2. Backend 模式下，消息已转发，直接返回成功
      // Backend 会自行处理消息并保存响应
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
   * 发送消息到 Backend
   */
  private async sendToBackend(task: MessageTask): Promise<void> {
    await this.backendGateway.sendMessageToBackend({
      channelId: task.channelId,
      content: task.content,
      metadata: {
        messageId: task.messageId,
        executionMode: 'backend'
      }
    })
  }
}
