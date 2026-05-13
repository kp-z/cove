import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AgentChannelWebSocketClient,
  type BroadcastMessage,
  type WebSocketEventListener,
} from './websocket';

// ============================================================================
// Mock Setup
// ============================================================================

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
    // Mock send
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: string): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

global.WebSocket = MockWebSocket as any;

// ============================================================================
// Test Suite
// ============================================================================

describe('AgentChannelWebSocketClient', () => {
  let client: AgentChannelWebSocketClient;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    client = new AgentChannelWebSocketClient('ws://localhost:3000', 'user-1', 'human');
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    client.disconnect();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('should correctly initialize the client', () => {
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

    it('should default userType to human', () => {
      const testClient = new AgentChannelWebSocketClient('ws://test.com', 'user-123');
      expect(testClient['userType']).toBe('human');
    });
  });

  // --------------------------------------------------------------------------
  // connection management
  // --------------------------------------------------------------------------

  describe('connect', () => {
    it('should successfully connect to WebSocket server', async () => {
      // Arrange
      const connectPromise = client.connect();

      mockWs = client['ws'] as any;

      // Act
      mockWs.simulateOpen();

      // Assert
      await connectPromise;
      expect(client.getStatus()).toBe('connected');
      expect(client.isConnected()).toBe(true);
      expect(mockWs.url).toContain('userId=user-1');
      expect(mockWs.url).toContain('userType=human');
    });

    it('should throw error when connection fails', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;

      // Act
      mockWs.simulateError();

      // Assert
      await expect(connectPromise).rejects.toThrow();
      expect(client.getStatus()).toBe('error');
    });

    it('should return immediately when already connected', async () => {
      // Arrange
      const connectPromise1 = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise1;

      // Act
      const connectPromise2 = client.connect();

      // Assert
      await expect(connectPromise2).resolves.toBeUndefined();
    });

    it('should start heartbeat after successful connection', async () => {
      // Arrange
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;

      // Act
      mockWs.simulateOpen();
      await connectPromise;

      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'heartbeat' })
      );
    });
  });

  describe('disconnect', () => {
    it('should correctly disconnect', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act
      client.disconnect();

      // Assert
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
      expect(client['ws']).toBeNull();
    });

    it('should clear subscribed channels', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      client.subscribe('channel-1');
      client.subscribe('channel-2');
      expect(client.getSubscribedChannels()).toHaveLength(2);

      // Act
      client.disconnect();

      // Assert
      expect(client.getSubscribedChannels()).toHaveLength(0);
    });

    it('should stop heartbeat', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      // Act
      client.disconnect();

      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('auto reconnect', () => {
    it('should auto-reconnect after connection closes', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act
      mockWs.simulateClose();

      vi.advanceTimersByTime(1000);

      const newMockWs = client['ws'] as any;

      newMockWs.simulateOpen();

      // Assert
      await vi.runAllTimersAsync();
      expect(client.getStatus()).toBe('connected');
    });

    it('should stop reconnecting after max attempts reached', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act
      for (let i = 0; i < 5; i++) {
        mockWs.simulateClose();
        vi.advanceTimersByTime((i + 1) * 1000);

        const newMockWs = client['ws'] as any;
        if (newMockWs) {
          newMockWs.simulateError();
        }
      }

      // Assert
      expect(client['reconnectAttempts']).toBe(5);
    });

    it('should reset reconnect count after successful reconnection', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act
      mockWs.simulateClose();
      vi.advanceTimersByTime(1000);

      const newMockWs = client['ws'] as any;
      newMockWs.simulateOpen();

      // Assert
      await vi.runAllTimersAsync();
      expect(client['reconnectAttempts']).toBe(0);
    });
  });

  describe('getStatus / isConnected', () => {
    it('should correctly return connection status', async () => {
      // Initial state
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);

      // Connecting
      const connectPromise = client.connect();
      expect(client.getStatus()).toBe('connecting');

      // Connected
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;
      expect(client.getStatus()).toBe('connected');
      expect(client.isConnected()).toBe(true);

      // Disconnected
      client.disconnect();
      expect(client.getStatus()).toBe('disconnected');
      expect(client.isConnected()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // channel subscription
  // --------------------------------------------------------------------------

  describe('subscribe / unsubscribe', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should successfully subscribe to a channel', () => {
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

    it('should successfully unsubscribe from a channel', () => {
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

    it('should support subscribing to multiple channels', () => {
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

    it('should not send subscribe message when disconnected', () => {
      // Arrange
      client.disconnect();
      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      // Act
      client.subscribe('channel-1');

      // Assert
      expect(sendSpy).not.toHaveBeenCalled();
      expect(client.getSubscribedChannels()).toContain('channel-1');
    });
  });

  // --------------------------------------------------------------------------
  // message receiving and event dispatching
  // --------------------------------------------------------------------------

  describe('message receiving and event listeners', () => {
    beforeEach(async () => {
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;
    });

    it('should receive and parse WebSocket messages', () => {
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

    it('should trigger global listener (*)', () => {
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

    it('should trigger channel-specific listener', () => {
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

    it('should trigger message type listener', () => {
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

    it('should support multiple listeners', () => {
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

      // Assert
      expect(listener1).toHaveBeenCalledWith(message);
      expect(listener2).toHaveBeenCalledWith(message);
      expect(listener3).toHaveBeenCalledWith(message);
    });

    it('should handle invalid JSON messages', () => {
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

    it('should catch errors thrown in listeners', () => {
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

      // Assert
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // event listener management
  // --------------------------------------------------------------------------

  describe('on / off / removeAllListeners', () => {
    it('should correctly add and remove listeners', () => {
      // Arrange
      const listener: WebSocketEventListener = vi.fn();

      // Act - add listener
      client.on('test-event', listener);
      expect(client['listeners'].get('test-event')?.has(listener)).toBe(true);

      // Act - remove listener
      client.off('test-event', listener);
      expect(client['listeners'].has('test-event')).toBe(false);
    });

    it('should support multiple listeners for the same event', () => {
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

    it('should remove all listeners for a specific event', () => {
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

    it('should remove all listeners for all events', () => {
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

    it('should not throw when removing a non-existent listener', () => {
      // Arrange
      const listener: WebSocketEventListener = vi.fn();

      // Act & Assert
      expect(() => {
        client.off('non-existent', listener);
      }).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // heartbeat
  // --------------------------------------------------------------------------

  describe('heartbeat', () => {
    it('should periodically send heartbeat messages', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      const sendSpy = vi.spyOn(mockWs, 'send');

      // Act
      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'heartbeat' })
      );

      // Act
      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('should stop heartbeat when disconnected', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      // Act
      client.disconnect();

      const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send');

      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not send heartbeat when not connected', async () => {
      // Arrange
      const connectPromise = client.connect();
      mockWs = client['ws'] as any;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.readyState = MockWebSocket.CLOSED;

      const sendSpy = vi.spyOn(mockWs, 'send');

      // Act
      vi.advanceTimersByTime(30000);

      // Assert
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });
});
