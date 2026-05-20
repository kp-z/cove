import WebSocket from 'ws';
import { Config } from './config';
import { TaskExecutor } from './task-executor';

interface DeviceMessage {
  type: string;
  payload: any;
  timestamp: number;
  requestId?: string;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: Config,
    private taskExecutor: TaskExecutor
  ) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.config.server.url}?deviceId=${this.config.device.id}&apiKey=${this.config.device.apiKey}&realmId=${this.config.device.realmId}`;

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ Connected to Cloud backend');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        console.log('🔌 Disconnected from Cloud backend');
        this.stopHeartbeat();
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message: DeviceMessage = JSON.parse(data);

      switch (message.type) {
        case 'task.request':
          this.handleTaskRequest(message);
          break;
        case 'task.cancel':
          this.handleTaskCancel(message);
          break;
        case 'heartbeat.ack':
          // Heartbeat acknowledged
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private async handleTaskRequest(message: DeviceMessage): Promise<void> {
    const { taskId, realmId, agentId, input } = message.payload;

    console.log(`📋 Received task: ${taskId}`);

    try {
      const result = await this.taskExecutor.execute({
        taskId,
        realmId,
        agentId,
        input,
      });

      this.send({
        type: 'task.result',
        payload: {
          taskId,
          status: 'success',
          result,
        },
      });

      console.log(`✅ Task completed: ${taskId}`);
    } catch (error) {
      this.send({
        type: 'task.result',
        payload: {
          taskId,
          status: 'failed',
          error: (error as Error).message,
        },
      });

      console.error(`❌ Task failed: ${taskId}`, error);
    }
  }

  private handleTaskCancel(message: DeviceMessage): void {
    const { taskId } = message.payload;
    console.log(`🛑 Cancelling task: ${taskId}`);
    this.taskExecutor.cancelTask(taskId);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'heartbeat',
        payload: {
          status: 'online',
          activeTaskCount: this.taskExecutor.getActiveTaskCount(),
        },
      });
    }, this.config.local.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private send(message: Omit<DeviceMessage, 'timestamp'>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          ...message,
          timestamp: Date.now(),
        })
      );
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      process.exit(1);
    }

    this.reconnectAttempts++;
    const delay = this.config.local.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }
}
