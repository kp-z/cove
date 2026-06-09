/**
 * Health Monitor
 *
 * 健康监控器：定期检查设备健康状态并上报到 Backend
 */

import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { DeviceHealth } from './device-lifecycle-manager.interface'
import type { ConnectionManager } from './connection-manager'
import type { IMessageQueue } from '../../infrastructure/storage/message-queue.interface'
import type { ILogger } from '../../infrastructure/logger'

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
  logger?: ILogger
}

/**
 * 健康监控器
 */
export class HealthMonitor {
  private monitorTimer?: NodeJS.Timeout
  private lastHealth?: DeviceHealth
  private errorCount = 0
  private totalRequests = 0
  private readonly logger: ILogger

  constructor(
    private readonly config: HealthMonitorConfig,
    private readonly backendGateway: BackendGateway,
    private readonly connectionManager?: ConnectionManager,
    private readonly messageQueue?: IMessageQueue
  ) {
    this.logger = config.logger ?? {
      debug: () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      setLevel: () => {},
      scope: () => this.logger,
    }
  }

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

    this.logger.debug(`💓 Health monitor started (interval: ${interval / 1000}s)`)

    // 立即执行一次
    this.checkAndReport().catch(error => {
      this.logger.error('❌ Initial health check failed', error as Error)
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
   * 记录错误
   */
  recordError(): void {
    this.errorCount++
    this.totalRequests++
  }

  /**
   * 记录成功请求
   */
  recordSuccess(): void {
    this.totalRequests++
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
      this.logger.warn('⚠️  Health check failed', { error: (error as Error).message })

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

    // 获取连接状态
    const activeConnections = this.connectionManager?.isConnected() ? 1 : 0

    // 获取队列深度
    let queueDepth = 0
    if (this.messageQueue) {
      try {
        queueDepth = await this.messageQueue.size()
      } catch (error) {
        this.logger.warn('⚠️  Failed to get queue depth', { error: (error as Error).message })
      }
    }

    // 计算错误率
    const errorRate = this.totalRequests > 0
      ? (this.errorCount / this.totalRequests) * 100
      : 0

    return {
      deviceId: this.config.deviceId,
      status: 'healthy',  // 初始状态
      metrics: {
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000,  // 转换为秒
        memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal * 100,  // 百分比
        activeConnections,
        queueDepth,
        errorRate
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
