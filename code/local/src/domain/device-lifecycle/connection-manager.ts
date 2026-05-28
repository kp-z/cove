/**
 * Connection Manager
 *
 * 连接管理器：负责 WebSocket 连接的建立、维护和重连
 */

import type { BackendGateway } from '../../infrastructure/gateway/backend-gateway.interface'

/**
 * 连接状态
 */
export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ERROR'

/**
 * 连接配置
 */
export interface ConnectionConfig {
  url: string
  reconnectInterval?: number  // 重连间隔（毫秒）
  maxReconnectAttempts?: number  // 最大重连次数
  heartbeatInterval?: number  // 心跳间隔（毫秒）
}

/**
 * 连接管理器
 */
export class ConnectionManager {
  private state: ConnectionState = 'DISCONNECTED'
  private reconnectAttempts = 0
  private reconnectTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private ws?: WebSocket

  constructor(
    private readonly config: ConnectionConfig,
    private readonly backendGateway: BackendGateway
  ) {}

  /**
   * 连接到 Backend
   */
  async connect(): Promise<void> {
    if (this.state === 'CONNECTED' || this.state === 'CONNECTING') {
      return
    }

    this.state = 'CONNECTING'

    try {
      // 使用 BackendGateway 进行健康检查
      const healthy = await this.backendGateway.healthCheck()
      if (!healthy) {
        throw new Error('Backend health check failed')
      }

      // TODO: 实际的 WebSocket 连接逻辑
      // 这里简化处理，实际应该创建 WebSocket 连接
      this.state = 'CONNECTED'
      this.reconnectAttempts = 0

      // 启动心跳
      this.startHeartbeat()
    } catch (error) {
      this.state = 'ERROR'
      console.error('Failed to connect:', error)

      // 尝试重连
      await this.scheduleReconnect()
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this.stopReconnect()

    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }

    this.state = 'DISCONNECTED'
  }

  /**
   * 获取连接状态
   */
  getState(): ConnectionState {
    return this.state
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state === 'CONNECTED'
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return
    }

    const interval = this.config.heartbeatInterval ?? 30000  // 默认 30 秒

    this.heartbeatTimer = setInterval(async () => {
      try {
        const healthy = await this.backendGateway.healthCheck()
        if (!healthy) {
          console.warn('Heartbeat failed, reconnecting...')
          await this.reconnect()
        }
      } catch (error) {
        console.error('Heartbeat error:', error)
        await this.reconnect()
      }
    }, interval)
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  /**
   * 重连
   */
  private async reconnect(): Promise<void> {
    if (this.state === 'RECONNECTING') {
      return
    }

    this.state = 'RECONNECTING'
    await this.disconnect()
    await this.connect()
  }

  /**
   * 调度重连
   */
  private async scheduleReconnect(): Promise<void> {
    const maxAttempts = this.config.maxReconnectAttempts ?? 10

    if (this.reconnectAttempts >= maxAttempts) {
      console.error('Max reconnect attempts reached')
      this.state = 'ERROR'
      return
    }

    this.reconnectAttempts++
    const interval = this.config.reconnectInterval ?? 5000  // 默认 5 秒

    this.reconnectTimer = setTimeout(async () => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${maxAttempts})`)
      await this.connect()
    }, interval)
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    this.reconnectAttempts = 0
  }
}
