/**
 * Execution Mode Router
 *
 * 执行模式路由器实现
 */

import type { IExecutionModeRouter, Message } from './execution-mode-router.interface'
import type { IFeatureFlag, ExecutionMode } from '../feature-flag/feature-flag.interface'
import crypto from 'crypto'

/**
 * 执行模式路由器
 */
export class ExecutionModeRouter implements IExecutionModeRouter {
  constructor(private featureFlag: IFeatureFlag) {}

  async getMode(realmId: string): Promise<ExecutionMode> {
    return this.featureFlag.getMode(realmId)
  }

  async routeMessage(message: Message): Promise<ExecutionMode> {
    // 检查是否应该使用新模式
    const useNewMode = await this.shouldUseNewMode(message.realmId)

    if (useNewMode) {
      return 'device'
    }

    return 'backend'
  }

  async switchMode(realmId: string, mode: ExecutionMode): Promise<void> {
    await this.featureFlag.setMode(realmId, mode)
  }

  async shouldUseNewMode(realmId: string): Promise<boolean> {
    // 1. 获取配置
    const config = await this.featureFlag.getConfig(realmId)

    // 2. 如果没有配置或未启用，使用旧模式
    if (!config || !config.enabled) {
      return false
    }

    // 3. 如果模式是 backend，使用旧模式
    if (config.mode === 'backend') {
      return false
    }

    // 4. 如果模式是 device，检查灰度百分比
    if (config.rolloutPercentage < 100) {
      // 使用一致性哈希确定是否在灰度范围内
      const hash = this.hashRealmId(realmId)
      return hash % 100 < config.rolloutPercentage
    }

    // 5. 100% 灰度，使用新模式
    return true
  }

  /**
   * 计算 Realm ID 的哈希值（用于一致性灰度）
   * @param realmId Realm ID
   * @returns 哈希值（0-99）
   */
  private hashRealmId(realmId: string): number {
    const hash = crypto.createHash('md5').update(realmId).digest('hex')
    // 取前 8 位转换为数字，然后取模 100
    return parseInt(hash.substring(0, 8), 16) % 100
  }
}
