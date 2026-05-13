import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionManager } from './connection-manager';

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

describe('ConnectionManager', () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    manager = new ConnectionManager();
  });

  it('should add and retrieve a connection', () => {
    const ws = createMockWs();
    const connId = manager.addConnection('user-1', 'human', ws as any);
    expect(manager.getConnection(connId)).toBeDefined();
    expect(manager.getConnection(connId)!.userId).toBe('user-1');
  });

  it('should support multi-device per user', () => {
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    manager.addConnection('user-1', 'human', ws1 as any);
    manager.addConnection('user-1', 'human', ws2 as any);
    expect(manager.getConnectionsByUser('user-1')).toHaveLength(2);
  });

  it('should remove a connection', () => {
    const ws = createMockWs();
    const connId = manager.addConnection('user-1', 'human', ws as any);
    manager.removeConnection(connId);
    expect(manager.getConnection(connId)).toBeUndefined();
    expect(manager.getConnectionsByUser('user-1')).toHaveLength(0);
  });

  it('should send data to a connection', () => {
    const ws = createMockWs();
    const connId = manager.addConnection('user-1', 'human', ws as any);
    manager.sendToConnection(connId, '{"test":true}');
    expect(ws._sent).toHaveLength(1);
  });

  it('should detect stale connections', () => {
    const ws = createMockWs();
    const connId = manager.addConnection('user-1', 'human', ws as any);
    const conn = manager.getConnection(connId)!;
    conn.lastHeartbeat = new Date(Date.now() - 100000);
    expect(manager.getStaleConnections(90000)).toContain(connId);
  });
});
