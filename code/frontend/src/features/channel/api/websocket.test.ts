/**
 * Agent Channel WebSocket Client - 单元测试
 *
 * 测试范围：
 * - 连接管理（连接、断开、重连）
 * - 频道订阅/取消订阅
 * - 消息接收和事件分发
 * - 心跳保活
 * - 事件监听器管理
 *
 * 测试策略：
 * - Mock WebSocket API
 * - 验证连接状态转换
 * - 验证消息发送和接收
 * - 验证自动重连逻辑
 * - 验证事件监听器触发
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentChannelWebSocketClient,
  type BroadcastMessage,
  type WebSocketEventListener,
} from './websocket';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    // Mock send - 可以在测试中验证
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Helper: 模拟连接成功
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  // Helper: 模拟接收消息
  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Helper: 模拟错误
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  // Helper: 模拟关闭
  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// 替换全局 WebSocket
global.WebSocket = MockWebSocket as any;

// ============================================================================
// Test Suite
// ============================================================================

describe('AgentChannelWebSocketClient', () => {
  let client: AgentChannelWebSocketClient;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    // 每个测试前创建新的客户端
    client = new AgentChannelWebSocketClient('ws://localhost:3000', 'user-1', 'human');
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 清理
    client.disconnect();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 构造函数测试
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('应该正确初始化客户端', () => {
      const testClient = new AgentChannelWebSocketClient(
        'ws://test.com',
        'user-123',
        'agent'
      );

      expect(testClient['url']).toBe('ws://test.com');
      expect(testClient['userId']).toBe('user-123');
      expect(testClient['userType']).toBe('agent');
      expect(testClient.getStatus()).toBe('disconnected');
    });

    it('应该默认 userType 为 human', () => {
      const testClient = new AgentChannelWebSocketClient('ws://test.com', 'user-123');
      expect(testClient['userType']).toBe('human');
    });
  });

  // --------------------------------------------------------------------------
  // 连接管理测试
  // --------------------------------------------------------------------------

  describe('connect', () => {
    it('应该成功连接到 WebSocket 服务器', async () => {
      // Arrange
      const connectPromise = client.connect();

      // 获取创建的 WebSocket 实例
      mockWs = client['ws'] as any;

      // Act - 模拟连接成功
      mockWs.simulateOpen();

      // Assert
      await connectPromise;
      expect(client.getStatus()).toBe('connected');
      expect(client.isConnected()).toBe(true);
      expect(mockWs.url).toContain('userId=user-1');
      expect(mockWs.url).toContain('userType=human');
    });

    it('应该在连接失败时抛出错误', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;

      // Act - 模拟连接错误
      mockWs.simulateError();

      // Assert
      await expect(connectPromise).rejects.toThrow();
      expect(client.getStatus()).toBe('error');
    });

    it('应该在已连接时直接返回', async () => {
      // Arrange - 先连接
      const connectPromise1 = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise1;

      // Act - 再次连接
      const connectPromise2 = client.connect();

      // Assert - 应该立即 resolve
      await expect(connectPromise2).resolves.toBeUndefined();
    });

    it('应该在连接成功后启动心跳', async () => {
      // Arrange
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;

      // Act - 模拟连接成功
      mockWs.simulateOpen();
      await connectPromise;

      // 快进 30 秒（心跳间隔）
      vi.advanceTimersByTime(30000);

      // Assert - 应该发送心跳消息
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'heartbeat' })
      );
    });
  });

  describe('disconnect', () => {
    it('应该正确断开连接', async () => {
      // Arrange - 先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act - 断开连接
      client.disconnect();

      // Assert
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
      expect(client['ws']).toBeNull();
    });

    it('应该清除已订阅的频道', async () => {
      // Arrange - 先连接并订阅
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      client.subscribe('channel-1');
      client.subscribe('channel-2');
      expect(client.getSubscribedChannels()).toHaveLength(2);

      // Act - 断开连接
      client.disconnect();

      // Assert
      expect(client.getSubscribedChannels()).toHaveLength(0);
    });

    it('应该停止心跳检测', async () => {
      // Arrange - 先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      // Act - 断开连接
      client.disconnect();

      // 快进 30 秒
      vi.advanceTimersByTime(30000);

      // Assert - 不应该再发送心跳
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('自动重连', () => {
    it('应该在连接关闭后自动重连', async () => {
      // Arrange - 先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act - 模拟连接关闭
      mockWs.simulateClose();

      // 快进重连延迟（1秒 * 重连次数）
      vi.advanceTimersByTime(1000);

      // 获取新的 WebSocket 实例
      const newMockWs = client['ws'] as any;

      // 模拟重连成功
      newMockWs.simulateOpen();

      // Assert
      await vi.runAllTimersAsync();
      expect(client.getStatus()).toBe('connected');
    });

    it('应该在达到最大重连次数后停止重连', async () => {
      // Arrange - 先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act - 模拟多次连接失败
      for (let i = 0; i < 5; i++) {
        mockWs.simulateClose();
        vi.advanceTimersByTime((i + 1) * 1000);

        const newMockWs = client['ws'] as any;
        if (newMockWs) {
          newMockWs.simulateError();
        }
      }

      // Assert - 应该停止重连
      expect(client['reconnectAttempts']).toBe(5);
    });

    it('应该在重连成功后重置重连计数', async () => {
      // Arrange - 先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act - 模拟连接关闭
      mockWs.simulateClose();
      vi.advanceTimersByTime(1000);

      // 模拟重连成功
      const newMockWs = client['ws'] as any;
      newMockWs.simulateOpen();

      // Assert
      await vi.runAllTimersAsync();
      expect(client['reconnectAttempts']).toBe(0);
    });
  });

  describe('getStatus / isConnected', () => {
    it('应该正确返回连接状态', async () => {
      // 初始状态
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);

      // 连接中
      const connectPromise = client.connect();
      expect(client.getStatus()).toBe('connecting');

      // 连接成功
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;
      expect(client.getStatus()).toBe('connected');
      expect(client.isConnected()).toBe(true);

      // 断开连接
      client.disconnect();
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 频道订阅测试
  // --------------------------------------------------------------------------

  describe('subscribe / unsubscribe', () => {
    beforeEach(async () => {
      // 每个测试前先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('应该成功订阅频道', () => {
      // Arrange
      const sendSpy = vi.spyOn(mockWs, 'send');

      // Act
      client.subscribe('channel-1');

      // Assert
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'subscribe', channelId: 'channel-1' })
      );
      expect(client.getSubscribedChannels()).toContain('channel-1');
    });

    it('应该成功取消订阅频道', () => {
      // Arrange
      client.subscribe('channel-1');
      const sendSpy = vi.spyOn(mockWs, 'send');

      // Act
      client.unsubscribe('channel-1');

      // Assert
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'unsubscribe', channelId: 'channel-1' })
      );
      expect(client.getSubscribedChannels()).not.toContain('channel-1');
    });

    it('应该支持订阅多个频道', () => {
      // Act
      client.subscribe('channel-1');
      client.subscribe('channel-2');
      client.subscribe('channel-3');

      // Assert
      const subscribed = client.getSubscribedChannels();
      expect(subscribed).toHaveLength(3);
      expect(subscribed).toContain('channel-1');
      expect(subscribed).toContain('channel-2');
      expect(subscribed).toContain('channel-3');
    });

    it('应该在未连接时不发送订阅消息', () => {
      // Arrange
      client.disconnect();
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      // Act
      client.subscribe('channel-1');

      // Assert - 不应该调用 send
      expect(sendSpy).not.toHaveBeenCalled();
      // 但应该记录订阅状态
      expect(client.getSubscribedChannels()).toContain('channel-1');
    });
  });

  // --------------------------------------------------------------------------
  // 消息接收和事件分发测试
  // --------------------------------------------------------------------------

  describe('消息接收和事件监听', () => {
    beforeEach(async () => {
      // 每个测试前先连接
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('应该接收并解析 WebSocket 消息', () => {
      // Arrange
      const listener = vi.fn();
      client.on('*', listener);

      const message: BroadcastMessage = {
        type: 'message',
        channelId: 'channel-1',
        senderId: 'user-2',
        senderName: 'Alice',
        content: 'Hello!',
        timestamp: '2024-01-01T00:00:00Z',
      };

      // Act
      mockWs.simulateMessage(JSON.stringify(message));

      // Assert
      expect(listener).toHaveBeenCalledWith(message);
    });

    it('应该触发全局监听器（*）', () => {
      // Arrange
      const listener = vi.fn();
      client.on('*', listener);

      const message: BroadcastMessage = {
        type: 'notification',
        content: 'System notification',
        timestamp: '2024-01-01T00:00:00Z',
      };

      // Act
      mockWs.simulateMessage(JSON.stringify(message));

      // Assert
      expect(listener).toHaveBeenCalledWith(message);
    });

    it('应该触发频道特定监听器', () => {
      // Arrange
      const listener = vi.fn();
      client.on('channel-1', listener);

      const message: BroadcastMessage = {
        type: 'message',
        channelId: 'channel-1',
        content: 'Channel message',
        timestamp: '2024-01-01T00:00:00Z',
      };

      // Act
      mockWs.simulateMessage(JSON.stringify(message));

      // Assert
      expect(listener).toHaveBeenCalledWith(message);
    });

    it('应该触发消息类型监听器', () => {
      // Arrange
      const listener = vi.fn();
      client.on('type:error', listener);

      const message: BroadcastMessage = {
        type: 'error',
        content: 'Error occurred',
        timestamp: '2024-01-01T00:00:00Z',
      };

      // Act
      mockWs.simulateMessage(JSON.stringify(message));

      // Assert
      expect(listener).toHaveBeenCalledWith(message);
    });

    it('应该支持多个监听器', () => {
      // Arrange
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      client.on('*', listener1);
      client.on('channel-1', listener2);
      client.on('type:message', listener3);

      const message: BroadcastMessage = {
        type: 'message',
        channelId: 'channel-1',
        content: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
      };

      // Act
      mockWs.simulateMessage(JSON.stringify(message));

      // Assert - 所有监听器都应该被触发
      expect(listener1).toHaveBeenCalledWith(message);
      expect(listener2).toHaveBeenCalledWith(message);
      expect(listener3).toHaveBeenCalledWith(message);
    });

    it('应该处理无效的 JSON 消息', () => {
      // Arrange
      const listener = vi.fn();
      client.on('*', listener);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      mockWs.simulateMessage('invalid json');

      // Assert
      expect(listener).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('应该捕获监听器中的错误', () => {
      // Arrange
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      client.on('*', errorListener);
      client.on('*', normalListener);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const message: BroadcastMessage = {
        type: 'message',
        content: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
      };

      // Act
      mockWs.simulateMessage(JSON.stringify(message));

      // Assert - 错误不应该影响其他监听器
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 事件监听器管理测试
  // --------------------------------------------------------------------------

  describe('on / off / removeAllListeners', () => {
    it('应该正确添加和移除监听器', () => {
      // Arrange
      const listener: WebSocketEventListener = vi.fn();

      // Act - 添加监听器
      client.on('test-event', listener);
      expect(client['listeners'].get('test-event')?.has(listener)).toBe(true);

      // Act - 移除监听器
      client.off('test-event', listener);
      expect(client['listeners'].has('test-event')).toBe(false);
    });

    it('应该支持同一事件的多个监听器', () => {
      // Arrange
      const listener1: WebSocketEventListener = vi.fn();
      const listener2: WebSocketEventListener = vi.fn();

      // Act
      client.on('test-event', listener1);
      client.on('test-event', listener2);

      // Assert
      const listeners = client['listeners'].get('test-event');
      expect(listeners?.size).toBe(2);
      expect(listeners?.has(listener1)).toBe(true);
      expect(listeners?.has(listener2)).toBe(true);
    });

    it('应该移除特定事件的所有监听器', () => {
      // Arrange
      const listener1: WebSocketEventListener = vi.fn();
      const listener2: WebSocketEventListener = vi.fn();

      client.on('event-1', listener1);
      client.on('event-1', listener2);
      client.on('event-2', listener1);

      // Act
      client.removeAllListeners('event-1');

      // Assert
      expect(client['listeners'].has('event-1')).toBe(false);
      expect(client['listeners'].has('event-2')).toBe(true);
    });

    it('应该移除所有事件的所有监听器', () => {
      // Arrange
      const listener: WebSocketEventListener = vi.fn();

      client.on('event-1', listener);
      client.on('event-2', listener);
      client.on('event-3', listener);

      // Act
      client.removeAllListeners();

      // Assert
      expect(client['listeners'].size).toBe(0);
    });

    it('应该在移除不存在的监听器时不报错', () => {
      // Arrange
      const listener: WebSocketEventListener = vi.fn();

      // Act & Assert - 不应该抛出错误
      expect(() => {
        client.off('non-existent', listener);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // 心跳保活测试
  // --------------------------------------------------------------------------

  describe('心跳保活', () => {
    it('应该定期发送心跳消息', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      const sendSpy = vi.spyOn(mockWs, 'send');

      // Act - 快进 30 秒
      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'heartbeat' })
      );

      // Act - 再快进 30 秒
      vi.advanceTimersByTime(30000);

      // Assert - 应该再次发送
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('应该在断开连接时停止心跳', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act - 断开连接
      client.disconnect();

      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      // 快进 30 秒
      vi.advanceTimersByTime(30000);

      // Assert - 不应该发送心跳
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('应该在未连接时不发送心跳', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // 模拟连接断开（但不调用 disconnect）
      mockWs.readyState = MockWebSocket.CLOSED;

      const sendSpy = vi.spyOn(mockWs, 'send');

      // Act - 快进 30 秒
      vi.advanceTimersByTime(30000);

      // Assert - 不应该发送心跳
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
