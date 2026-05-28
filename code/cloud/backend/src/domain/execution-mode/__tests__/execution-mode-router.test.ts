/**
 * Execution Mode Router Tests
 *
 * 测试执行模式路由器
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ExecutionModeRouter } from '../execution-mode-router'
import type { IFeatureFlag, FeatureFlagConfig, ExecutionMode } from '../../feature-flag/feature-flag.interface'
import type { Message } from '../execution-mode-router.interface'

// Mock Feature Flag
class MockFeatureFlag implements IFeatureFlag {
  private configs: Map<string, FeatureFlagConfig> = new Map()

  async enable(realmId: string, flagName: string): Promise<void> {
    const config = this.configs.get(realmId) || this.createDefaultConfig(realmId)
    config.enabled = true
    this.configs.set(realmId, config)
  }

  async disable(realmId: string, flagName: string): Promise<void> {
    const config = this.configs.get(realmId)
    if (config) {
      config.enabled = false
    }
  }

  async isEnabled(realmId: string, flagName: string): Promise<boolean> {
    return this.configs.get(realmId)?.enabled ?? false
  }

  async getMode(realmId: string): Promise<ExecutionMode> {
    return this.configs.get(realmId)?.mode ?? 'backend'
  }

  async setMode(realmId: string, mode: ExecutionMode): Promise<void> {
    const config = this.configs.get(realmId) || this.createDefaultConfig(realmId)
    config.mode = mode
    this.configs.set(realmId, config)
  }

  async setRolloutPercentage(realmId: string, percentage: number): Promise<void> {
    const config = this.configs.get(realmId) || this.createDefaultConfig(realmId)
    config.rolloutPercentage = percentage
    this.configs.set(realmId, config)
  }

  async getConfig(realmId: string): Promise<FeatureFlagConfig | null> {
    return this.configs.get(realmId) || null
  }

  private createDefaultConfig(realmId: string): FeatureFlagConfig {
    return {
      realmId,
      flagName: 'llm-execution-mode',
      enabled: true,
      mode: 'backend',
      rolloutPercentage: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // Test helper
  clear(): void {
    this.configs.clear()
  }
}

describe('ExecutionModeRouter', () => {
  let featureFlag: MockFeatureFlag
  let router: ExecutionModeRouter

  beforeEach(() => {
    featureFlag = new MockFeatureFlag()
    router = new ExecutionModeRouter(featureFlag)
  })

  const createMessage = (realmId: string): Message => ({
    messageId: 'msg-1',
    channelId: 'channel-1',
    realmId,
    content: 'Test message'
  })

  describe('getMode', () => {
    it('should return backend mode by default', async () => {
      const mode = await router.getMode('realm-1')
      expect(mode).toBe('backend')
    })

    it('should return configured mode', async () => {
      await featureFlag.setMode('realm-1', 'device')

      const mode = await router.getMode('realm-1')
      expect(mode).toBe('device')
    })
  })

  describe('routeMessage', () => {
    it('should route to backend when feature flag is disabled', async () => {
      await featureFlag.setMode('realm-1', 'device')
      await featureFlag.disable('realm-1', 'llm-execution-mode')

      const mode = await router.routeMessage(createMessage('realm-1'))
      expect(mode).toBe('backend')
    })

    it('should route to backend when mode is backend', async () => {
      await featureFlag.setMode('realm-1', 'backend')
      await featureFlag.enable('realm-1', 'llm-execution-mode')

      const mode = await router.routeMessage(createMessage('realm-1'))
      expect(mode).toBe('backend')
    })

    it('should route to device when mode is device and 100% rollout', async () => {
      await featureFlag.setMode('realm-1', 'device')
      await featureFlag.enable('realm-1', 'llm-execution-mode')
      await featureFlag.setRolloutPercentage('realm-1', 100)

      const mode = await router.routeMessage(createMessage('realm-1'))
      expect(mode).toBe('device')
    })

    it('should route to backend when no config exists', async () => {
      const mode = await router.routeMessage(createMessage('non-existent'))
      expect(mode).toBe('backend')
    })
  })

  describe('switchMode', () => {
    it('should switch mode from backend to device', async () => {
      await router.switchMode('realm-1', 'backend')
      expect(await router.getMode('realm-1')).toBe('backend')

      await router.switchMode('realm-1', 'device')
      expect(await router.getMode('realm-1')).toBe('device')
    })

    it('should switch mode from device to backend', async () => {
      await router.switchMode('realm-1', 'device')
      expect(await router.getMode('realm-1')).toBe('device')

      await router.switchMode('realm-1', 'backend')
      expect(await router.getMode('realm-1')).toBe('backend')
    })
  })

  describe('shouldUseNewMode', () => {
    it('should return false when no config exists', async () => {
      const result = await router.shouldUseNewMode('non-existent')
      expect(result).toBe(false)
    })

    it('should return false when feature flag is disabled', async () => {
      await featureFlag.setMode('realm-1', 'device')
      await featureFlag.disable('realm-1', 'llm-execution-mode')

      const result = await router.shouldUseNewMode('realm-1')
      expect(result).toBe(false)
    })

    it('should return false when mode is backend', async () => {
      await featureFlag.setMode('realm-1', 'backend')
      await featureFlag.enable('realm-1', 'llm-execution-mode')

      const result = await router.shouldUseNewMode('realm-1')
      expect(result).toBe(false)
    })

    it('should return true when mode is device and 100% rollout', async () => {
      await featureFlag.setMode('realm-1', 'device')
      await featureFlag.enable('realm-1', 'llm-execution-mode')
      await featureFlag.setRolloutPercentage('realm-1', 100)

      const result = await router.shouldUseNewMode('realm-1')
      expect(result).toBe(true)
    })

    it('should return false when mode is device and 0% rollout', async () => {
      await featureFlag.setMode('realm-1', 'device')
      await featureFlag.enable('realm-1', 'llm-execution-mode')
      await featureFlag.setRolloutPercentage('realm-1', 0)

      const result = await router.shouldUseNewMode('realm-1')
      expect(result).toBe(false)
    })
  })

  describe('gradual rollout', () => {
    it('should use consistent hashing for gradual rollout', async () => {
      await featureFlag.setMode('realm-1', 'device')
      await featureFlag.enable('realm-1', 'llm-execution-mode')
      await featureFlag.setRolloutPercentage('realm-1', 50)

      // 同一个 realm 应该总是返回相同的结果
      const result1 = await router.shouldUseNewMode('realm-1')
      const result2 = await router.shouldUseNewMode('realm-1')
      const result3 = await router.shouldUseNewMode('realm-1')

      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
    })

    it('should distribute realms according to rollout percentage', async () => {
      const rolloutPercentage = 50
      await featureFlag.setRolloutPercentage('test', rolloutPercentage)

      // 测试 100 个不同的 realm
      const results: boolean[] = []
      for (let i = 0; i < 100; i++) {
        await featureFlag.setMode(`realm-${i}`, 'device')
        await featureFlag.enable(`realm-${i}`, 'llm-execution-mode')
        await featureFlag.setRolloutPercentage(`realm-${i}`, rolloutPercentage)

        const result = await router.shouldUseNewMode(`realm-${i}`)
        results.push(result)
      }

      // 统计使用新模式的比例
      const newModeCount = results.filter(r => r).length
      const actualPercentage = newModeCount

      // 允许 ±15% 的误差（因为样本量较小）
      expect(actualPercentage).toBeGreaterThanOrEqual(rolloutPercentage - 15)
      expect(actualPercentage).toBeLessThanOrEqual(rolloutPercentage + 15)
    })

    it('should handle 10% rollout', async () => {
      const rolloutPercentage = 10

      const results: boolean[] = []
      for (let i = 0; i < 100; i++) {
        await featureFlag.setMode(`realm-${i}`, 'device')
        await featureFlag.enable(`realm-${i}`, 'llm-execution-mode')
        await featureFlag.setRolloutPercentage(`realm-${i}`, rolloutPercentage)

        const result = await router.shouldUseNewMode(`realm-${i}`)
        results.push(result)
      }

      const newModeCount = results.filter(r => r).length
      const actualPercentage = newModeCount

      // 10% 灰度，允许 0-20% 的范围
      expect(actualPercentage).toBeGreaterThanOrEqual(0)
      expect(actualPercentage).toBeLessThanOrEqual(20)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete rollout lifecycle', async () => {
      const message = createMessage('realm-1')

      // 1. 初始状态：backend 模式
      expect(await router.routeMessage(message)).toBe('backend')

      // 2. 切换到 device 模式，0% 灰度
      await router.switchMode('realm-1', 'device')
      await featureFlag.enable('realm-1', 'llm-execution-mode')
      await featureFlag.setRolloutPercentage('realm-1', 0)
      expect(await router.routeMessage(message)).toBe('backend')

      // 3. 增加到 100% 灰度
      await featureFlag.setRolloutPercentage('realm-1', 100)
      expect(await router.routeMessage(message)).toBe('device')

      // 4. 回滚到 backend 模式
      await router.switchMode('realm-1', 'backend')
      expect(await router.routeMessage(message)).toBe('backend')
    })

    it('should handle multiple realms independently', async () => {
      // Realm 1: backend 模式
      await router.switchMode('realm-1', 'backend')

      // Realm 2: device 模式，100% 灰度
      await router.switchMode('realm-2', 'device')
      await featureFlag.enable('realm-2', 'llm-execution-mode')
      await featureFlag.setRolloutPercentage('realm-2', 100)

      // 验证路由
      expect(await router.routeMessage(createMessage('realm-1'))).toBe('backend')
      expect(await router.routeMessage(createMessage('realm-2'))).toBe('device')
    })
  })
})
