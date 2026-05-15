import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IncomingMessage, ServerResponse } from 'http';
import { createSubscriptionRouter } from './subscription.router';
import type { IEventBus } from '../../../application/interfaces/event-bus.interface';
import type { DomainEvent } from '../../../domain/events/domain-event';

describe('subscriptionRouter', () => {
  let mockEventBus: IEventBus;
  let router: ReturnType<typeof createSubscriptionRouter>;
  let mockContext: any;

  beforeEach(() => {
    mockEventBus = {
      publish: vi.fn(),
      subscribe: vi.fn(),
      subscribeMany: vi.fn(),
    } as unknown as IEventBus;

    mockContext = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      },
      userId: 'user-1',
    };

    router = createSubscriptionRouter({ eventBus: mockEventBus });
  });

  describe('onMessage', () => {
    it('should subscribe to message events without channelId filter', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onMessage({});

      // Subscribe to trigger the observable
      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockContext.logger.info).toHaveBeenCalledWith('Subscription started', {
        type: 'onMessage',
        channelId: undefined,
        userId: 'user-1',
        events: undefined,
      });

      expect(mockEventBus.subscribeMany).toHaveBeenCalledWith(
        ['message.created', 'message.updated', 'message.deleted'],
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should subscribe to specific message events', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onMessage({
        events: ['message.created', 'message.updated'],
      });

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockEventBus.subscribeMany).toHaveBeenCalledWith(
        ['message.created', 'message.updated'],
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should filter events by channelId when provided', async () => {
      const unsubscribe = vi.fn();
      let eventHandler: (event: DomainEvent) => void = () => {};

      vi.mocked(mockEventBus.subscribeMany).mockImplementation((events, handler) => {
        eventHandler = handler;
        return unsubscribe;
      });

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onMessage({ channelId: 'channel-1' });

      const emittedEvents: any[] = [];
      subscription.subscribe({
        next: (data) => emittedEvents.push(data),
        error: () => {},
        complete: () => {},
      });

      const matchingEvent: DomainEvent = {
        eventId: 'event-1',
        eventType: 'message.created',
        aggregateId: 'channel-1',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-1', content: 'test' },
      };

      const nonMatchingEvent: DomainEvent = {
        eventId: 'event-2',
        eventType: 'message.created',
        aggregateId: 'channel-2',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-2', content: 'test' },
      };

      eventHandler(matchingEvent);
      eventHandler(nonMatchingEvent);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventId).toBe('event-1');
    });

    it('should unsubscribe and log when subscription ends', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onMessage({ channelId: 'channel-1' });

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      subscriptionInstance.unsubscribe();

      expect(mockContext.logger.info).toHaveBeenCalledWith('Subscription ended', {
        type: 'onMessage',
        channelId: 'channel-1',
      });
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('onTask', () => {
    it('should subscribe to task events without channelId filter', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onTask({});

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockContext.logger.info).toHaveBeenCalledWith('Subscription started', {
        type: 'onTask',
        channelId: undefined,
        userId: 'user-1',
        events: undefined,
      });

      expect(mockEventBus.subscribeMany).toHaveBeenCalledWith(
        ['task.created', 'task.updated', 'task.claimed', 'task.unclaimed', 'task.status_changed'],
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should subscribe to specific task events', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onTask({
        events: ['task.created', 'task.claimed'],
      });

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockEventBus.subscribeMany).toHaveBeenCalledWith(
        ['task.created', 'task.claimed'],
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should filter events by channelId when provided', async () => {
      const unsubscribe = vi.fn();
      let eventHandler: (event: DomainEvent) => void = () => {};

      vi.mocked(mockEventBus.subscribeMany).mockImplementation((events, handler) => {
        eventHandler = handler;
        return unsubscribe;
      });

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onTask({ channelId: 'channel-1' });

      const emittedEvents: any[] = [];
      subscription.subscribe({
        next: (data) => emittedEvents.push(data),
        error: () => {},
        complete: () => {},
      });

      const matchingEvent: DomainEvent = {
        eventId: 'event-1',
        eventType: 'task.created',
        aggregateId: 'task-1',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-1', taskId: 'task-1' },
      };

      const nonMatchingEvent: DomainEvent = {
        eventId: 'event-2',
        eventType: 'task.created',
        aggregateId: 'task-2',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-2', taskId: 'task-2' },
      };

      eventHandler(matchingEvent);
      eventHandler(nonMatchingEvent);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventId).toBe('event-1');
    });
  });

  describe('onAgentStatus', () => {
    it('should subscribe to agent status events without agentId filter', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribe).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onAgentStatus({});

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockContext.logger.info).toHaveBeenCalledWith('Subscription started', {
        type: 'onAgentStatus',
        agentId: undefined,
        userId: 'user-1',
      });

      expect(mockEventBus.subscribe).toHaveBeenCalledWith(
        'agent.status_changed',
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should filter events by agentId when provided', async () => {
      const unsubscribe = vi.fn();
      let eventHandler: (event: DomainEvent) => void = () => {};

      vi.mocked(mockEventBus.subscribe).mockImplementation((event, handler) => {
        eventHandler = handler;
        return unsubscribe;
      });

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onAgentStatus({ agentId: 'agent-1' });

      const emittedEvents: any[] = [];
      subscription.subscribe({
        next: (data) => emittedEvents.push(data),
        error: () => {},
        complete: () => {},
      });

      const matchingEvent: DomainEvent = {
        eventId: 'event-1',
        eventType: 'agent.status_changed',
        aggregateId: 'agent-1',
        occurredAt: new Date('2024-01-01'),
        payload: { agentId: 'agent-1', status: 'active' },
      };

      const nonMatchingEvent: DomainEvent = {
        eventId: 'event-2',
        eventType: 'agent.status_changed',
        aggregateId: 'agent-2',
        occurredAt: new Date('2024-01-01'),
        payload: { agentId: 'agent-2', status: 'idle' },
      };

      eventHandler(matchingEvent);
      eventHandler(nonMatchingEvent);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventId).toBe('event-1');
    });
  });

  describe('onChannelMember', () => {
    it('should subscribe to channel member events', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onChannelMember({ channelId: 'channel-1' });

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockContext.logger.info).toHaveBeenCalledWith('Subscription started', {
        type: 'onChannelMember',
        channelId: 'channel-1',
        userId: 'user-1',
        events: undefined,
      });

      expect(mockEventBus.subscribeMany).toHaveBeenCalledWith(
        ['channel.member_joined', 'channel.member_left'],
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should filter events by channelId', async () => {
      const unsubscribe = vi.fn();
      let eventHandler: (event: DomainEvent) => void = () => {};

      vi.mocked(mockEventBus.subscribeMany).mockImplementation((events, handler) => {
        eventHandler = handler;
        return unsubscribe;
      });

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onChannelMember({ channelId: 'channel-1' });

      const emittedEvents: any[] = [];
      subscription.subscribe({
        next: (data) => emittedEvents.push(data),
        error: () => {},
        complete: () => {},
      });

      const matchingEvent: DomainEvent = {
        eventId: 'event-1',
        eventType: 'channel.member_joined',
        aggregateId: 'channel-1',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-1', memberId: 'user-1' },
      };

      const nonMatchingEvent: DomainEvent = {
        eventId: 'event-2',
        eventType: 'channel.member_joined',
        aggregateId: 'channel-2',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-2', memberId: 'user-2' },
      };

      eventHandler(matchingEvent);
      eventHandler(nonMatchingEvent);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventId).toBe('event-1');
    });
  });

  describe('onThread', () => {
    it('should subscribe to thread events', async () => {
      const unsubscribe = vi.fn();
      vi.mocked(mockEventBus.subscribeMany).mockReturnValue(unsubscribe);

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onThread({ channelId: 'channel-1' });

      const subscriptionInstance = subscription.subscribe({
        next: () => {},
        error: () => {},
        complete: () => {},
      });

      expect(mockContext.logger.info).toHaveBeenCalledWith('Subscription started', {
        type: 'onThread',
        channelId: 'channel-1',
        userId: 'user-1',
        events: undefined,
      });

      expect(mockEventBus.subscribeMany).toHaveBeenCalledWith(
        ['thread.created', 'thread.updated'],
        expect.any(Function)
      );

      subscriptionInstance.unsubscribe();
    });

    it('should filter events by channelId', async () => {
      const unsubscribe = vi.fn();
      let eventHandler: (event: DomainEvent) => void = () => {};

      vi.mocked(mockEventBus.subscribeMany).mockImplementation((events, handler) => {
        eventHandler = handler;
        return unsubscribe;
      });

      const caller = router.createCaller(mockContext);
      const subscription = await caller.onThread({ channelId: 'channel-1' });

      const emittedEvents: any[] = [];
      subscription.subscribe({
        next: (data) => emittedEvents.push(data),
        error: () => {},
        complete: () => {},
      });

      const matchingEvent: DomainEvent = {
        eventId: 'event-1',
        eventType: 'thread.created',
        aggregateId: 'thread-1',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-1', threadId: 'thread-1' },
      };

      const nonMatchingEvent: DomainEvent = {
        eventId: 'event-2',
        eventType: 'thread.created',
        aggregateId: 'thread-2',
        occurredAt: new Date('2024-01-01'),
        payload: { channelId: 'channel-2', threadId: 'thread-2' },
      };

      eventHandler(matchingEvent);
      eventHandler(nonMatchingEvent);

      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents[0].eventId).toBe('event-1');
    });
  });
});
