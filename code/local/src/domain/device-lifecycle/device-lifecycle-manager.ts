/**
 * Device Lifecycle Manager Implementation
 *
 * 设备生命周期管理器：协调设备的启动、运行、停止和健康监控
 */

import type {
  IDeviceLifecycleManager,
  DeviceState,
  DeviceHealth
} from './device-lifecycle-manager.interface'
import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'
import type { ITaskStore } from '../../infrastructure/storage/task-store.interface'
import type { ILogger } from '../../infrastructure/logger'
import { ConnectionManager, type ConnectionConfig } from './connection-manager'
import { HealthMonitor, type HealthMonitorConfig } from './health-monitor'
import { ErrorRecoveryService, type ErrorRecoveryConfig } from './error-recovery-service'

/**
 * 设备生命周期管理器配置
 */
export interface DeviceLifecycleManagerConfig {
  deviceId: string
  connection: ConnectionConfig
  health?: Partial<HealthMonitorConfig>
  recovery?: ErrorRecoveryConfig
  logger?: ILogger
}

/**
 * 设备生命周期管理器实现
 */
export class DeviceLifecycleManager implements IDeviceLifecycleManager {
  private state: DeviceState = 'DISCONNECTED'
  private connectionManager: ConnectionManager
  private healthMonitor: HealthMonitor
  private errorRecoveryService: ErrorRecoveryService
  private readonly logger: ILogger

  constructor(
    private readonly config: DeviceLifecycleManagerConfig,
    private readonly backendGateway: BackendGateway,
    private readonly taskStore: ITaskStore
  ) {
    // 建立空 no-op logger 后立即替换，避免子组件拿到 undefined
    this.logger = config.logger ?? {
      debug: () => {},
      info:  () => {},
      warn:  () => {},
      error: () => {},
      setLevel: () => {},
      scope: () => this.logger,
    }

    // 为各子组件创建 scoped logger
    const connectionLogger = this.logger.scope('Connection')
    const healthLogger     = this.logger.scope('Health')
    const recoveryLogger   = this.logger.scope('Recovery')

    this.connectionManager = new ConnectionManager({
      ...config.connection,
      logger: connectionLogger,
    })

    this.healthMonitor = new HealthMonitor(
      {
        deviceId: config.deviceId,
        ...config.health,
        logger: healthLogger,
      },
      backendGateway
    )

    this.errorRecoveryService = new ErrorRecoveryService(taskStore, {
      ...config.recovery,
      logger: recoveryLogger,
    })
  }

  /**
   * 启动设备
   */
  async start(): Promise<void> {
    if (this.state !== 'DISCONNECTED' && this.state !== 'STOPPED') {
      this.logger.warn(`⚠️  Cannot start device in state: ${this.state}`)
      return
    }

    try {
      this.logger.info('🚀 Starting device lifecycle...')
      this.state = 'CONNECTING'

      // 1. 恢复未完成的任务
      await this.errorRecoveryService.recoverPendingTasks()

      // 2. 建立连接
      // 连接失败不阻断启动：ConnectionManager 内部的 close → scheduleReconnect()
      // 已经会在后台按指数退避自动重试（见 connection-manager.ts），这里只需要
      // 不让"首次连接失败"变成致命错误一路冒泡到 main.ts 把整个进程杀掉——
      // 否则后台重连定时器还没到点，进程就已经被 process.exit(1) 提前终止。
      try {
        await this.connectionManager.connect()
      } catch (error) {
        this.logger.warn('⚠️  Initial connection failed, retrying in background', {
          error: (error as Error).message,
        })
      }

      // 3. 启动健康监控
      this.healthMonitor.start()

      // 4. 更新状态
      this.state = 'RUNNING'
      this.logger.info('✅ Device lifecycle running')
    } catch (error) {
      this.logger.error('❌ Failed to start device lifecycle', error as Error)
      this.state = 'ERROR'
      throw error
    }
  }

  /**
   * 停止设备
   */
  async stop(): Promise<void> {
    if (this.state === 'STOPPED' || this.state === 'STOPPING') {
      this.logger.warn(`⚠️  Device already stopping/stopped: ${this.state}`)
      return
    }

    try {
      this.logger.info('🛑 Stopping device lifecycle...')
      this.state = 'STOPPING'

      // 1. 停止健康监控
      this.healthMonitor.stop()

      // 2. 断开连接
      await this.connectionManager.disconnect()

      // 3. 更新状态
      this.state = 'STOPPED'
      this.logger.info('✅ Device lifecycle stopped')
    } catch (error) {
      this.logger.error('❌ Failed to stop device lifecycle', error as Error)
      this.state = 'ERROR'
      throw error
    }
  }

  /**
   * 获取当前状态
   */
  getState(): DeviceState {
    const connectionState = this.connectionManager.getState()

    // 未真正连上（包括首次连接失败后台重连中的 DISCONNECTED/RECONNECTING，
    // 以及彻底耗尽重试的 ERROR）都应该反映为 DEGRADED，而不是只在 ERROR 时才降级——
    // 否则 start() 里"连接失败但不阻断启动"的场景会让 getState() 短暂虚报 RUNNING。
    if (connectionState !== 'CONNECTED' && this.state === 'RUNNING') {
      this.state = 'DEGRADED'
    } else if (connectionState === 'CONNECTED' && this.state === 'DEGRADED') {
      this.state = 'RUNNING'
    }

    return this.state
  }

  /**
   * 获取健康状态
   */
  async getHealth(): Promise<DeviceHealth> {
    return this.healthMonitor.getHealth()
  }

  /**
   * 检查是否运行中
   */
  isRunning(): boolean {
    return this.state === 'RUNNING' || this.state === 'DEGRADED'
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connectionManager.isConnected()
  }

  /**
   * 处理错误
   */
  async handleError(taskId: string, error: Error): Promise<void> {
    const strategy = await this.errorRecoveryService.handleError(taskId, error)

    switch (strategy) {
      case 'retry':
        this.logger.info(`🔄 Task queued for retry`, { taskId })
        break
      case 'degrade':
        this.logger.warn(`⚠️  Task degraded — switching to degraded mode`, { taskId })
        this.state = 'DEGRADED'
        break
      case 'fail':
        this.logger.warn(`⚠️  Task permanently failed`, { taskId })
        break
    }
  }
}
