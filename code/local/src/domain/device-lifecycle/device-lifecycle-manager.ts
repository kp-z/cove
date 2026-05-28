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
}

/**
 * 设备生命周期管理器实现
 */
export class DeviceLifecycleManager implements IDeviceLifecycleManager {
  private state: DeviceState = 'DISCONNECTED'
  private connectionManager: ConnectionManager
  private healthMonitor: HealthMonitor
  private errorRecoveryService: ErrorRecoveryService

  constructor(
    private readonly config: DeviceLifecycleManagerConfig,
    private readonly backendGateway: BackendGateway,
    private readonly taskStore: ITaskStore
  ) {
    // 初始化子组件
    this.connectionManager = new ConnectionManager(
      config.connection,
      backendGateway
    )

    this.healthMonitor = new HealthMonitor(
      {
        deviceId: config.deviceId,
        ...config.health
      },
      backendGateway
    )

    this.errorRecoveryService = new ErrorRecoveryService(
      taskStore,
      config.recovery
    )
  }

  /**
   * 启动设备
   */
  async start(): Promise<void> {
    if (this.state !== 'DISCONNECTED' && this.state !== 'STOPPED') {
      console.warn(`Cannot start device in state: ${this.state}`)
      return
    }

    try {
      console.log('Starting device...')
      this.state = 'CONNECTING'

      // 1. 恢复未完成的任务
      console.log('Recovering pending tasks...')
      await this.errorRecoveryService.recoverPendingTasks()

      // 2. 建立连接
      console.log('Connecting to backend...')
      await this.connectionManager.connect()

      // 3. 启动健康监控
      console.log('Starting health monitor...')
      this.healthMonitor.start()

      // 4. 更新状态
      this.state = 'RUNNING'
      console.log('Device started successfully')
    } catch (error) {
      console.error('Failed to start device:', error)
      this.state = 'ERROR'
      throw error
    }
  }

  /**
   * 停止设备
   */
  async stop(): Promise<void> {
    if (this.state === 'STOPPED' || this.state === 'STOPPING') {
      console.warn(`Device already stopping/stopped: ${this.state}`)
      return
    }

    try {
      console.log('Stopping device...')
      this.state = 'STOPPING'

      // 1. 停止健康监控
      console.log('Stopping health monitor...')
      this.healthMonitor.stop()

      // 2. 断开连接
      console.log('Disconnecting from backend...')
      await this.connectionManager.disconnect()

      // 3. 更新状态
      this.state = 'STOPPED'
      console.log('Device stopped successfully')
    } catch (error) {
      console.error('Failed to stop device:', error)
      this.state = 'ERROR'
      throw error
    }
  }

  /**
   * 获取当前状态
   */
  getState(): DeviceState {
    // 如果连接状态异常，更新设备状态
    const connectionState = this.connectionManager.getState()

    if (connectionState === 'ERROR' && this.state === 'RUNNING') {
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
        console.log(`Task ${taskId} will be retried`)
        break
      case 'degrade':
        console.log(`Task ${taskId} will use degraded mode`)
        this.state = 'DEGRADED'
        break
      case 'fail':
        console.log(`Task ${taskId} failed permanently`)
        break
    }
  }
}
