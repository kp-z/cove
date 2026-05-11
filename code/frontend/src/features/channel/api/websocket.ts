/**
 * Agent Channel WebSocket Client
 *
 * 对接 Phase 3 Infrastructure Layer 的 WebSocket Server
 *
 * 功能：
 * - 连接管理（自动重连）
 * - 频道订阅/取消订阅
 * - 实时消息接收
 * - 心跳保活
 * - 事件监听
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * WebSocket 消息类型（客户端发送）
 */
export type WebSocketMessageType = 'subscribe' | 'unsubscribe' | 'message' | 'heartbeat';

/**
 * WebSocket 消息（客户端发送）
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  channelId?: string;
  content?: string;
  data?: any;
}

/**
 * WebSocket 广播消息类型（服务端推送）
 */
export type BroadcastMessageType = 'message' | 'notification' | 'event' | 'error';

/**
 * WebSocket 广播消息（服务端推送）
 */
export interface BroadcastMessage {
  type: BroadcastMessageType;
  channelId?: string;
  senderId?: string;
  senderName?: string;
  content?: string;
  data?: any;
  timestamp: string;
}

/**
 * WebSocket 连接状态
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * WebSocket 事件监听器
 */
export type WebSocketEventListener = (message: BroadcastMessage) => void;

// ============================================================================
// WebSocket Client 类
// ============================================================================

/**
 * Agent Channel WebSocket Client
 *
 * 提供类型安全的 WebSocket 连接和消息处理
 */
export class AgentChannelWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private userId: string;
  private userType: 'human' | 'agent';
  private status: WebSocketStatus = 'disconnected';
  private listeners: Map<string, Set<WebSocketEventListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribedChannels: Set<string> = new Set();

  constructor(url: string, userId: string, userType: 'human' | 'agent' = 'human') {
    this.url = url;
    this.userId = userId;
    this.userType = userType;
  }

  // --------------------------------------------------------------------------
  // 连接管理
  // --------------------------------------------------------------------------

  /**
   * 连接到 WebSocket 服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.status === 'connected') {
        resolve();
        return;
      }

      this.status = 'connecting';
      console.log('[WebSocketClient] Connecting to', this.url);

      try {
        // 构建连接 URL（包含用户信息）
        const wsUrl = `${this.url}?userId=${this.userId}&userType=${this.userType}`;
        this.ws = new WebSocket(wsUrl);

        // 连接成功
        this.ws.onopen = () => {
          console.log('[WebSocketClient] Connected');
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        // 接收消息
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        // 连接关闭
        this.ws.onclose = () => {
          console.log('[WebSocketClient] Disconnected');
          this.status = 'disconnected';
          this.stopHeartbeat();
          this.attemptReconnect();
        };

        // 连接错误
        this.ws.onerror = (error) => {
          console.error('[WebSocketClient] Error:', error);
          this.status = 'error';
          reject(error);
        };
      } catch (error) {
        console.error('[WebSocketClient] Connection failed:', error);
        this.status = 'error';
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    console.log('[WebSocketClient] Disconnecting...');

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.status = 'disconnected';
    this.subscribedChannels.clear();
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketClient] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[WebSocketClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[WebSocketClient] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * 获取连接状态
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.status === 'connected' && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // --------------------------------------------------------------------------
  // 消息发送
  // --------------------------------------------------------------------------

  /**
   * 发送消息到服务器
   */
  private send(message: WebSocketMessage): void {
    if (!this.isConnected()) {
      console.warn('[WebSocketClient] Not connected, cannot send message');
      return;
    }

    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WebSocketClient] Failed to send message:', error);
    }
  }

  /**
   * 订阅频道
   */
  subscribe(channelId: string): void {
    console.log(`[WebSocketClient] Subscribing to channel: ${channelId}`);

    this.subscribedChannels.add(channelId);

    this.send({
      type: 'subscribe',
      channelId,
    });
  }

  /**
   * 取消订阅频道
   */
  unsubscribe(channelId: string): void {
    console.log(`[WebSocketClient] Unsubscribing from channel: ${channelId}`);

    this.subscribedChannels.delete(channelId);

    this.send({
      type: 'unsubscribe',
      channelId,
    });
  }

  /**
   * 获取已订阅的频道列表
   */
  getSubscribedChannels(): string[] {
    return Array.from(this.subscribedChannels);
  }

  // --------------------------------------------------------------------------
  // 消息接收
  // --------------------------------------------------------------------------

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: BroadcastMessage = JSON.parse(data);

      // 触发全局监听器
      this.notifyListeners('*', message);

      // 触发频道特定监听器
      if (message.channelId) {
        this.notifyListeners(message.channelId, message);
      }

      // 触发消息类型监听器
      this.notifyListeners(`type:${message.type}`, message);
    } catch (error) {
      console.error('[WebSocketClient] Failed to parse message:', error);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(key: string, message: BroadcastMessage): void {
    const listeners = this.listeners.get(key);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        listener(message);
      } catch (error) {
        console.error('[WebSocketClient] Listener error:', error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 事件监听
  // --------------------------------------------------------------------------

  /**
   * 添加事件监听器
   *
   * @param event 事件类型：
   *   - '*': 监听所有消息
   *   - 'channelId': 监听特定频道的消息
   *   - 'type:message': 监听特定类型的消息
   * @param listener 监听器函数
   */
  on(event: string, listener: WebSocketEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, listener: WebSocketEventListener): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // --------------------------------------------------------------------------
  // 心跳保活
  // --------------------------------------------------------------------------

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
        });
      }
    }, 30000); // 30秒
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// ============================================================================
// 导出单例实例（可选）
// ============================================================================

/**
 * 创建 WebSocket 客户端实例
 *
 * 注意：需要在应用初始化时调用，传入当前用户信息
 */
export function createWebSocketClient(
  url: string,
  userId: string,
  userType: 'human' | 'agent' = 'human'
): AgentChannelWebSocketClient {
  return new AgentChannelWebSocketClient(url, userId, userType);
}
