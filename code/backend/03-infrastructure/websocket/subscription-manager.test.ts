import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionManager } from './subscription-manager';

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  it('should subscribe and get subscribers', () => {
    manager.subscribe('conn-1', 'channel-1');
    expect(manager.getSubscribers('channel-1')).toEqual(['conn-1']);
  });

  it('should filter by event type', () => {
    manager.subscribe('conn-1', 'channel-1', ['new_message']);
    manager.subscribe('conn-2', 'channel-1', ['task_updated']);
    expect(manager.getSubscribers('channel-1', 'new_message')).toEqual(['conn-1']);
    expect(manager.getSubscribers('channel-1', 'task_updated')).toEqual(['conn-2']);
  });

  it('should return all subscribers when no event filter on subscription', () => {
    manager.subscribe('conn-1', 'channel-1');
    expect(manager.getSubscribers('channel-1', 'new_message')).toEqual(['conn-1']);
  });

  it('should unsubscribe from a channel', () => {
    manager.subscribe('conn-1', 'channel-1');
    manager.unsubscribe('conn-1', 'channel-1');
    expect(manager.getSubscribers('channel-1')).toEqual([]);
  });

  it('should unsubscribe from all channels', () => {
    manager.subscribe('conn-1', 'channel-1');
    manager.subscribe('conn-1', 'channel-2');
    manager.unsubscribeAll('conn-1');
    expect(manager.getSubscribers('channel-1')).toEqual([]);
    expect(manager.getSubscribers('channel-2')).toEqual([]);
  });

  it('should get subscribed channels for a connection', () => {
    manager.subscribe('conn-1', 'channel-1');
    manager.subscribe('conn-1', 'channel-2');
    expect(manager.getSubscribedChannels('conn-1').sort()).toEqual(['channel-1', 'channel-2']);
  });
});
