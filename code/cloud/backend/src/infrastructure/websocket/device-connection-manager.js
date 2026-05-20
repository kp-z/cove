"use strict";
/**
 * Device Connection Manager
 *
 * 管理 Local Device 的 WebSocket 连接状态
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceConnectionManager = void 0;
const events_1 = require("events");
class DeviceConnectionManager extends events_1.EventEmitter {
    logger;
    connections = new Map();
    heartbeatInterval = null;
    HEARTBEAT_TIMEOUT = 30000; // 30 seconds
    constructor(logger) {
        super();
        this.logger = logger;
        this.startHeartbeatMonitor();
    }
    /**
     * 注册设备连接
     */
    registerConnection(deviceId, metadata) {
        const now = new Date();
        const connection = {
            deviceId,
            connectedAt: now,
            lastHeartbeat: now,
            metadata,
        };
        this.connections.set(deviceId, connection);
        this.logger.info(`Device connected: ${deviceId}`, { metadata });
        this.emit('device.connected', { deviceId, connection });
    }
    /**
     * 注销设备连接
     */
    unregisterConnection(deviceId) {
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
    updateHeartbeat(deviceId) {
        const connection = this.connections.get(deviceId);
        if (connection) {
            connection.lastHeartbeat = new Date();
        }
    }
    /**
     * 检查设备是否在线
     */
    isDeviceOnline(deviceId) {
        return this.connections.has(deviceId);
    }
    /**
     * 获取所有在线设备
     */
    getOnlineDevices() {
        return Array.from(this.connections.keys());
    }
    /**
     * 获取设备连接信息
     */
    getConnection(deviceId) {
        return this.connections.get(deviceId);
    }
    /**
     * 启动心跳监控
     */
    startHeartbeatMonitor() {
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
    destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.connections.clear();
    }
}
exports.DeviceConnectionManager = DeviceConnectionManager;
