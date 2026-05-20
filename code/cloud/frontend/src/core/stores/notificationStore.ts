import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  updateNotification: (id: string, updates: Partial<Omit<Notification, 'id' | 'timestamp'>>) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto-dismiss success/info notifications after 5 seconds
    if (notification.type === 'success' || notification.type === 'info') {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, 5000);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  updateNotification: (id, updates) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    }));
  },
}));

// Helper functions for common notification types
export const notify = {
  success: (title: string, message: string) => {
    return useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
    });
  },

  error: (title: string, message: string) => {
    return useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
    });
  },

  warning: (title: string, message: string) => {
    return useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
    });
  },

  info: (title: string, message: string) => {
    return useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
    });
  },

  loading: (title: string, message: string) => {
    return useNotificationStore.getState().addNotification({
      type: 'loading',
      title,
      message,
    });
  },
};
