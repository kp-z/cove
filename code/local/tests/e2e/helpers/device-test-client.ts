/**
 * Device 测试客户端
 * 封装 tRPC WebSocket 客户端，用于端到端测试
 */

import { createTRPCProxyClient, createWSClient, wsLink } from '@trpc/client';
import type { CreateTRPCProxyClient } from '@trpc/client';
import WebSocket from 'ws';
import { sleep } from './test-utils';

// 定义消息类型
export interface DeviceMessage {
  type: 'connected' | 'task' | 'command' | 'config';
  deviceId?: string;
  timestamp?: string;
  data?: any;
}

// 定义 Device 客户端配置
export interface DeviceClientConfig {
  serverUrl: string;
  deviceId: string;
  apiKey?: string;
  realmId?: string;
  heartbeatInterval?: number;
}

/**
 * Device 测试客户端
 */
export class DeviceTestClient {
  private wsClient: ReturnType<typeof createWSClient> | null = null;
  private trpcClient: any = null;
  private messages: DeviceMessage[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connected: boolean = false;
  private unsubscribe: (() => void) | null = null;

  constructor(private config: DeviceClientConfig) {}

  /**
   * 连接到 Backend
   */
  async connect(): Promise<void> {
    // 创建 WebSocket 客户端
    this.wsClient = createWSClient({
      url: this.config.serverUrl,
      WebSocket: WebSocket as any,
    });

    // 创建 tRPC 客户端
    this.trpcClient = createTRPCProxyClient({
      links: [
        wsLink({
          client: this.wsClient,
        }),
      ],
    });

    // 订阅连接
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      this.unsubscribe = this.trpcClient.deviceSubscription.connect.subscribe(
        {
          deviceId: this.config.deviceId,
          apiKey: this.config.apiKey,
          metadata: {
            realmId: this.config.realmId,
          },
        },
        {
          onData: (message: DeviceMessage) => {
            this.messages.push(message);

            // 收到 connected 消息表示连接成功
            if (message.type === 'connected') {
              this.connected = true;
              clearTimeout(timeout);
              resolve();

              // 启动心跳
              this.startHeartbeat();
            }
          },
          onError: (error: Error) => {
            clearTimeout(timeout);
            reject(error);
          },
        }
      );
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.unsubscribe && typeof this.unsubscribe === 'function') {
      try {
        this.unsubscribe();
      } catch (error) {
        console.error('Error during unsubscribe:', error);
      }
      this.unsubscribe = null;
    }

    if (this.wsClient) {
      try {
        this.wsClient.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.wsClient = null;
    }

    this.connected = false;
    this.trpcClient = null;
  }

  /**
   * 启动心跳
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 10000; // 默认 10 秒

    this.heartbeatTimer = setInterval(async () => {
      if (this.connected && this.trpcClient) {
        try {
          await this.trpcClient.deviceSubscription.heartbeat.mutate({
            deviceId: this.config.deviceId,
            realmId: this.config.realmId,
            status: {
              cpu: 0.5,
              memory: 0.6,
              disk: 0.7,
            },
          });
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }
    }, interval);
  }

  /**
   * 停止心跳
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 发送心跳（手动）
   */
  async sendHeartbeat(): Promise<void> {
    if (!this.trpcClient) {
      throw new Error('Client not connected');
    }

    await this.trpcClient.deviceSubscription.heartbeat.mutate({
      deviceId: this.config.deviceId,
      realmId: this.config.realmId,
      status: {
        cpu: 0.5,
        memory: 0.6,
        disk: 0.7,
      },
    });
  }

  /**
   * 报告任务结果
   */
  async reportTaskResult(taskId: string, status: 'success' | 'error' | 'timeout', result?: any, error?: string): Promise<void> {
    if (!this.trpcClient) {
      throw new Error('Client not connected');
    }

    await this.trpcClient.deviceSubscription.reportTaskResult.mutate({
      deviceId: this.config.deviceId,
      taskId,
      status,
      result,
      error,
    });
  }

  /**
   * 获取所有接收到的消息
   */
  getMessages(): DeviceMessage[] {
    return [...this.messages];
  }

  /**
   * 清空消息
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * 等待特定类型的消息
   */
  async waitForMessage(type: DeviceMessage['type'], timeout: number = 5000): Promise<DeviceMessage> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const message = this.messages.find(m => m.type === type);
      if (message) {
        return message;
      }
      await sleep(100);
    }

    throw new Error(`Timeout waiting for message type: ${type}`);
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取 tRPC 客户端（用于直接调用其他 API）
   */
  getTrpcClient(): any {
    return this.trpcClient;
  }
}

/**
 * 创建测试 Device 客户端
 */
export async function createTestDevice(config: Partial<DeviceClientConfig> = {}): Promise<DeviceTestClient> {
  const defaultConfig: DeviceClientConfig = {
    serverUrl: 'ws://localhost:3002',
    deviceId: `test-device-${Date.now()}`,
    realmId: 'realm-nexus',
    heartbeatInterval: 10000,
    ...config,
  };

  const client = new DeviceTestClient(defaultConfig);
  return client;
}
