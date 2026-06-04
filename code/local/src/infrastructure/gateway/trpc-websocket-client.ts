/**
 * tRPC WebSocket Client
 *
 * Encapsulates tRPC WebSocket connection for Device-Backend communication
 */

import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import type { ILogger } from '../logger';

export interface TrpcWebSocketClientConfig {
  serverUrl: string;
  deviceId: string;
  apiKey: string;
  realmId: string;
  onMessage: (message: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  logger: ILogger;
}

export interface DeviceMessage {
  type: 'connected' | 'task' | 'command' | 'config';
  data?: any;
  deviceId?: string;
  timestamp: string;
}

export class TrpcWebSocketClient {
  private wsClient: ReturnType<typeof createWSClient> | null = null;
  private trpcClient: any = null;
  private unsubscribe: (() => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isShuttingDown = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly heartbeatInterval = 30000; // 30 seconds
  private readonly reconnectDelay = 5000; // 5 seconds

  constructor(private config: TrpcWebSocketClientConfig) {}

  async connect(): Promise<void> {
    if (this.isConnecting || this.wsClient) {
      this.config.logger.warn('Already connected or connecting');
      return;
    }

    this.isConnecting = true;
    this.config.logger.info('Connecting to backend', {
      serverUrl: this.config.serverUrl,
      deviceId: this.config.deviceId,
    });

    try {
      // Create WebSocket client
      const wsUrl = this.config.serverUrl.replace(/^http/, 'ws');
      this.wsClient = createWSClient({
        url: `${wsUrl}/trpc`,
        onOpen: () => {
          this.config.logger.info('WebSocket connection opened');
          this.reconnectAttempts = 0;
        },
        onClose: () => {
          this.config.logger.warn('WebSocket connection closed');
          this.handleDisconnect();
        },
      });

      // Create tRPC client
      this.trpcClient = createTRPCProxyClient({
        links: [
          wsLink({
            client: this.wsClient,
          }),
        ],
      });

      // Subscribe to device messages
      await this.subscribeToMessages();

      // Start heartbeat
      this.startHeartbeat();

      this.isConnecting = false;
      this.config.logger.info('Successfully connected to backend');
    } catch (error) {
      this.isConnecting = false;
      this.config.logger.error('Failed to connect to backend', error as Error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;
    this.config.logger.info('Disconnecting from backend');

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Stop reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Unsubscribe from messages
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Close WebSocket
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }

    this.trpcClient = null;
    this.config.logger.info('Disconnected from backend');
  }

  async reportTaskResult(
    taskId: string,
    status: 'success' | 'error' | 'timeout',
    result?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    if (!this.trpcClient) {
      throw new Error('Not connected to backend');
    }

    try {
      await this.trpcClient.deviceSubscription.reportTaskResult.mutate({
        deviceId: this.config.deviceId,
        taskId,
        status,
        result,
        error,
      });

      this.config.logger.debug('Task result reported', { taskId, status });
    } catch (err) {
      this.config.logger.error('Failed to report task result', err as Error, {
        taskId,
        status,
      });
      throw err;
    }
  }

  isConnected(): boolean {
    return this.wsClient !== null && !this.isShuttingDown;
  }

  private async subscribeToMessages(): Promise<void> {
    if (!this.trpcClient) {
      throw new Error('tRPC client not initialized');
    }

    const subscription = this.trpcClient.deviceSubscription.connect.subscribe(
      {
        deviceId: this.config.deviceId,
        apiKey: this.config.apiKey,
        metadata: {
          realmId: this.config.realmId,
          connectedAt: new Date().toISOString(),
        },
      },
      {
        onData: (message: DeviceMessage) => {
          this.config.logger.info('[TRPCWebSocketClient] onData called', {
            type: message.type,
            hasPayload: !!message.data
          });
          this.handleMessage(message);
        },
        onError: (error: Error) => {
          this.config.logger.error('Subscription error', error);
          this.config.onError?.(error);
        },
      }
    );

    this.unsubscribe = () => {
      subscription.unsubscribe();
    };
  }

  private handleMessage(message: DeviceMessage): void {
    this.config.logger.info('[handleMessage] Processing message', {
      type: message.type,
      timestamp: message.timestamp,
      hasPayload: !!message.data
    });

    if (message.type === 'connected') {
      this.config.logger.info('Connection confirmed by backend', {
        deviceId: message.deviceId,
      });
      this.config.onConnected?.();
      return;
    }

    // Forward message to handler
    this.config.logger.info('[handleMessage] Forwarding to onMessage handler', {
      type: message.type
    });
    this.config.onMessage(message);
  }

  private startHeartbeat(): void {
    const sendHeartbeat = async () => {
      if (!this.trpcClient || this.isShuttingDown) {
        return;
      }

      try {
        await this.trpcClient.deviceSubscription.heartbeat.mutate({
          deviceId: this.config.deviceId,
          realmId: this.config.realmId,
          status: {
            cpu: 0, // TODO: Collect real metrics
            memory: 0,
            disk: 0,
          },
        });

        this.config.logger.debug('Heartbeat sent');
      } catch (error) {
        this.config.logger.error('Failed to send heartbeat', error as Error);
      }

      // Schedule next heartbeat
      if (!this.isShuttingDown) {
        this.heartbeatTimer = setTimeout(sendHeartbeat, this.heartbeatInterval);
      }
    };

    // Send first heartbeat immediately
    sendHeartbeat();
  }

  private handleDisconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.config.logger.warn('Connection lost, attempting to reconnect');
    this.config.onDisconnected?.();

    // Clean up current connection
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.wsClient = null;
    this.trpcClient = null;

    // Attempt reconnection
    this.attemptReconnect();
  }

  private attemptReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.config.logger.error('Max reconnection attempts reached', undefined, {
        attempts: this.reconnectAttempts,
      });
      this.config.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);

    this.config.logger.info('Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (error) {
        this.config.logger.error('Reconnection failed', error as Error);
        this.attemptReconnect();
      }
    }, delay);
  }
}
