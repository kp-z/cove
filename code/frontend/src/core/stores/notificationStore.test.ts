import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useNotificationStore, notify } from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useNotificationStore.setState({ notifications: [] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('addNotification', () => {
    it('should add a notification to the store', () => {
      const { addNotification } = useNotificationStore.getState();

      const id = addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        id,
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });
      expect(notifications[0].timestamp).toBeInstanceOf(Date);
    });

    it('should auto-dismiss success notifications after 5 seconds', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should auto-dismiss info notifications after 5 seconds', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test message',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Fast-forward time by 5 seconds
      vi.advanceTimersByTime(5000);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should NOT auto-dismiss error notifications', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({
        type: 'error',
        title: 'Test',
        message: 'Test message',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Fast-forward time by 10 seconds
      vi.advanceTimersByTime(10000);

      // Error notification should still be there
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });

    it('should NOT auto-dismiss loading notifications', () => {
      const { addNotification } = useNotificationStore.getState();

      addNotification({
        type: 'loading',
        title: 'Test',
        message: 'Test message',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      // Fast-forward time by 10 seconds
      vi.advanceTimersByTime(10000);

      // Loading notification should still be there
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('removeNotification', () => {
    it('should remove a notification by id', () => {
      const { addNotification, removeNotification } = useNotificationStore.getState();

      const id = addNotification({
        type: 'success',
        title: 'Test',
        message: 'Test message',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      removeNotification(id);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('clearAll', () => {
    it('should remove all notifications', () => {
      const { addNotification, clearAll } = useNotificationStore.getState();

      addNotification({
        type: 'success',
        title: 'Test 1',
        message: 'Test message 1',
      });

      addNotification({
        type: 'error',
        title: 'Test 2',
        message: 'Test message 2',
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(2);

      clearAll();

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('updateNotification', () => {
    it('should update a notification', () => {
      const { addNotification, updateNotification } = useNotificationStore.getState();

      const id = addNotification({
        type: 'loading',
        title: 'Loading',
        message: 'Please wait...',
      });

      updateNotification(id, {
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
      });

      const { notifications } = useNotificationStore.getState();
      expect(notifications[0]).toMatchObject({
        id,
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
      });
    });
  });

  describe('notify helpers', () => {
    it('should create success notification', () => {
      notify.success('Success', 'Operation completed');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
    });

    it('should create error notification', () => {
      notify.error('Error', 'Operation failed');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('error');
    });

    it('should create warning notification', () => {
      notify.warning('Warning', 'Be careful');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('warning');
    });

    it('should create info notification', () => {
      notify.info('Info', 'FYI');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('info');
    });

    it('should create loading notification', () => {
      notify.loading('Loading', 'Please wait');

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('loading');
    });
  });
});
