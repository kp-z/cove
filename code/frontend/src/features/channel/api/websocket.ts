export type WebSocketMessageType = 'subscribe' | 'unsubscribe' | 'message' | 'heartbeat';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  channel_id?: string;
  content?: string;
  data?: any;
}

export type BroadcastMessageType = 'message' | 'notification' | 'event' | 'error';

export interface BroadcastMessage {
  type: BroadcastMessageType;
  channel_id?: string;
  sender_id?: string;
  sender_name?: string;
  content?: string;
  data?: any;
  timestamp: string;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type WebSocketEventListener = (message: BroadcastMessage) => void;

export class AgentChannelWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private userId: string;
  private userType: 'human' | 'agent';
  private status: WebSocketStatus = 'disconnected';
  private listeners: Map<string, Set<WebSocketEventListener>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribedChannels: Set<string> = new Set();

  constructor(url: string, userId: string, userType: 'human' | 'agent' = 'human') {
    this.url = url;
    this.userId = userId;
    this.userType = userType;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.status === 'connected') {
        resolve();
        return;
      }

      this.status = 'connecting';
      console.log('[WebSocketClient] Connecting to', this.url);

      try {
        const wsUrl = `${this.url}?userId=${this.userId}&userType=${this.userType}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocketClient] Connected');
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('[WebSocketClient] Disconnected');
          this.status = 'disconnected';
          this.stopHeartbeat();
          this.attemptReconnect();
        };

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

  getStatus(): WebSocketStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected' && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

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

  subscribe(channelId: string): void {
    console.log(`[WebSocketClient] Subscribing to channel: ${channelId}`);

    this.subscribedChannels.add(channelId);

    this.send({
      type: 'subscribe',
      channel_id: channelId,
    });
  }

  unsubscribe(channelId: string): void {
    console.log(`[WebSocketClient] Unsubscribing from channel: ${channelId}`);

    this.subscribedChannels.delete(channelId);

    this.send({
      type: 'unsubscribe',
      channel_id: channelId,
    });
  }

  getSubscribedChannels(): string[] {
    return Array.from(this.subscribedChannels);
  }

  private handleMessage(data: string): void {
    try {
      const message: BroadcastMessage = JSON.parse(data);

      this.notifyListeners('*', message);

      if (message.channel_id) {
        this.notifyListeners(message.channel_id, message);
      }

      this.notifyListeners(`type:${message.type}`, message);
    } catch (error) {
      console.error('[WebSocketClient] Failed to parse message:', error);
    }
  }

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

  on(event: string, listener: WebSocketEventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: WebSocketEventListener): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    listeners.delete(listener);

    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
        });
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

export function createWebSocketClient(
  url: string,
  userId: string,
  userType: 'human' | 'agent' = 'human'
): AgentChannelWebSocketClient {
  return new AgentChannelWebSocketClient(url, userId, userType);
}
