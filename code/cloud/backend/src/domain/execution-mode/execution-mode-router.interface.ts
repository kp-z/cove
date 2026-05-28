/**
 * Execution Mode Router Interface
 *
 * 执行模式路由器：根据 Feature Flag 配置路由消息到对应的执行模式
 *
 * 职责：
 * - 获取 Realm 的执行模式
 * - 路由消息到对应的执行模式
 * - 支持灰度发布（按百分比）
 * - 切换执行模式
 */

import type { ExecutionMode } from '../feature-flag/feature-flag.interface'

/**
 * 消息（简化版，用于路由）
 */
export interface Message {
  messageId: string
  channelId: string
  realmId: string
  content: string
}

/**
 * 执行模式路由器接口
 */
export interface IExecutionModeRouter {
  /**
   * 获取 Realm 的执行模式
   * @param realmId Realm ID
   * @returns 执行模式
   */
  getMode(realmId: string): Promise<ExecutionMode>

  /**
   * 路由消息到对应的执行模式
   * @param message 消息
   * @returns 执行模式
   */
  routeMessage(message: Message): Promise<ExecutionMode>

  /**
   * 切换执行模式
   * @param realmId Realm ID
   * @param mode 执行模式
   */
  switchMode(realmId: string, mode: ExecutionMode): Promise<void>

  /**
   * 检查是否应该使用新模式（灰度逻辑）
   * @param realmId Realm ID
   * @returns 是否使用新模式
   */
  shouldUseNewMode(realmId: string): Promise<boolean>
}
