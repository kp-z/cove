import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from './in-memory-event-bus';
import { DomainEvent } from '../../application/interfaces/event-bus.interface';

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
  });

  describe('subscribe', () => {
    it('should subscribe to an event type', () => {
      const handler = vi.fn();

      eventBus.subscribe('test.event', handler);

      expect(eventBus.getHandlerCount('test.event')).toBe(1);
      expect(eventBus.getEventTypes()).toContain('test.event');
    });

    it('should allow multiple handlers for the same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);

      expect(eventBus.getHandlerCount('test.event')).toBe(2);
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.subscribe('test.event', handler);
      expect(eventBus.getHandlerCount('test.event')).toBe(1);

      unsubscribe();
      expect(eventBus.getHandlerCount('test.event')).toBe(0);
    });
  });

  describe('subscribeMany', () => {
    it('should subscribe to multiple event types', () => {
      const handler = vi.fn();

      eventBus.subscribeMany(['event1', 'event2', 'event3'], handler);

      expect(eventBus.getHandlerCount('event1')).toBe(1);
      expect(eventBus.getHandlerCount('event2')).toBe(1);
      expect(eventBus.getHandlerCount('event3')).toBe(1);
      expect(eventBus.getEventTypes()).toEqual(expect.arrayContaining(['event1', 'event2', 'event3']));
    });

    it('should return unsubscribe function that removes all subscriptions', () => {
      const handler = vi.fn();

      const unsubscribe = eventBus.subscribeMany(['event1', 'event2'], handler);
      expect(eventBus.getHandlerCount('event1')).toBe(1);
      expect(eventBus.getHandlerCount('event2')).toBe(1);

      unsubscribe();
      expect(eventBus.getHandlerCount('event1')).toBe(0);
      expect(eventBus.getHandlerCount('event2')).toBe(0);
    });
  });

  describe('publish', () => {
    it('should publish event to subscribed handlers', async () => {
      const handler = vi.fn();
      const event: DomainEvent = {
        eventType: 'test.event',
        aggregateId: 'test-id',
        occurredAt: new Date(),
        payload: { data: 'test' },
      };

      eventBus.subscribe('test.event', handler);
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should publish event to multiple handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const event: DomainEvent = {
        eventType: 'test.event',
        aggregateId: 'test-id',
        occurredAt: new Date(),
        payload: { data: 'test' },
      };

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);
      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should not throw when no handlers are subscribed', async () => {
      const event: DomainEvent = {
        eventType: 'test.event',
        aggregateId: 'test-id',
        occurredAt: new Date(),
        payload: { data: 'test' },
      };

      await expect(eventBus.publish(event)).resolves.not.toThrow();
    });

    it('should isolate errors in handlers', async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler 1 failed'));
      const handler2 = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event: DomainEvent = {
        eventType: 'test.event',
        aggregateId: 'test-id',
        occurredAt: new Date(),
        payload: { data: 'test' },
      };

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);

      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for test.event'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle async handlers', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const event: DomainEvent = {
        eventType: 'test.event',
        aggregateId: 'test-id',
        occurredAt: new Date(),
        payload: { data: 'test' },
      };

      eventBus.subscribe('test.event', handler);
      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events in order', async () => {
      const handler = vi.fn();
      const events: DomainEvent[] = [
        {
          eventType: 'test.event',
          aggregateId: 'id-1',
          occurredAt: new Date(),
          payload: { order: 1 },
        },
        {
          eventType: 'test.event',
          aggregateId: 'id-2',
          occurredAt: new Date(),
          payload: { order: 2 },
        },
        {
          eventType: 'test.event',
          aggregateId: 'id-3',
          occurredAt: new Date(),
          payload: { order: 3 },
        },
      ];

      eventBus.subscribe('test.event', handler);
      await eventBus.publishBatch(events);

      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler).toHaveBeenNthCalledWith(1, events[0]);
      expect(handler).toHaveBeenNthCalledWith(2, events[1]);
      expect(handler).toHaveBeenNthCalledWith(3, events[2]);
    });

    it('should handle empty event array', async () => {
      await expect(eventBus.publishBatch([])).resolves.not.toThrow();
    });

    it('should publish events to different handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const events: DomainEvent[] = [
        {
          eventType: 'event1',
          aggregateId: 'id-1',
          occurredAt: new Date(),
          payload: {},
        },
        {
          eventType: 'event2',
          aggregateId: 'id-2',
          occurredAt: new Date(),
          payload: {},
        },
      ];

      eventBus.subscribe('event1', handler1);
      eventBus.subscribe('event2', handler2);
      await eventBus.publishBatch(events);

      expect(handler1).toHaveBeenCalledWith(events[0]);
      expect(handler2).toHaveBeenCalledWith(events[1]);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe handler from event type', () => {
      const handler = vi.fn();

      eventBus.subscribe('test.event', handler);
      expect(eventBus.getHandlerCount('test.event')).toBe(1);

      eventBus.unsubscribe('test.event', handler);
      expect(eventBus.getHandlerCount('test.event')).toBe(0);
    });

    it('should remove event type when no handlers remain', () => {
      const handler = vi.fn();

      eventBus.subscribe('test.event', handler);
      expect(eventBus.getEventTypes()).toContain('test.event');

      eventBus.unsubscribe('test.event', handler);
      expect(eventBus.getEventTypes()).not.toContain('test.event');
    });

    it('should not throw when unsubscribing non-existent handler', () => {
      const handler = vi.fn();

      expect(() => eventBus.unsubscribe('test.event', handler)).not.toThrow();
    });

    it('should only remove specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);
      expect(eventBus.getHandlerCount('test.event')).toBe(2);

      eventBus.unsubscribe('test.event', handler1);
      expect(eventBus.getHandlerCount('test.event')).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all subscriptions', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('event1', handler1);
      eventBus.subscribe('event2', handler2);
      expect(eventBus.getEventTypes()).toHaveLength(2);

      eventBus.clear();
      expect(eventBus.getEventTypes()).toHaveLength(0);
      expect(eventBus.getHandlerCount('event1')).toBe(0);
      expect(eventBus.getHandlerCount('event2')).toBe(0);
    });

    it('should allow new subscriptions after clear', () => {
      const handler = vi.fn();

      eventBus.subscribe('test.event', handler);
      eventBus.clear();

      eventBus.subscribe('new.event', handler);
      expect(eventBus.getHandlerCount('new.event')).toBe(1);
    });
  });

  describe('getHandlerCount', () => {
    it('should return 0 for non-existent event type', () => {
      expect(eventBus.getHandlerCount('non.existent')).toBe(0);
    });

    it('should return correct count for subscribed event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.subscribe('test.event', handler1);
      eventBus.subscribe('test.event', handler2);

      expect(eventBus.getHandlerCount('test.event')).toBe(2);
    });
  });

  describe('getEventTypes', () => {
    it('should return empty array when no subscriptions', () => {
      expect(eventBus.getEventTypes()).toEqual([]);
    });

    it('should return all subscribed event types', () => {
      const handler = vi.fn();

      eventBus.subscribe('event1', handler);
      eventBus.subscribe('event2', handler);
      eventBus.subscribe('event3', handler);

      const eventTypes = eventBus.getEventTypes();
      expect(eventTypes).toHaveLength(3);
      expect(eventTypes).toEqual(expect.arrayContaining(['event1', 'event2', 'event3']));
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex subscription and publishing workflow', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      // Subscribe to different events
      eventBus.subscribe('user.created', handler1);
      eventBus.subscribe('user.updated', handler2);
      const unsubscribe = eventBus.subscribeMany(['user.created', 'user.deleted'], handler3);

      // Publish events
      await eventBus.publish({
        eventType: 'user.created',
        aggregateId: 'user-1',
        occurredAt: new Date(),
        payload: { name: 'John' },
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);
      expect(handler3).toHaveBeenCalledTimes(1);

      // Unsubscribe handler3
      unsubscribe();

      await eventBus.publish({
        eventType: 'user.created',
        aggregateId: 'user-2',
        occurredAt: new Date(),
        payload: { name: 'Jane' },
      });

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler3).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should handle concurrent event publishing', async () => {
      const handler = vi.fn();
      const events: DomainEvent[] = Array.from({ length: 10 }, (_, i) => ({
        eventType: 'test.event',
        aggregateId: `id-${i}`,
        occurredAt: new Date(),
        payload: { index: i },
      }));

      eventBus.subscribe('test.event', handler);

      // Publish events concurrently
      await Promise.all(events.map(event => eventBus.publish(event)));

      expect(handler).toHaveBeenCalledTimes(10);
    });
  });
});
