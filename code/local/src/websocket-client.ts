/**
 * WebSocket Client for Local Device Agent
 *
 * Connects to Cloud Backend using raw WebSocket with tRPC protocol
 */

import WebSocket from 'ws';
import { Config } from './config';
import { AdapterExecutor } from './adapter-executor';

interface TRPCMessage {
  id: number | string;
  jsonrpc?: '2.0';
  method?: 'subscription.create' | 'subscription.stop';
  params?: {
    path: string;
    input: any;
  };
  result?: {
    type: 'data' | 'started' | 'stopped';
    data?: any;
  };
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnected = false;
  private subscriptionId: string | null = null;

  constructor(
    private config: Config,
    private adapterExecutor: AdapterExecutor
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`📡 Connecting to Cloud Backend: ${this.config.server.url}`);

        // Build WebSocket URL with authentication parameters
        const url = new URL(this.config.server.url);
        url.searchParams.set('deviceId', this.config.device.id);
        url.searchParams.set('apiKey', this.config.device.apiKey);
        url.searchParams.set('realmId', this.config.device.realmId);

        this.ws = new WebSocket(url.toString());

        this.ws.on('open', () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Subscribe to device events
          this.subscribeToDeviceEvents();

          // Start heartbeat
          this.startHeartbeat();

          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', () => {
          console.log('🔌 WebSocket disconnected');
          this.handleDisconnect();
        });

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          if (!this.isConnected) {
            reject(error);
          }
        });
      } catch (error) {
        console.error('❌ Connection failed:', error);
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting from Cloud Backend...');

    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    console.log('✅ Disconnected');
  }

  private subscribeToDeviceEvents(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscriptionId = `sub-${Date.now()}`;
    this.subscriptionId = subscriptionId;

    // Send tRPC subscription request
    const message: TRPCMessage = {
      id: subscriptionId,
      jsonrpc: '2.0',
      method: 'subscription.create',
      params: {
        path: 'deviceSubscription.onDeviceEvent',
        input: {
          deviceId: this.config.device.id,
        },
      },
    };

    this.send(message);
    console.log('📡 Subscribed to device events');
  }

  private handleMessage(data: string): void {
    try {
      const message: TRPCMessage = JSON.parse(data);

      // Handle subscription data
      if (message.result?.type === 'data') {
        this.handleDeviceEvent(message.result.data);
      } else if (message.result?.type === 'started') {
        console.log('✅ Subscription started');
      } else if (message.result?.type === 'stopped') {
        console.log('🛑 Subscription stopped');
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private handleDeviceEvent(event: any): void {
    if (!event || !event.type) {
      return;
    }

    switch (event.type) {
      case 'connected':
        console.log('✅ Device registered with Cloud Backend');
        break;

      case 'heartbeat':
        // Heartbeat acknowledged
        break;

      case 'message':
        this.handleDeviceMessage(event.data);
        break;

      case 'disconnected':
        console.log('🔌 Device disconnected from Cloud Backend');
        this.handleDisconnect();
        break;

      default:
        console.warn('Unknown event type:', event.type);
    }
  }

  private handleDeviceMessage(data: any): void {
    if (!data || !data.type) {
      console.warn('Invalid message format:', data);
      return;
    }

    switch (data.type) {
      case 'task.request':
        this.handleTaskRequest(data.payload);
        break;

      case 'task.cancel':
        this.handleTaskCancel(data.payload);
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private async handleTaskRequest(payload: any): Promise<void> {
    const { taskId, realmId, agentId, input } = payload;

    console.log(`📋 Received task: ${taskId}`);

    try {
      const result = await this.adapterExecutor.execute({
        taskId,
        realmId,
        agentId,
        input,
      });

      await this.sendTaskResult(taskId, 'success', result);
      console.log(`✅ Task completed: ${taskId}`);
    } catch (error) {
      await this.sendTaskResult(taskId, 'failed', {
        error: (error as Error).message,
      });
      console.error(`❌ Task failed: ${taskId}`, error);
    }
  }

  private handleTaskCancel(payload: any): void {
    const { taskId } = payload;
    console.log(`🛑 Cancelling task: ${taskId}`);
    this.adapterExecutor.cancelTask(taskId);
  }

  private async sendTaskResult(
    taskId: string,
    status: 'success' | 'failed',
    result: any
  ): Promise<void> {
    // Send task result via tRPC mutation
    const message: TRPCMessage = {
      id: this.nextMessageId(),
      jsonrpc: '2.0',
      method: 'subscription.create',
      params: {
        path: 'deviceSubscription.sendToDevice',
        input: {
          deviceId: this.config.device.id,
          message: {
            type: 'task.result',
            payload: {
              taskId,
              status,
              result,
            },
          },
        },
      },
    };

    this.send(message);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) {
        return;
      }

      // Send heartbeat via tRPC mutation
      const message: TRPCMessage = {
        id: this.nextMessageId(),
        jsonrpc: '2.0',
        method: 'subscription.create',
        params: {
          path: 'deviceSubscription.sendToDevice',
          input: {
            deviceId: this.config.device.id,
            message: {
              type: 'heartbeat',
              payload: {
                status: 'online',
                activeTaskCount: this.adapterExecutor.getActiveTaskCount(),
                timestamp: Date.now(),
              },
            },
          },
        },
      };

      this.send(message);
    }, this.config.local.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleDisconnect(): void {
    if (!this.isConnected) {
      return;
    }

    this.isConnected = false;
    this.stopHeartbeat();

    console.log('🔌 Disconnected from Cloud Backend');
    this.reconnect();
  }

  private reconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.config.local.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;

      try {
        await this.disconnect();
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.reconnect();
      }
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private send(message: TRPCMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private nextMessageId(): number {
    return ++this.messageId;
  }
}
