import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.getState().clearAll();
    vi.clearAllMocks();
  });

  it('should have initial state', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
  });

  it('should add notification', () => {
    const { addNotification } = useNotificationStore.getState();

    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Operation completed',
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('success');
    expect(state.notifications[0].title).toBe('Success');
    expect(state.notifications[0].message).toBe('Operation completed');
    expect(state.notifications[0].id).toBeDefined();
    expect(state.notifications[0].timestamp).toBeInstanceOf(Date);
  });

  it('should add multiple notifications', () => {
    const { addNotification } = useNotificationStore.getState();

    addNotification({
      type: 'info',
      title: 'Info 1',
      message: 'Message 1',
    });

    addNotification({
      type: 'warning',
      title: 'Warning 1',
      message: 'Message 2',
    });

    addNotification({
      type: 'error',
      title: 'Error 1',
      message: 'Message 3',
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(3);
    expect(state.notifications[0].type).toBe('info');
    expect(state.notifications[1].type).toBe('warning');
    expect(state.notifications[2].type).toBe('error');
  });

  it('should generate unique IDs for notifications', () => {
    const { addNotification } = useNotificationStore.getState();

    addNotification({
      type: 'info',
      title: 'Test 1',
      message: 'Message 1',
    });

    addNotification({
      type: 'info',
      title: 'Test 2',
      message: 'Message 2',
    });

    const state = useNotificationStore.getState();
    expect(state.notifications[0].id).not.toBe(state.notifications[1].id);
  });

  it('should dismiss notification by id', () => {
    const { addNotification, dismissNotification } = useNotificationStore.getState();

    addNotification({
      type: 'info',
      title: 'Test 1',
      message: 'Message 1',
    });

    addNotification({
      type: 'info',
      title: 'Test 2',
      message: 'Message 2',
    });

    const state = useNotificationStore.getState();
    const firstId = state.notifications[0].id;

    dismissNotification(firstId);

    const newState = useNotificationStore.getState();
    expect(newState.notifications).toHaveLength(1);
    expect(newState.notifications[0].title).toBe('Test 2');
  });

  it('should not affect other notifications when dismissing', () => {
    const { addNotification, dismissNotification } = useNotificationStore.getState();

    addNotification({
      type: 'info',
      title: 'Test 1',
      message: 'Message 1',
    });

    addNotification({
      type: 'info',
      title: 'Test 2',
      message: 'Message 2',
    });

    addNotification({
      type: 'info',
      title: 'Test 3',
      message: 'Message 3',
    });

    const state = useNotificationStore.getState();
    const middleId = state.notifications[1].id;

    dismissNotification(middleId);

    const newState = useNotificationStore.getState();
    expect(newState.notifications).toHaveLength(2);
    expect(newState.notifications[0].title).toBe('Test 1');
    expect(newState.notifications[1].title).toBe('Test 3');
  });

  it('should handle dismissing non-existent notification', () => {
    const { addNotification, dismissNotification } = useNotificationStore.getState();

    addNotification({
      type: 'info',
      title: 'Test',
      message: 'Message',
    });

    dismissNotification('non-existent-id');

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
  });

  it('should clear all notifications', () => {
    const { addNotification, clearAll } = useNotificationStore.getState();

    addNotification({
      type: 'info',
      title: 'Test 1',
      message: 'Message 1',
    });

    addNotification({
      type: 'info',
      title: 'Test 2',
      message: 'Message 2',
    });

    addNotification({
      type: 'info',
      title: 'Test 3',
      message: 'Message 3',
    });

    expect(useNotificationStore.getState().notifications).toHaveLength(3);

    clearAll();

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
  });

  it('should support all notification types', () => {
    const { addNotification } = useNotificationStore.getState();

    const types: Array<'success' | 'error' | 'warning' | 'info' | 'loading'> = [
      'success',
      'error',
      'warning',
      'info',
      'loading',
    ];

    types.forEach((type) => {
      addNotification({
        type,
        title: `${type} notification`,
        message: `This is a ${type} message`,
      });
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(5);
    types.forEach((type, index) => {
      expect(state.notifications[index].type).toBe(type);
    });
  });
});
