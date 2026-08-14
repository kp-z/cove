/**
 * Message Processor Interface
 *
 * 消息处理器接口：定义消息处理的统一接口
 */

import type { MessageTask } from './message-orchestrator.interface'

/**
 * 消息处理结果
 */
export interface ProcessResult {
  success: boolean
  aborted?: boolean
  error?: string
}

/**
 * 消息处理器接口
 */
export interface IMessageProcessor {
  /**
   * 处理消息任务
   * @param task 消息任务
   * @returns 处理结果
   */
  process(task: MessageTask): Promise<ProcessResult>
}
