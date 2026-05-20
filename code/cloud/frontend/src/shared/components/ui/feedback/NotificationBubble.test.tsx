import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBubble } from './NotificationBubble';
import type { Notification } from '@/shared/stores/notificationStore';

describe('NotificationBubble', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Success',
      message: 'Operation completed successfully',
      timestamp: new Date('2024-01-01T12:00:00'),
    },
    {
      id: '2',
      type: 'error',
      title: 'Error',
      message: 'Something went wrong',
      timestamp: new Date('2024-01-01T12:01:00'),
    },
  ];

  it('should render notifications', () => {
    render(<NotificationBubble notifications={mockNotifications} onDismiss={vi.fn()} />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render empty when no notifications', () => {
    const { container } = render(<NotificationBubble notifications={[]} onDismiss={vi.fn()} />);
    const notifications = container.querySelectorAll('[class*="group"]');
    expect(notifications).toHaveLength(0);
  });

  it('should render success notification with correct icon', () => {
    const successNotification: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'Success',
        message: 'Done',
        timestamp: new Date(),
      },
    ];
    const { container } = render(
      <NotificationBubble notifications={successNotification} onDismiss={vi.fn()} />
    );
    const icon = container.querySelector('.text-emerald-300');
    expect(icon).toBeInTheDocument();
  });

  it('should render error notification with correct icon', () => {
    const errorNotification: Notification[] = [
      {
        id: '1',
        type: 'error',
        title: 'Error',
        message: 'Failed',
        timestamp: new Date(),
      },
    ];
    const { container } = render(
      <NotificationBubble notifications={errorNotification} onDismiss={vi.fn()} />
    );
    const icon = container.querySelector('.text-rose-300');
    expect(icon).toBeInTheDocument();
  });

  it('should render warning notification with correct icon', () => {
    const warningNotification: Notification[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Warning',
        message: 'Be careful',
        timestamp: new Date(),
      },
    ];
    const { container } = render(
      <NotificationBubble notifications={warningNotification} onDismiss={vi.fn()} />
    );
    const icon = container.querySelector('.text-amber-300');
    expect(icon).toBeInTheDocument();
  });

  it('should render info notification with correct icon', () => {
    const infoNotification: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Info',
        message: 'FYI',
        timestamp: new Date(),
      },
    ];
    const { container } = render(
      <NotificationBubble notifications={infoNotification} onDismiss={vi.fn()} />
    );
    const icon = container.querySelector('.text-blue-300');
    expect(icon).toBeInTheDocument();
  });

  it('should render loading notification with spinning icon', () => {
    const loadingNotification: Notification[] = [
      {
        id: '1',
        type: 'loading',
        title: 'Loading',
        message: 'Please wait',
        timestamp: new Date(),
      },
    ];
    const { container } = render(
      <NotificationBubble notifications={loadingNotification} onDismiss={vi.fn()} />
    );
    const icon = container.querySelector('.animate-spin');
    expect(icon).toBeInTheDocument();
  });

  it('should display timestamp', () => {
    const notification: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Test',
        message: 'Message',
        timestamp: new Date('2024-01-01T12:00:00'),
      },
    ];
    render(<NotificationBubble notifications={notification} onDismiss={vi.fn()} />);
    // Timestamp is formatted as locale time string
    const timestamp = screen.getByText(/12:00/);
    expect(timestamp).toBeInTheDocument();
  });

  it('should call onDismiss when close button clicked', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    const notification: Notification[] = [
      {
        id: '1',
        type: 'info',
        title: 'Test',
        message: 'Message',
        timestamp: new Date(),
      },
    ];
    const { container } = render(
      <NotificationBubble notifications={notification} onDismiss={handleDismiss} />
    );

    const closeButton = container.querySelector('button');
    expect(closeButton).toBeInTheDocument();

    if (closeButton) {
      await user.click(closeButton);
      expect(handleDismiss).toHaveBeenCalledWith('1');
    }
  });

  it('should render multiple notifications', () => {
    render(<NotificationBubble notifications={mockNotifications} onDismiss={vi.fn()} />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should have fixed positioning', () => {
    const { container } = render(
      <NotificationBubble notifications={mockNotifications} onDismiss={vi.fn()} />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('fixed', 'top-20', 'right-6', 'z-50');
  });
});
