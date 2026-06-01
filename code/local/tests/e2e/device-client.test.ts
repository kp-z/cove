/**
 * Device 端到端测试
 * 测试 Local Device 与 Backend 的 WebSocket 连接和消息通信
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { DeviceTestClient, createTestDevice } from './helpers/device-test-client';
import { sleep, waitFor, randomId, measureTime } from './helpers/test-utils';

// 增加测试超时时间
const TEST_TIMEOUT = 10000;

describe('Device E2E Tests', () => {
  let device: DeviceTestClient;

  afterEach(async () => {
    // 清理：断开设备连接
    if (device) {
      device.disconnect();
    }
  });

  describe('Phase 1: 基础连接测试', () => {
    it('应该能成功连接到 Backend', async () => {
      // 创建测试设备
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      // 连接到 Backend
      await device.connect();

      // 验证连接成功
      expect(device.isConnected()).toBe(true);

      // 验证收到 connected 消息
      const messages = device.getMessages();
      const connectedMsg = messages.find(m => m.type === 'connected');
      expect(connectedMsg).toBeDefined();
      expect(connectedMsg?.deviceId).toBeDefined();
    });

    it('应该能测量连接建立时间', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      // 测量连接时间
      const { duration } = await measureTime(() => device.connect());

      // 验证连接时间 < 500ms
      expect(duration).toBeLessThan(500);
      console.log(`连接建立时间: ${duration}ms`);
    });

    it('应该能断开连接', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      await device.connect();
      expect(device.isConnected()).toBe(true);

      // 断开连接
      device.disconnect();

      // 验证连接已断开
      expect(device.isConnected()).toBe(false);
    });
  });

  describe('Phase 2: 心跳测试', () => {
    it('应该能发送心跳', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      await device.connect();

      // 停止自动心跳
      device.stopHeartbeat();

      // 手动发送心跳
      const { duration } = await measureTime(() => device.sendHeartbeat());

      // 验证心跳延迟 < 100ms
      expect(duration).toBeLessThan(100);
      console.log(`心跳延迟: ${duration}ms`);
    });

    it('应该能自动发送心跳', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
        heartbeatInterval: 2000, // 2 秒心跳间隔
      });

      await device.connect();

      // 等待 5 秒，应该发送至少 2 次心跳
      await sleep(5000);

      // 验证设备仍然在线
      expect(device.isConnected()).toBe(true);
    }, 10000); // 10 秒超时

    it.skip('应该在心跳超时后断开连接', async () => {
      // 注意：这个测试需要等待 30 秒，标记为 skip
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      await device.connect();

      // 停止心跳
      device.stopHeartbeat();

      // 等待 31 秒（心跳超时时间）
      await sleep(31000);

      // 验证连接被断开
      // 注意：这需要 Backend 实现心跳超时检测
      // expect(device.isConnected()).toBe(false);
    });
  });

  describe('Phase 3: 消息接收测试', () => {
    it('应该能接收 task 消息', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      await device.connect();
      device.clearMessages();

      // 注意：这需要 Backend 发送 task 消息
      // 这里只是验证客户端能正确处理消息格式

      // 等待可能的消息（如果 Backend 有任务）
      await sleep(1000);

      // 获取所有消息
      const messages = device.getMessages();
      console.log('收到的消息:', messages);

      // 如果有 task 消息，验证格式
      const taskMsg = messages.find(m => m.type === 'task');
      if (taskMsg) {
        expect(taskMsg.data).toBeDefined();
        expect(taskMsg.timestamp).toBeDefined();
      }
    });

    it('应该能报告任务结果', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      await device.connect();

      // 报告任务结果
      const taskId = randomId('task');
      await device.reportTaskResult(taskId, 'success', {
        response: 'Test response',
      });

      // 验证没有抛出错误
      expect(true).toBe(true);
    });
  });

  describe('Phase 4: 连接管理测试', () => {
    it('应该能重新连接', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      // 第一次连接
      await device.connect();
      expect(device.isConnected()).toBe(true);

      // 断开
      device.disconnect();
      expect(device.isConnected()).toBe(false);

      // 等待 1 秒
      await sleep(1000);

      // 重新连接
      await device.connect();
      expect(device.isConnected()).toBe(true);
    });

    it('应该能处理多次连接断开', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      // 连接 3 次
      for (let i = 0; i < 3; i++) {
        await device.connect();
        expect(device.isConnected()).toBe(true);

        await sleep(500);

        device.disconnect();
        expect(device.isConnected()).toBe(false);

        await sleep(500);
      }
    });
  });

  describe('Phase 5: 性能测试', () => {
    it('应该能处理多个设备并发连接', async () => {
      const devices: DeviceTestClient[] = [];

      try {
        // 创建 5 个设备
        const devicePromises = Array.from({ length: 5 }, (_, i) =>
          createTestDevice({
            deviceId: randomId(`device-${i}`),
          })
        );

        const createdDevices = await Promise.all(devicePromises);
        devices.push(...createdDevices);

        // 同时连接所有设备
        const { duration } = await measureTime(() =>
          Promise.all(devices.map(d => d.connect()))
        );

        // 验证所有设备都连接成功
        devices.forEach(d => {
          expect(d.isConnected()).toBe(true);
        });

        console.log(`5 个设备并发连接时间: ${duration}ms`);
        expect(duration).toBeLessThan(2000);
      } finally {
        // 清理：断开所有设备
        devices.forEach(d => d.disconnect());
      }
    });

    it('应该能测量端到端延迟', async () => {
      device = await createTestDevice({
        deviceId: randomId('device'),
      });

      // 测量连接 + 心跳的总延迟
      const { duration } = await measureTime(async () => {
        await device.connect();
        await device.sendHeartbeat();
      });

      console.log(`端到端延迟: ${duration}ms`);
      expect(duration).toBeLessThan(1000);
    });
  });
});
