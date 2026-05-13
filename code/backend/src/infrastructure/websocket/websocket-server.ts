import { ConnectionManager } from './connection-manager';
import { SubscriptionManager, WebSocketEventType } from './subscription-manager';

interface WebSocket {
  send(data: string): void;
  close(): void;
  on(event: string, handler: (...args: any[]) => void): void;
  readyState: number;
}

interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'heartbeat';
  payload?: {
    channelId?: string;
    events?: WebSocketEventType[];
    filters?: Record<string, unknown>;
  };
}

export class WebSocketServer {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly HEARTBEAT_INTERVAL = 30000;
  private readonly CONNECTION_TIMEOUT = 90000;

  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly subscriptionManager: SubscriptionManager
  ) {}

  start(): void {
    this.startHeartbeat();
    this.startCleanup();
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.subscriptionManager.clear();
    this.connectionManager.clear();
  }

  handleConnection(ws: WebSocket, userId: string, userType: 'human' | 'agent' = 'human'): string {
    const connectionId = this.connectionManager.addConnection(userId, userType, ws);

    ws.on('message', (data: string) => {
      this.handleMessage(connectionId, data);
    });

    ws.on('close', () => {
      this.handleDisconnection(connectionId);
    });

    ws.on('error', () => {
      // error logged by caller
    });

    this.connectionManager.sendToConnection(connectionId, JSON.stringify({
      type: 'connected',
      payload: { connectionId, userId },
      timestamp: new Date().toISOString(),
    }));

    return connectionId;
  }

  handleDisconnection(connectionId: string): void {
    this.subscriptionManager.unsubscribeAll(connectionId);
    this.connectionManager.removeConnection(connectionId);
  }

  private handleMessage(connectionId: string, data: string): void {
    const conn = this.connectionManager.getConnection(connectionId);
    if (!conn) return;

    try {
      const message: ClientMessage = JSON.parse(data);

      switch (message.type) {
        case 'heartbeat':
          this.connectionManager.updateHeartbeat(connectionId);
          this.connectionManager.sendToConnection(connectionId, JSON.stringify({
            type: 'heartbeat',
            payload: { status: 'pong' },
            timestamp: new Date().toISOString(),
          }));
          break;

        case 'subscribe':
          if (message.payload?.channelId) {
            this.subscriptionManager.subscribe(
              connectionId,
              message.payload.channelId,
              message.payload.events
            );
            this.connectionManager.sendToConnection(connectionId, JSON.stringify({
              type: 'subscribed',
              payload: { channelId: message.payload.channelId },
              timestamp: new Date().toISOString(),
            }));
          }
          break;

        case 'unsubscribe':
          if (message.payload?.channelId) {
            this.subscriptionManager.unsubscribe(connectionId, message.payload.channelId);
            this.connectionManager.sendToConnection(connectionId, JSON.stringify({
              type: 'unsubscribed',
              payload: { channelId: message.payload.channelId },
              timestamp: new Date().toISOString(),
            }));
          }
          break;
      }
    } catch {
      this.connectionManager.sendToConnection(connectionId, JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const message = JSON.stringify({
        type: 'heartbeat',
        payload: { status: 'ping' },
        timestamp: new Date().toISOString(),
      });
      for (const [connectionId] of this.connectionManager.getAllConnections()) {
        this.connectionManager.sendToConnection(connectionId, message);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const stale = this.connectionManager.getStaleConnections(this.CONNECTION_TIMEOUT);
      for (const connectionId of stale) {
        this.handleDisconnection(connectionId);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  getConnectionCount(): number {
    return this.connectionManager.getConnectionCount();
  }

  getChannelSubscriberCount(channelId: string): number {
    return this.subscriptionManager.getChannelSubscriberCount(channelId);
  }

  getAllChannels(): string[] {
    return this.subscriptionManager.getAllChannels();
  }
}
