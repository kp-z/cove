import { describe, it, expect, beforeEach } from 'vitest';
import { WebSocketEventPublisher } from './websocket-event-publisher';
import { ConnectionManager } from './connection-manager';
import { SubscriptionManager } from './subscription-manager';

function createMockWs() {
  const sent: string[] = [];
  return {
    send: (data: string) => sent.push(data),
    close: () => {},
    on: () => {},
    readyState: 1,
    _sent: sent,
  };
}

describe('WebSocketEventPublisher', () => {
  let connectionManager: ConnectionManager;
  let subscriptionManager: SubscriptionManager;
  let publisher: WebSocketEventPublisher;

  beforeEach(() => {
    connectionManager = new ConnectionManager();
    subscriptionManager = new SubscriptionManager();
    publisher = new WebSocketEventPublisher(connectionManager, subscriptionManager);
  });

  it('should publish to channel subscribers', async () => {
    const ws = createMockWs();
    const connId = connectionManager.addConnection('user-1', 'human', ws as any);
    subscriptionManager.subscribe(connId, 'channel-1');

    await publisher.publish('new_message', 'channel-1', { text: 'hello' });

    expect(ws._sent).toHaveLength(1);
    const parsed = JSON.parse(ws._sent[0]);
    expect(parsed.type).toBe('new_message');
    expect(parsed.payload.text).toBe('hello');
  });

  it('should not publish to non-subscribers', async () => {
    const ws = createMockWs();
    connectionManager.addConnection('user-1', 'human', ws as any);

    await publisher.publish('new_message', 'channel-1', { text: 'hello' });

    expect(ws._sent).toHaveLength(0);
  });

  it('should broadcast to all when channelId is empty', async () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    connectionManager.addConnection('user-1', 'human', ws1 as any);
    connectionManager.addConnection('user-2', 'human', ws2 as any);

    await publisher.publish('agent_status_changed', '', { agentId: 'a1', status: 'running' });

    expect(ws1._sent).toHaveLength(1);
    expect(ws2._sent).toHaveLength(1);
  });
});
