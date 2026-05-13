import { IEventPublisher } from '../../02-application/interfaces/event-publisher.interface';
import { ConnectionManager } from './connection-manager';
import { SubscriptionManager } from './subscription-manager';

export class WebSocketEventPublisher implements IEventPublisher {
  constructor(
    private readonly connectionManager: ConnectionManager,
    private readonly subscriptionManager: SubscriptionManager
  ) {}

  async publish(eventType: string, channelId: string, payload: Record<string, unknown>): Promise<void> {
    const message = JSON.stringify({
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
    });

    if (channelId) {
      const subscribers = this.subscriptionManager.getSubscribers(channelId, eventType);
      for (const connectionId of subscribers) {
        this.connectionManager.sendToConnection(connectionId, message);
      }
    } else {
      for (const [connectionId] of this.connectionManager.getAllConnections()) {
        this.connectionManager.sendToConnection(connectionId, message);
      }
    }
  }
}
