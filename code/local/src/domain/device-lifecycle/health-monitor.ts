/**
 * Health Monitor
 *
 * 健康监控器：定期检查设备健康状态并上报到 Backend
 */

import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { DeviceHealth } from './device-lifecycle-manager.interface'

/**
 * 健康监控配置
 */
export interface HealthMonitorConfig {
  deviceId: string
  reportInterval?: number  // 上报间隔（毫秒）
  thresholds?: {
    cpuUsage?: number
    memoryUsage?: number
    errorRate?: number
  }
}

/**
 * 健康监控器
 */
export class HealthMonitor {
  private monitorTimer?: NodeJS.Timeout
  private lastHealth?: DeviceHealth

  constructor(
    private readonly config: HealthMonitorConfig,
    private readonly backendGateway: BackendGateway
  ) {}

  /**
   * 启动监控
   */
  start(): void {
    if (this.monitorTimer) {
      return
    }

    const interval = this.config.reportInterval ?? 60000  // 默认 60 秒

    this.monitorTimer = setInterval(async () => {
      await this.checkAndReport()
    }, interval)

    // 立即执行一次
    this.checkAndReport().catch(error => {
      console.error('Initial health check failed:', error)
    })
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer)
      this.monitorTimer = undefined
    }
  }

  /**
   * 获取当前健康状态
   */
  getHealth(): DeviceHealth {
    if (!this.lastHealth) {
      return {
        deviceId: this.config.deviceId,
        status: 'unhealthy',
        lastCheckAt: new Date()
      }
    }

    return this.lastHealth
  }

  /**
   * 检查并上报健康状态
   */
  private async checkAndReport(): Promise<void> {
    try {
      // 收集健康指标
      const health = await this.collectMetrics()

      // 评估健康状态
      const status = this.evaluateHealth(health)

      // 更新本地状态
      this.lastHealth = {
        ...health,
        status,
        lastCheckAt: new Date()
      }

      // 上报到 Backend
      await this.backendGateway.reportHealth({
        deviceId: this.config.deviceId,
        status,
        metrics: health.metrics
      })
    } catch (error) {
      console.error('Health check failed:', error)

      // 标记为不健康
      this.lastHealth = {
        deviceId: this.config.deviceId,
        status: 'unhealthy',
        lastCheckAt: new Date()
      }
    }
  }

  /**
   * 收集健康指标
   */
  private async collectMetrics(): Promise<DeviceHealth> {
    // 获取系统指标
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      deviceId: this.config.deviceId,
      status: 'healthy',  // 初始状态
      metrics: {
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,  // 转换为秒
        memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal * 100,  // 百分比
        activeConnections: 0,  // TODO: 从 ConnectionManager 获取
        queueDepth: 0,  // TODO: 从 MessageQueue 获取
        errorRate: 0  // TODO: 从错误统计获取
      },
      lastCheckAt: new Date()
    }
  }

  /**
   * 评估健康状态
   */
  private evaluateHealth(health: DeviceHealth): 'healthy' | 'degraded' | 'unhealthy' {
    const thresholds = this.config.thresholds ?? {
      cpuUsage: 80,
      memoryUsage: 80,
      errorRate: 5
    }

    const metrics = health.metrics

    if (!metrics) {
      return 'unhealthy'
    }

    // 检查是否不健康
    if (
      (metrics.cpuUsage && metrics.cpuUsage > thresholds.cpuUsage! * 1.2) ||
      (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage! * 1.2) ||
      (metrics.errorRate && metrics.errorRate > thresholds.errorRate! * 2)
    ) {
      return 'unhealthy'
    }

    // 检查是否降级
    if (
      (metrics.cpuUsage && metrics.cpuUsage > thresholds.cpuUsage!) ||
      (metrics.memoryUsage && metrics.memoryUsage > thresholds.memoryUsage!) ||
      (metrics.errorRate && metrics.errorRate > thresholds.errorRate!)
    ) {
      return 'degraded'
    }

    return 'healthy'
  }
}
