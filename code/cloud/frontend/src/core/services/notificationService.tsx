import { toast } from 'sonner';
import { useNotificationStore } from '@/core/stores/notificationStore';
import { NotificationCard } from '@/shared/components/ui/feedback/NotificationCard';

export interface ToastOptions {
  duration?: number;
  id?: string;
}

export interface PersistentNotificationOptions {
  action?: () => void;
}

/**
 * Unified notification service with two layers:
 * 1. Toast: Temporary feedback (auto-dismiss, floating)
 * 2. Persistent: Important notifications (manual dismiss, TopBar)
 */
export const notify = {
  /**
   * Toast notifications - temporary feedback for user actions
   * Auto-dismiss after 3-4 seconds, displayed as floating cards
   */
  toast: {
    success: (title: string, message?: string, options?: ToastOptions) => {
      return toast.custom(
        (t) => (
          <NotificationCard
            type="success"
            title={title}
            message={message}
            onDismiss={() => toast.dismiss(t)}
            showDismiss={true}
          />
        ),
        {
          duration: options?.duration ?? 3000,
          id: options?.id,
        }
      );
    },

    error: (title: string, message?: string, options?: ToastOptions) => {
      return toast.custom(
        (t) => (
          <NotificationCard
            type="error"
            title={title}
            message={message}
            onDismiss={() => toast.dismiss(t)}
            showDismiss={true}
          />
        ),
        {
          duration: options?.duration ?? 4000,
          id: options?.id,
        }
      );
    },

    warning: (title: string, message?: string, options?: ToastOptions) => {
      return toast.custom(
        (t) => (
          <NotificationCard
            type="warning"
            title={title}
            message={message}
            onDismiss={() => toast.dismiss(t)}
            showDismiss={true}
          />
        ),
        {
          duration: options?.duration ?? 3500,
          id: options?.id,
        }
      );
    },

    info: (title: string, message?: string, options?: ToastOptions) => {
      return toast.custom(
        (t) => (
          <NotificationCard
            type="info"
            title={title}
            message={message}
            onDismiss={() => toast.dismiss(t)}
            showDismiss={true}
          />
        ),
        {
          duration: options?.duration ?? 3000,
          id: options?.id,
        }
      );
    },

    loading: (title: string, message?: string, options?: ToastOptions) => {
      return toast.custom(
        (t) => (
          <NotificationCard
            type="loading"
            title={title}
            message={message}
            onDismiss={() => toast.dismiss(t)}
            showDismiss={false}
          />
        ),
        {
          duration: options?.duration ?? Infinity,
          id: options?.id,
        }
      );
    },

    /**
     * Promise toast - automatically shows loading -> success/error
     */
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      const toastId = notify.toast.loading(messages.loading);

      promise
        .then((data) => {
          const successMessage =
            typeof messages.success === 'function'
              ? messages.success(data)
              : messages.success;
          toast.dismiss(toastId);
          notify.toast.success(successMessage);
        })
        .catch((error) => {
          const errorMessage =
            typeof messages.error === 'function'
              ? messages.error(error)
              : messages.error;
          toast.dismiss(toastId);
          notify.toast.error(errorMessage);
        });

      return promise;
    },

    /**
     * Dismiss a specific toast
     */
    dismiss: (toastId?: string | number) => {
      toast.dismiss(toastId);
    },
  },

  /**
   * Persistent notifications - important information that requires user attention
   * Displayed in TopBar NotificationBubble, manual dismiss required
   */
  persistent: {
    success: (title: string, message: string, options?: PersistentNotificationOptions) => {
      const { addNotification } = useNotificationStore.getState();
      return addNotification({
        type: 'success',
        title,
        message,
        timestamp: new Date(),
      });
    },

    error: (title: string, message: string, options?: PersistentNotificationOptions) => {
      const { addNotification } = useNotificationStore.getState();
      return addNotification({
        type: 'error',
        title,
        message,
        timestamp: new Date(),
      });
    },

    warning: (title: string, message: string, options?: PersistentNotificationOptions) => {
      const { addNotification } = useNotificationStore.getState();
      return addNotification({
        type: 'warning',
        title,
        message,
        timestamp: new Date(),
      });
    },

    info: (title: string, message: string, options?: PersistentNotificationOptions) => {
      const { addNotification } = useNotificationStore.getState();
      return addNotification({
        type: 'info',
        title,
        message,
        timestamp: new Date(),
      });
    },

    loading: (title: string, message: string, options?: PersistentNotificationOptions) => {
      const { addNotification } = useNotificationStore.getState();
      return addNotification({
        type: 'loading',
        title,
        message,
        timestamp: new Date(),
      });
    },
  },
};
