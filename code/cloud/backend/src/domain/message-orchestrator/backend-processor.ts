/**
 * Backend Processor
 *
 * Backend 模式处理器：通过 Backend 执行消息处理
 */

import type { IMessageProcessor, ProcessResult } from './message-processor.interface'
import type { MessageTask } from './message-orchestrator.interface'

/**
 * Backend 处理器配置
 */
export interface BackendProcessorConfig {
  timeout?: number
}

/**
 * Backend 模式处理器
 */
export class BackendProcessor implements IMessageProcessor {
  constructor(private readonly config: BackendProcessorConfig = {}) {}

  /**
   * 处理消息任务
   */
  async process(task: MessageTask): Promise<ProcessResult> {
    try {
      // TODO: 实现 Backend 模式处理逻辑
      // 1. 调用 Backend API
      // 2. 等待处理结果
      // 3. 返回结果

      // 模拟处理
      await this.simulateProcessing(task)

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
   * 模拟处理（占位符）
   */
  private async simulateProcessing(task: MessageTask): Promise<void> {
    // 模拟异步处理
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
