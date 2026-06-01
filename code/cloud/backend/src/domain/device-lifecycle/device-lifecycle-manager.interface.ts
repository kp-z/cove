/**
 * Device Lifecycle Manager Interface
 *
 * 设备生命周期管理：负责设备的启动、关闭、连接管理、健康监控
 *
 * 职责：
 * - 连接管理：WebSocket 连接建立、断开、重连
 * - 健康监控：定期上报健康状态、检测异常
 * - 错误恢复：自动重连、故障降级
 * - 生命周期：启动、运行、停止
 */

/**
 * 设备状态
 */
export type DeviceState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'STOPPED'

/**
 * 连接状态
 */
export interface ConnectionStatus {
  state: DeviceState
  connectedAt?: Date
  lastHeartbeatAt?: Date
  reconnectAttempts: number
  error?: string
}

/**
 * 健康状态
 */
export interface HealthStatus {
  status: 'online' | 'offline' | 'degraded'
  activeAgents: number
  queueDepth: number
  cpuUsage: number
  memoryUsage: number
  uptime: number
  lastReportAt: Date
}

/**
 * 设备生命周期管理器接口
 */
export interface IDeviceLifecycleManager {
  /**
   * 启动设备
   * @param deviceId Device ID
   * @param realmId Realm ID
   */
  start(deviceId: string, realmId: string): Promise<void>

  /**
   * 停止设备
   */
  stop(): Promise<void>

  /**
   * 获取连接状态
   * @returns 连接状态
   */
  getConnectionStatus(): ConnectionStatus

  /**
   * 获取健康状态
   * @returns 健康状态
   */
  getHealthStatus(): HealthStatus

  /**
   * 手动触发重连
   */
  reconnect(): Promise<void>

  /**
   * 上报健康状态到 Backend
   */
  reportHealth(): Promise<void>

  /**
   * 启动健康监控（定期上报）
   */
  startHealthMonitoring(): void

  /**
   * 停止健康监控
   */
  stopHealthMonitoring(): void
}
