/**
 * Device Lifecycle Manager Interface
 *
 * 设备生命周期管理器：负责设备的启动、运行、停止和健康监控
 */

/**
 * 设备状态
 */
export type DeviceState =
  | 'DISCONNECTED'  // 未连接
  | 'CONNECTING'    // 连接中
  | 'CONNECTED'     // 已连接
  | 'RUNNING'       // 运行中
  | 'DEGRADED'      // 降级运行
  | 'STOPPING'      // 停止中
  | 'STOPPED'       // 已停止
  | 'ERROR'         // 错误状态

/**
 * 设备健康状态
 */
export interface DeviceHealth {
  deviceId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  metrics?: {
    cpuUsage?: number
    memoryUsage?: number
    activeConnections?: number
    queueDepth?: number
    errorRate?: number
  }
  lastCheckAt: Date
}

/**
 * 设备生命周期管理器接口
 */
export interface IDeviceLifecycleManager {
  /**
   * 启动设备
   */
  start(): Promise<void>

  /**
   * 停止设备
   */
  stop(): Promise<void>

  /**
   * 获取当前状态
   */
  getState(): DeviceState

  /**
   * 获取健康状态
   */
  getHealth(): Promise<DeviceHealth>

  /**
   * 检查是否运行中
   */
  isRunning(): boolean

  /**
   * 检查是否已连接
   */
  isConnected(): boolean
}
