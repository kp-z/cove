/**
 * tRPC WebSocket Client (Request/Response Mode)
 *
 * 用于 tRPC 请求/响应通信的 WebSocket 客户端
 *
 * 功能：
 * - WebSocket 连接管理
 * - tRPC 消息序列化/反序列化
 * - 请求/响应匹配
 * - 超时处理
 */

import WebSocket from 'ws'

/**
 * tRPC 请求
 */
export interface TrpcRequest {
  id: number
  jsonrpc: '2.0'
  method: 'query' | 'mutation' | 'subscription'
  params: {
    path: string
    input: any
  }
}

/**
 * tRPC 响应
 */
export interface TrpcResponse {
  id: number
  jsonrpc: '2.0'
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

/**
 * tRPC WebSocket 客户端（请求/响应模式）
 */
export class TrpcWebSocketRequestClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void
    reject: (error: any) => void
    timeout: NodeJS.Timeout
  }>()
  private connected = false
  private readonly timeout: number
  private readonly headers: Record<string, string>

  constructor(
    private readonly url: string,
    options?: {
      timeout?: number
      reconnectMaxAttempts?: number
      headers?: Record<string, string>
    }
  ) {
    this.timeout = options?.timeout ?? 30000
    this.headers = options?.headers ?? {}
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url, {
          headers: this.headers
        })

        this.ws.on('open', () => {
          console.log('tRPC WebSocket connected')
          this.connected = true
          resolve()
        })

        this.ws.on('close', () => {
          console.log('tRPC WebSocket closed')
          this.connected = false
          this.rejectAllPending(new Error('Connection closed'))
        })

        this.ws.on('error', (error) => {
          console.error('tRPC WebSocket error:', error)
          if (!this.connected) {
            reject(error)
          }
        })

        this.ws.on('message', (data) => {
          this.handleMessage(data)
        })

        // 连接超时
        setTimeout(() => {
          if (!this.connected) {
            this.ws?.terminate()
            reject(new Error('Connection timeout'))
          }
        }, 10000)

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    this.rejectAllPending(new Error('Client disconnected'))

    if (this.ws) {
      this.ws.removeAllListeners()

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure')
      } else {
        this.ws.terminate()
      }

      this.ws = null
    }

    this.connected = false
  }

  /**
   * 发送查询请求
   */
  async query(path: string, input: any): Promise<any> {
    return this.sendRequest('query', path, input)
  }

  /**
   * 发送变更请求
   */
  async mutation(path: string, input: any): Promise<any> {
    return this.sendRequest('mutation', path, input)
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 发送请求
   */
  async request<T = any>(params: {
    method: 'query' | 'mutation'
    path: string
    input: any
  }): Promise<T> {
    return this.sendRequest(params.method, params.path, params.input)
  }

  /**
   * 内部请求方法
   */
  private async sendRequest(method: 'query' | 'mutation', path: string, input: any): Promise<any> {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const id = ++this.requestId

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Request timeout after ${this.timeout}ms`))
      }, this.timeout)

      // 保存 Promise 回调
      this.pendingRequests.set(id, { resolve, reject, timeout })

      // 构建 tRPC 请求
      const request: TrpcRequest = {
        id,
        jsonrpc: '2.0',
        method,
        params: { path, input }
      }

      try {
        this.ws!.send(JSON.stringify(request))
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(id)
        reject(error)
      }
    })
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const text = data.toString()
      const response: TrpcResponse = JSON.parse(text)

      const pending = this.pendingRequests.get(response.id)
      if (!pending) {
        console.warn('Received response for unknown request:', response.id)
        return
      }

      // 清理
      clearTimeout(pending.timeout)
      this.pendingRequests.delete(response.id)

      // 处理响应
      if (response.error) {
        pending.reject(new Error(response.error.message))
      } else {
        pending.resolve(response.result)
      }
    } catch (error) {
      console.error('Failed to handle message:', error)
    }
  }

  /**
   * 拒绝所有待处理的请求
   */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pendingRequests.clear()
  }
}
