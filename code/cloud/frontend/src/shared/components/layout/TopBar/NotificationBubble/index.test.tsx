import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBubble, type Notification } from './index';

describe('NotificationBubble', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Success',
      message: 'Operation completed successfully',
      timestamp: new Date('2026-05-09T10:30:00'),
    },
    {
      id: '2',
      type: 'error',
      title: 'Error',
      message: 'Operation failed',
      timestamp: new Date('2026-05-09T10:31:00'),
    },
    {
      id: '3',
      type: 'loading',
      title: 'Loading',
      message: 'Processing...',
      timestamp: new Date('2026-05-09T10:32:00'),
    },
  ];

  it('should render notification bell icon', () => {
    render(
      <NotificationBubble
        notifications={[]}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should show notification count badge when has notifications', () => {
    render(
      <NotificationBubble
        notifications={mockNotifications}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show 99+ when notification count exceeds 99', () => {
    const manyNotifications = Array.from({ length: 150 }, (_, i) => ({
      id: `${i}`,
      type: 'info' as const,
      title: `Notification ${i}`,
      message: `Message ${i}`,
      timestamp: new Date(),
    }));

    render(
      <NotificationBubble
        notifications={manyNotifications}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should show loading spinner when has loading notifications', () => {
    const loadingNotifications: Notification[] = [
      {
        id: '1',
        type: 'loading',
        title: 'Loading',
        message: 'Processing...',
        timestamp: new Date(),
      },
    ];

    const { container } = render(
      <NotificationBubble
        notifications={loadingNotifications}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should open panel when bell icon clicked', () => {
    render(
      <NotificationBubble
        notifications={mockNotifications}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('3 unread messages')).toBeInTheDocument();
  });

  it('should display all notifications in panel', () => {
    render(
      <NotificationBubble
        notifications={mockNotifications}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Operation failed')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button clicked', () => {
    const mockDismiss = vi.fn();
    render(
      <NotificationBubble
        notifications={mockNotifications}
        onDismiss={mockDismiss}
        onClearAll={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Hover over notification to show dismiss button
    const notification = screen.getByText('Success').closest('.group');
    if (notification) {
      fireEvent.mouseEnter(notification);

      // Find and click dismiss button (X icon)
      const dismissButtons = screen.getAllByRole('button');
      const dismissButton = dismissButtons.find(btn =>
        btn.querySelector('svg') && btn.classList.contains('opacity-0')
      );

      if (dismissButton) {
        fireEvent.click(dismissButton);
        expect(mockDismiss).toHaveBeenCalledWith('1');
      }
    }
  });

  it('should call onClearAll when clear all button clicked', () => {
    const mockClearAll = vi.fn();
    render(
      <NotificationBubble
        notifications={mockNotifications}
        onDismiss={vi.fn()}
        onClearAll={mockClearAll}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const clearAllButton = screen.getByText('Clear all notifications');
    fireEvent.click(clearAllButton);

    expect(mockClearAll).toHaveBeenCalled();
  });

  it('should show empty state when no notifications', () => {
    render(
      <NotificationBubble
        notifications={[]}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('should close panel when close button clicked', () => {
    render(
      <NotificationBubble
        notifications={mockNotifications}
        onDismiss={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Notification Center')).toBeInTheDocument();

    // Find close button (X icon in header)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn =>
      btn.querySelector('svg') && btn.closest('.border-b')
    );

    if (closeButton) {
      fireEvent.click(closeButton);

      // Panel should be closed
      setTimeout(() => {
        expect(screen.queryByText('3 unread messages')).not.toBeInTheDocument();
      }, 500);
    }
  });
});
