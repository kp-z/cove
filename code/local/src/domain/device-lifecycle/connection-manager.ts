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
import type { ILogger } from '../../infrastructure/logger'

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
  heartbeatInterval?: number       // 心跳间隔（毫秒），默认 30000
  reconnectMaxAttempts?: number    // 最大重连次数，默认 10
  reconnectBaseDelay?: number      // 重连基础延迟（毫秒），默认 1000
  logger?: ILogger
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
  private readonly logger: ILogger

  constructor(config: ConnectionConfig) {
    this.url = config.url
    this.heartbeatInterval = config.heartbeatInterval ?? 30000
    this.reconnectMaxAttempts = config.reconnectMaxAttempts ?? 10
    this.reconnectBaseDelay = config.reconnectBaseDelay ?? 1000
    // 默认 no-op logger，避免未注入时崩溃
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
    this.logger.info(`🔌 Connecting to ${this.url}...`)

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.on('open', () => {
          this.state = 'CONNECTED'
          this.reconnectAttempts = 0
          this.logger.info('🔌 WebSocket connected')
          this.startHeartbeat()
          this.flushMessageQueue()
          resolve()
        })

        this.ws.on('close', (code, reason) => {
          this.state = 'DISCONNECTED'
          this.stopHeartbeat()
          this.logger.info('🔌 WebSocket closed', { code, reason: reason.toString() })
          this.scheduleReconnect()
        })

        this.ws.on('error', (error) => {
          this.logger.error('❌ WebSocket error', error as Error)
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
    this.logger.debug('🔌 Disconnecting WebSocket...')

    this.stopHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.ws) {
      const ws = this.ws
      ws.removeAllListeners()

      // 主动断开时，若 socket 仍处于 CONNECTING（例如正撞上后台重连的一次尝试），
      // terminate() 会让 ws 库异步抛出一个 "WebSocket was closed before the
      // connection was established" 的 error 事件；上一行 removeAllListeners()
      // 刚好把所有监听器都摘掉了，Node 对无人监听的 'error' 事件会当作未捕获异常
      // 抛出、直接拖垮进程。这里补一个空监听器吞掉这类噪音。
      ws.on('error', () => {})

      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Normal closure')
      } else {
        ws.terminate()
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
      this.logger.debug('📨 Message queued (offline)')
      this.messageQueue.push(message)
      return
    }

    try {
      const data = JSON.stringify(message)
      this.ws.send(data)
    } catch (error) {
      this.logger.error('❌ Failed to send message', error as Error)
      this.messageQueue.push(message)
    }
  }

  /**
   * 注册消息处理器
   */
  onMessage(callback: (msg: any) => void): void {
    this.messageHandlers.push(callback)
  }

  getState(): ConnectionState {
    return this.state
  }

  isConnected(): boolean {
    return this.state === 'CONNECTED' && this.ws?.readyState === WebSocket.OPEN
  }

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
          this.logger.warn('⚠️  Heartbeat send failed', { error: (err as Error).message })
        })
        this.logger.debug('💓 Heartbeat sent')
      }
    }, this.heartbeatInterval)
  }

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
      this.logger.error(`❌ Max reconnects reached (${this.reconnectMaxAttempts})`)
      this.state = 'ERROR'
      return
    }

    // 指数退避：1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      30000
    )

    this.reconnectAttempts++

    this.logger.info(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectMaxAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.state = 'RECONNECTING'
      this.connect().catch(err => {
        this.logger.error('❌ Reconnect failed', err as Error)
      })
    }, delay)
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      this.logger.debug(`📨 Flushing ${this.messageQueue.length} queued message(s)`)
    }

    const messagesToSend = [...this.messageQueue]
    this.messageQueue = []

    for (const message of messagesToSend) {
      this.send(message).catch(err => {
        this.logger.error('❌ Failed to send queued message', err as Error)
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

      this.messageHandlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          this.logger.error('❌ Message handler error', error as Error)
        }
      })
    } catch (error) {
      this.logger.error('❌ Failed to parse message', error as Error)
    }
  }
}
