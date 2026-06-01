/**
 * Message Queue Interface
 *
 * 消息队列接口：负责消息任务的持久化队列管理
 */

import type { MessageTask } from '../../domain/agent-runtime/message-orchestrator.interface'

/**
 * 消息队列接口
 */
export interface IMessageQueue {
  /**
   * 将任务加入队列
   * @param task 消息任务
   * @returns 任务 ID
   */
  enqueue(task: MessageTask): Promise<string>

  /**
   * 从队列中取出并删除一个任务（按优先级和创建时间排序）
   * @returns 消息任务，如果队列为空则返回 null
   */
  dequeue(): Promise<MessageTask | null>

  /**
   * 查看队首任务（不删除）
   * @returns 消息任务，如果队列为空则返回 null
   */
  peek(): Promise<MessageTask | null>

  /**
   * 获取队列大小
   * @returns 队列中待处理任务的数量
   */
  size(): Promise<number>
}
