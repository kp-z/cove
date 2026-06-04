/**
 * Device Connection Manager
 *
 * 管理 Local Device 的 WebSocket 连接状态
 */

import { EventEmitter } from 'events';
import type { ILogger } from '../../application/interfaces/logger.interface';

export interface DeviceConnection {
  deviceId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  metadata?: Record<string, unknown>;
  emit?: (event: string, data: any) => void; // WebSocket emit function
}

export interface DeviceMessage {
  type: string;
  payload: any;
}

export class DeviceConnectionManager extends EventEmitter {
  private connections = new Map<string, DeviceConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_TIMEOUT = 30000; // 30 seconds

  constructor(private logger: ILogger) {
    super();
    this.startHeartbeatMonitor();
  }

  /**
   * 注册设备连接
   */
  registerConnection(
    deviceId: string,
    emit: (event: string, data: any) => void,
    metadata?: Record<string, unknown>
  ): void {
    const now = new Date();
    const connection: DeviceConnection = {
      deviceId,
      connectedAt: now,
      lastHeartbeat: now,
      emit,
      metadata,
    };

    this.connections.set(deviceId, connection);
    this.logger.info(`Device connected: ${deviceId}`, { metadata });
    this.emit('device.connected', { deviceId, connection });
  }

  /**
   * 注销设备连接
   */
  unregisterConnection(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (connection) {
      this.connections.delete(deviceId);
      this.logger.info(`Device disconnected: ${deviceId}`);
      this.emit('device.disconnected', { deviceId, connection });
    }
  }

  /**
   * 更新心跳时间
   */
  updateHeartbeat(deviceId: string): void {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
  }

  /**
   * 检查设备是否在线
   */
  isDeviceOnline(deviceId: string): boolean {
    return this.connections.has(deviceId);
  }

  /**
   * 获取所有在线设备
   */
  getOnlineDevices(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 获取设备连接信息
   */
  getConnection(deviceId: string): DeviceConnection | undefined {
    return this.connections.get(deviceId);
  }

  /**
   * 启动心跳监控
   */
  private startHeartbeatMonitor(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      for (const [deviceId, connection] of this.connections.entries()) {
        const timeSinceLastHeartbeat = now - connection.lastHeartbeat.getTime();
        if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          this.logger.warn(`Device heartbeat timeout: ${deviceId}`);
          this.unregisterConnection(deviceId);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * 停止心跳监控
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.connections.clear();
  }

  /**
   * 发送消息到指定设备
   */
  async sendToDevice(deviceId: string, message: DeviceMessage): Promise<boolean> {
    const connection = this.connections.get(deviceId);
    if (!connection || !connection.emit) {
      this.logger.warn(`Cannot send message to offline device: ${deviceId}`);
      return false;
    }

    try {
      this.logger.info(`[DeviceConnectionManager] Calling emit for device: ${deviceId}`, {
        type: message.type,
        hasEmit: !!connection.emit,
        messagePayload: message.payload
      });
      connection.emit('message', message);
      this.logger.debug(`Message sent to device: ${deviceId}`, { type: message.type });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Failed to send message to device: ${deviceId}`, error, { deviceId });
      return false;
    }
  }

  /**
   * 广播消息到多个设备
   */
  async broadcastToDevices(deviceIds: string[], message: DeviceMessage): Promise<number> {
    let successCount = 0;
    for (const deviceId of deviceIds) {
      const success = await this.sendToDevice(deviceId, message);
      if (success) {
        successCount++;
      }
    }
    return successCount;
  }
}
