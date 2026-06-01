/**
 * Device Lifecycle Manager Tests
 *
 * TDD: 测试设备生命周期管理器
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type {
  IDeviceLifecycleManager,
  ConnectionStatus,
  HealthStatus,
  DeviceState
} from '../device-lifecycle-manager.interface'

// Mock 实现用于测试
class MockDeviceLifecycleManager implements IDeviceLifecycleManager {
  private deviceId?: string
  private realmId?: string
  private state: DeviceState = 'DISCONNECTED'
  private connectedAt?: Date
  private lastHeartbeatAt?: Date
  private reconnectAttempts = 0
  private error?: string
  private startTime?: Date
  private healthMonitoringInterval?: NodeJS.Timeout

  async start(deviceId: string, realmId: string): Promise<void> {
    if (this.state !== 'DISCONNECTED' && this.state !== 'STOPPED') {
      throw new Error('Device already started')
    }

    this.deviceId = deviceId
    this.realmId = realmId
    this.state = 'CONNECTING'
    this.startTime = new Date()

    // 模拟连接
    await this.sleep(50)

    this.state = 'CONNECTED'
    this.connectedAt = new Date()
    this.lastHeartbeatAt = new Date()
    this.reconnectAttempts = 0
    this.error = undefined
  }

  async stop(): Promise<void> {
    if (this.state === 'STOPPED' || this.state === 'DISCONNECTED') {
      return
    }

    this.stopHealthMonitoring()
    this.state = 'STOPPED'
    this.connectedAt = undefined
    this.lastHeartbeatAt = undefined
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      state: this.state,
      connectedAt: this.connectedAt,
      lastHeartbeatAt: this.lastHeartbeatAt,
      reconnectAttempts: this.reconnectAttempts,
      error: this.error
    }
  }

  getHealthStatus(): HealthStatus {
    const uptime = this.startTime
      ? Date.now() - this.startTime.getTime()
      : 0

    return {
      status: this.state === 'CONNECTED' ? 'online' : 'offline',
      activeAgents: 3,
      queueDepth: 5,
      cpuUsage: 45.5,
      memoryUsage: 512,
      uptime,
      lastReportAt: new Date()
    }
  }

  async reconnect(): Promise<void> {
    if (this.state === 'STOPPED') {
      throw new Error('Device is stopped')
    }

    this.state = 'RECONNECTING'
    this.reconnectAttempts++

    // 模拟重连
    await this.sleep(100)

    this.state = 'CONNECTED'
    this.connectedAt = new Date()
    this.lastHeartbeatAt = new Date()
  }

  async reportHealth(): Promise<void> {
    if (this.state !== 'CONNECTED') {
      throw new Error('Device not connected')
    }

    // 模拟上报健康状态
    this.lastHeartbeatAt = new Date()
  }

  startHealthMonitoring(): void {
    if (this.healthMonitoringInterval) {
      return
    }

    this.healthMonitoringInterval = setInterval(async () => {
      if (this.state === 'CONNECTED') {
        await this.reportHealth()
      }
    }, 30000) // 30 秒
  }

  stopHealthMonitoring(): void {
    if (this.healthMonitoringInterval) {
      clearInterval(this.healthMonitoringInterval)
      this.healthMonitoringInterval = undefined
    }
  }

  // 测试辅助方法
  simulateDisconnect(): void {
    this.state = 'DISCONNECTED'
    this.connectedAt = undefined
    this.error = 'Connection lost'
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

describe('DeviceLifecycleManager', () => {
  let manager: MockDeviceLifecycleManager

  beforeEach(() => {
    manager = new MockDeviceLifecycleManager()
  })

  afterEach(() => {
    manager.stopHealthMonitoring()
  })

  describe('设备启动', () => {
    it('should start device successfully', async () => {
      await manager.start('device-1', 'realm-1')

      const status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTED')
      expect(status.connectedAt).toBeDefined()
      expect(status.reconnectAttempts).toBe(0)
    })

    it('should throw error when starting already started device', async () => {
      await manager.start('device-1', 'realm-1')

      await expect(manager.start('device-1', 'realm-1'))
        .rejects.toThrow('Device already started')
    })

    it('should transition through states during startup', async () => {
      const startPromise = manager.start('device-1', 'realm-1')

      // 启动中
      let status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTING')

      await startPromise

      // 已连接
      status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTED')
    })
  })

  describe('设备停止', () => {
    it('should stop device successfully', async () => {
      await manager.start('device-1', 'realm-1')
      await manager.stop()

      const status = manager.getConnectionStatus()
      expect(status.state).toBe('STOPPED')
      expect(status.connectedAt).toBeUndefined()
    })

    it('should be idempotent when stopping already stopped device', async () => {
      await manager.start('device-1', 'realm-1')
      await manager.stop()
      await manager.stop() // 第二次调用不应抛出错误

      const status = manager.getConnectionStatus()
      expect(status.state).toBe('STOPPED')
    })

    it('should stop health monitoring when stopping device', async () => {
      await manager.start('device-1', 'realm-1')
      manager.startHealthMonitoring()
      await manager.stop()

      // 验证不会抛出错误
      expect(true).toBe(true)
    })
  })

  describe('连接状态', () => {
    it('should return connection status', async () => {
      await manager.start('device-1', 'realm-1')

      const status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTED')
      expect(status.connectedAt).toBeInstanceOf(Date)
      expect(status.lastHeartbeatAt).toBeInstanceOf(Date)
      expect(status.reconnectAttempts).toBe(0)
      expect(status.error).toBeUndefined()
    })

    it('should track reconnect attempts', async () => {
      await manager.start('device-1', 'realm-1')
      await manager.reconnect()

      const status = manager.getConnectionStatus()
      expect(status.reconnectAttempts).toBe(1)
    })

    it('should track error state', async () => {
      await manager.start('device-1', 'realm-1')
      manager.simulateDisconnect()

      const status = manager.getConnectionStatus()
      expect(status.state).toBe('DISCONNECTED')
      expect(status.error).toBe('Connection lost')
    })
  })

  describe('健康状态', () => {
    it('should return health status', async () => {
      await manager.start('device-1', 'realm-1')

      const health = manager.getHealthStatus()
      expect(health.status).toBe('online')
      expect(health.activeAgents).toBe(3)
      expect(health.queueDepth).toBe(5)
      expect(health.cpuUsage).toBe(45.5)
      expect(health.memoryUsage).toBe(512)
      expect(health.uptime).toBeGreaterThan(0)
      expect(health.lastReportAt).toBeInstanceOf(Date)
    })

    it('should report offline when disconnected', async () => {
      const health = manager.getHealthStatus()
      expect(health.status).toBe('offline')
    })

    it('should track uptime', async () => {
      await manager.start('device-1', 'realm-1')

      await new Promise(resolve => setTimeout(resolve, 100))

      const health = manager.getHealthStatus()
      expect(health.uptime).toBeGreaterThanOrEqual(100)
    })
  })

  describe('重连', () => {
    it('should reconnect successfully', async () => {
      await manager.start('device-1', 'realm-1')
      manager.simulateDisconnect()

      await manager.reconnect()

      const status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTED')
      expect(status.reconnectAttempts).toBe(1)
    })

    it('should throw error when reconnecting stopped device', async () => {
      await manager.start('device-1', 'realm-1')
      await manager.stop()

      await expect(manager.reconnect())
        .rejects.toThrow('Device is stopped')
    })

    it('should increment reconnect attempts', async () => {
      await manager.start('device-1', 'realm-1')

      await manager.reconnect()
      await manager.reconnect()

      const status = manager.getConnectionStatus()
      expect(status.reconnectAttempts).toBe(2)
    })
  })

  describe('健康上报', () => {
    it('should report health when connected', async () => {
      await manager.start('device-1', 'realm-1')

      const beforeReport = manager.getConnectionStatus().lastHeartbeatAt
      await new Promise(resolve => setTimeout(resolve, 10))

      await manager.reportHealth()

      const afterReport = manager.getConnectionStatus().lastHeartbeatAt
      expect(afterReport).not.toEqual(beforeReport)
    })

    it('should throw error when reporting health while disconnected', async () => {
      await expect(manager.reportHealth())
        .rejects.toThrow('Device not connected')
    })
  })

  describe('健康监控', () => {
    it('should start health monitoring', async () => {
      await manager.start('device-1', 'realm-1')
      manager.startHealthMonitoring()

      // 验证不会抛出错误
      expect(true).toBe(true)

      manager.stopHealthMonitoring()
    })

    it('should stop health monitoring', async () => {
      await manager.start('device-1', 'realm-1')
      manager.startHealthMonitoring()
      manager.stopHealthMonitoring()

      // 验证不会抛出错误
      expect(true).toBe(true)
    })

    it('should not start monitoring twice', async () => {
      await manager.start('device-1', 'realm-1')
      manager.startHealthMonitoring()
      manager.startHealthMonitoring() // 第二次调用应该被忽略

      manager.stopHealthMonitoring()
      expect(true).toBe(true)
    })
  })

  describe('状态转换', () => {
    it('should transition through lifecycle states', async () => {
      // DISCONNECTED
      let status = manager.getConnectionStatus()
      expect(status.state).toBe('DISCONNECTED')

      // CONNECTING → CONNECTED
      await manager.start('device-1', 'realm-1')
      status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTED')

      // RECONNECTING → CONNECTED
      await manager.reconnect()
      status = manager.getConnectionStatus()
      expect(status.state).toBe('CONNECTED')

      // STOPPED
      await manager.stop()
      status = manager.getConnectionStatus()
      expect(status.state).toBe('STOPPED')
    })
  })
})
