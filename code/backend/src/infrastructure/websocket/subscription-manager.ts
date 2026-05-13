export type WebSocketEventType =
  | 'new_message'
  | 'message_updated'
  | 'task_created'
  | 'task_updated'
  | 'task_claimed'
  | 'agent_status_changed'
  | 'channel_member_joined'
  | 'channel_member_left';

export const ALL_EVENT_TYPES: readonly WebSocketEventType[] = [
  'new_message',
  'message_updated',
  'task_created',
  'task_updated',
  'task_claimed',
  'agent_status_changed',
  'channel_member_joined',
  'channel_member_left',
];

interface Subscription {
  readonly connectionId: string;
  readonly eventTypes?: readonly WebSocketEventType[];
}

export class SubscriptionManager {
  private channelSubscriptions: Map<string, Map<string, Subscription>> = new Map();

  subscribe(connectionId: string, channelId: string, eventTypes?: WebSocketEventType[]): void {
    if (!this.channelSubscriptions.has(channelId)) {
      this.channelSubscriptions.set(channelId, new Map());
    }
    this.channelSubscriptions.get(channelId)!.set(connectionId, {
      connectionId,
      eventTypes: eventTypes?.length ? eventTypes : undefined,
    });
  }

  unsubscribe(connectionId: string, channelId: string): void {
    const subs = this.channelSubscriptions.get(channelId);
    if (subs) {
      subs.delete(connectionId);
      if (subs.size === 0) {
        this.channelSubscriptions.delete(channelId);
      }
    }
  }

  unsubscribeAll(connectionId: string): void {
    for (const [channelId, subs] of this.channelSubscriptions) {
      subs.delete(connectionId);
      if (subs.size === 0) {
        this.channelSubscriptions.delete(channelId);
      }
    }
  }

  getSubscribers(channelId: string, eventType?: string): string[] {
    const subs = this.channelSubscriptions.get(channelId);
    if (!subs) return [];

    const result: string[] = [];
    for (const [connId, sub] of subs) {
      if (!sub.eventTypes || !eventType || sub.eventTypes.includes(eventType as WebSocketEventType)) {
        result.push(connId);
      }
    }
    return result;
  }

  getSubscribedChannels(connectionId: string): string[] {
    const channels: string[] = [];
    for (const [channelId, subs] of this.channelSubscriptions) {
      if (subs.has(connectionId)) {
        channels.push(channelId);
      }
    }
    return channels;
  }

  getChannelSubscriberCount(channelId: string): number {
    return this.channelSubscriptions.get(channelId)?.size ?? 0;
  }

  getAllChannels(): string[] {
    return Array.from(this.channelSubscriptions.keys());
  }

  clear(): void {
    this.channelSubscriptions.clear();
  }
}
