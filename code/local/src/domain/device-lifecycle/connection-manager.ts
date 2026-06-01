/**
 * Connection Manager
 *
 * 连接管理器：负责 WebSocket 连接的建立、维护和重连
 *
 * 功能：
 * - WebSocket 连接建立和断开
 * - 心跳机制（每 30 秒）
 * - 自动重连（指数退避）
 * - 消息队列（连接断开时缓存消息）
 */

import WebSocket from 'ws'

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
  heartbeatInterval?: number  // 心跳间隔（毫秒），默认 30000
  reconnectMaxAttempts?: number  // 最大重连次数，默认 10
  reconnectBaseDelay?: number  // 重连基础延迟（毫秒），默认 1000
}

/**
 * 连接管理器
 */
export class ConnectionManager {
  private state: ConnectionState = 'DISCONNECTED'
  private ws: WebSocket | null = null
  private heartbeatTimer?: NodeJS.Timeout
  private reconnectTimer?: NodeJS.Timeout
  private messageQueue: any[] = []
  private messageHandlers: Array<(msg: any) => void> = []
  private reconnectAttempts = 0

  private readonly url: string
  private readonly heartbeatInterval: number
  private readonly reconnectMaxAttempts: number
  private readonly reconnectBaseDelay: number

  constructor(config: ConnectionConfig) {
    this.url = config.url
    this.heartbeatInterval = config.heartbeatInterval ?? 30000
    this.reconnectMaxAttempts = config.reconnectMaxAttempts ?? 10
    this.reconnectBaseDelay = config.reconnectBaseDelay ?? 1000
  }

  /**
   * 连接到 Backend
   */
  async connect(): Promise<void> {
    if (this.state === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    if (this.state === 'CONNECTING') {
      return
    }

    this.state = 'CONNECTING'

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.on('open', () => {
          console.log('WebSocket connected')
          this.state = 'CONNECTED'
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.flushMessageQueue()
          resolve()
        })

        this.ws.on('close', (code, reason) => {
          console.log(`WebSocket closed: ${code} ${reason}`)
          this.state = 'DISCONNECTED'
          this.stopHeartbeat()
          this.scheduleReconnect()
        })

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error)
          if (this.state === 'CONNECTING') {
            this.state = 'ERROR'
            reject(error)
          }
        })

        this.ws.on('message', (data) => {
          this.handleMessage(data)
        })

        // 连接超时
        setTimeout(() => {
          if (this.state === 'CONNECTING') {
            this.ws?.terminate()
            this.state = 'ERROR'
            reject(new Error('Connection timeout'))
          }
        }, 10000)

      } catch (error) {
        this.state = 'ERROR'
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    console.log('Disconnecting WebSocket...')

    this.stopHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.ws) {
      this.ws.removeAllListeners()

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure')
      } else {
        this.ws.terminate()
      }

      this.ws = null
    }

    this.state = 'DISCONNECTED'
    this.messageHandlers = []
  }

  /**
   * 发送消息
   */
  async send(message: any): Promise<void> {
    if (!this.isConnected() || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 缓存消息，等待连接恢复
      console.log('WebSocket not connected, queueing message')
      this.messageQueue.push(message)
      return
    }

    try {
      const data = JSON.stringify(message)
      this.ws.send(data)
    } catch (error) {
      console.error('Failed to send message:', error)
      this.messageQueue.push(message)
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(callback: (msg: any) => void): void {
    this.messageHandlers.push(callback)
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
    return this.state === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.messageQueue.length
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
          timestamp: Date.now()
        }).catch(err => {
          console.error('Failed to send heartbeat:', err)
        })
      }
    }, this.heartbeatInterval)
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
   * 调度重连（指数退避）
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.reconnectMaxAttempts) {
      console.error(`Max reconnect attempts (${this.reconnectMaxAttempts}) reached`)
      this.state = 'ERROR'
      return
    }

    // 指数退避：1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      30000
    )

    this.reconnectAttempts++

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectMaxAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`)
      this.state = 'RECONNECTING'
      this.connect().catch(err => {
        console.error('Reconnect failed:', err)
      })
    }, delay)
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue(): void {
    console.log(`Flushing ${this.messageQueue.length} queued messages`)

    const messagesToSend = [...this.messageQueue]
    this.messageQueue = []

    for (const message of messagesToSend) {
      this.send(message).catch(err => {
        console.error('Failed to send queued message:', err)
        // 重新入队
        this.messageQueue.push(message)
      })
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const text = data.toString()
      const message = JSON.parse(text)

      // 忽略心跳响应
      if (message.type === 'heartbeat') {
        return
      }

      // 分发消息给所有处理器
      this.messageHandlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          console.error('Message handler error:', error)
        }
      })
    } catch (error) {
      console.error('Failed to parse message:', error)
    }
  }
}
