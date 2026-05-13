interface WebSocket {
  send(data: string): void;
  close(): void;
  on(event: string, handler: (...args: any[]) => void): void;
  readyState: number;
}

export interface ConnectionInfo {
  readonly connectionId: string;
  readonly userId: string;
  readonly userType: 'human' | 'agent';
  readonly ws: WebSocket;
  readonly connectedAt: Date;
  lastHeartbeat: Date;
}

export class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();

  addConnection(userId: string, userType: 'human' | 'agent', ws: WebSocket): string {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const info: ConnectionInfo = {
      connectionId,
      userId,
      userType,
      ws,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.connections.set(connectionId, info);

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    return connectionId;
  }

  removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    const userConns = this.userConnections.get(conn.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(conn.userId);
      }
    }

    this.connections.delete(connectionId);
  }

  getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connections.get(connectionId);
  }

  getConnectionsByUser(userId: string): ConnectionInfo[] {
    const connIds = this.userConnections.get(userId);
    if (!connIds) return [];
    return Array.from(connIds)
      .map(id => this.connections.get(id))
      .filter((c): c is ConnectionInfo => c !== undefined);
  }

  updateHeartbeat(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.lastHeartbeat = new Date();
    }
  }

  getStaleConnections(timeoutMs: number): string[] {
    const now = Date.now();
    const stale: string[] = [];
    for (const [id, conn] of this.connections) {
      if (now - conn.lastHeartbeat.getTime() > timeoutMs) {
        stale.push(id);
      }
    }
    return stale;
  }

  getAllConnections(): Map<string, ConnectionInfo> {
    return this.connections;
  }

  sendToConnection(connectionId: string, data: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;
    try {
      conn.ws.send(data);
    } catch {
      // Connection may be closed
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  clear(): void {
    for (const [, conn] of this.connections) {
      try { conn.ws.close(); } catch { /* ignore */ }
    }
    this.connections.clear();
    this.userConnections.clear();
  }
}
