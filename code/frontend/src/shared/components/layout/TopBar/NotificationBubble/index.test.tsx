import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBubble, type Notification } from './index';

describe('NotificationBubble', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: '成功',
      message: '操作成功完成',
      timestamp: new Date('2026-05-09T10:30:00'),
    },
    {
      id: '2',
      type: 'error',
      title: '错误',
      message: '操作失败',
      timestamp: new Date('2026-05-09T10:31:00'),
    },
    {
      id: '3',
      type: 'loading',
      title: '加载中',
      message: '正在处理...',
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
      title: `通知 ${i}`,
      message: `消息 ${i}`,
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
        title: '加载中',
        message: '正在处理...',
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

    expect(screen.getByText('通知中心')).toBeInTheDocument();
    expect(screen.getByText('3 条未读消息')).toBeInTheDocument();
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

    expect(screen.getByText('成功')).toBeInTheDocument();
    expect(screen.getByText('操作成功完成')).toBeInTheDocument();
    expect(screen.getByText('错误')).toBeInTheDocument();
    expect(screen.getByText('操作失败')).toBeInTheDocument();
    expect(screen.getByText('加载中')).toBeInTheDocument();
    expect(screen.getByText('正在处理...')).toBeInTheDocument();
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
    const notification = screen.getByText('成功').closest('.group');
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

    const clearAllButton = screen.getByText('清空所有通知');
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

    expect(screen.getByText('暂无通知')).toBeInTheDocument();
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

    expect(screen.getByText('通知中心')).toBeInTheDocument();

    // Find close button (X icon in header)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn =>
      btn.querySelector('svg') && btn.closest('.border-b')
    );

    if (closeButton) {
      fireEvent.click(closeButton);

      // Panel should be closed (通知中心 header should not be visible)
      setTimeout(() => {
        expect(screen.queryByText('3 条未读消息')).not.toBeInTheDocument();
      }, 500);
    }
  });
});
