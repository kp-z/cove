import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineItem } from './TimelineItem';

const mockThread = {
  thread_id: 'thread-12345678',
  channel_id: 'channel-123',
  root_message_id: 'msg-123',
  reply_count: 5,
  last_reply_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
  created_at: new Date(Date.now() - 24 * 3600000).toISOString(), // 1 day ago
};

describe('TimelineItem', () => {
  it('should render thread information', () => {
    const onClick = vi.fn();

    render(
      <TimelineItem
        thread={mockThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    // Text is split across elements, use regex matcher
    expect(screen.getByText(/Thread #/)).toBeInTheDocument();
    expect(screen.getByText(/thread-1/)).toBeInTheDocument();
    expect(screen.getByText('5 replies')).toBeInTheDocument();
  });

  it('should display singular "reply" for count of 1', () => {
    const onClick = vi.fn();
    const threadWithOneReply = {
      ...mockThread,
      reply_count: 1,
    };

    render(
      <TimelineItem
        thread={threadWithOneReply}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('1 reply')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <TimelineItem
        thread={mockThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should apply active styles when isActive is true', () => {
    const onClick = vi.fn();

    const { container } = render(
      <TimelineItem
        thread={mockThread}
        isActive={true}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-500/10');
    expect(button.className).toContain('border-blue-500/20');

    // Check for active node indicator (white dot)
    const whiteDot = container.querySelector('.bg-white');
    expect(whiteDot).toBeInTheDocument();
  });

  it('should not apply active styles when isActive is false', () => {
    const onClick = vi.fn();

    const { container } = render(
      <TimelineItem
        thread={mockThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-white/[0.02]');
    expect(button.className).toContain('border-white/5');

    // Check that white dot is not present
    const whiteDot = container.querySelector('.bg-white');
    expect(whiteDot).not.toBeInTheDocument();
  });

  it('should hide timeline line when isLast is true', () => {
    const onClick = vi.fn();

    const { container } = render(
      <TimelineItem
        thread={mockThread}
        isActive={false}
        isFirst={false}
        isLast={true}
        onClick={onClick}
      />
    );

    const timelineLine = container.querySelector('.bg-gray-700');
    expect(timelineLine).not.toBeInTheDocument();
  });

  it('should show timeline line when isLast is false', () => {
    const onClick = vi.fn();

    const { container } = render(
      <TimelineItem
        thread={mockThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    const timelineLine = container.querySelector('.bg-gray-700');
    expect(timelineLine).toBeInTheDocument();
  });

  it('should format time as "Just now" for recent threads', () => {
    const onClick = vi.fn();
    const recentThread = {
      ...mockThread,
      last_reply_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 minutes ago
    };

    render(
      <TimelineItem
        thread={recentThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('Just now')).toBeInTheDocument();
  });

  it('should format time as hours for threads within 24 hours', () => {
    const onClick = vi.fn();
    const hourOldThread = {
      ...mockThread,
      last_reply_at: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    };

    render(
      <TimelineItem
        thread={hourOldThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('5h ago')).toBeInTheDocument();
  });

  it('should format time as days for threads within a week', () => {
    const onClick = vi.fn();
    const dayOldThread = {
      ...mockThread,
      last_reply_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
    };

    render(
      <TimelineItem
        thread={dayOldThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('3d ago')).toBeInTheDocument();
  });

  it('should format time as date for threads older than a week', () => {
    const onClick = vi.fn();
    const oldThread = {
      ...mockThread,
      last_reply_at: new Date('2024-01-15').toISOString(),
    };

    render(
      <TimelineItem
        thread={oldThread}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    // Should show formatted date like "Jan 15"
    expect(screen.getByText(/Jan 15/)).toBeInTheDocument();
  });

  it('should use created_at when last_reply_at is not available', () => {
    const onClick = vi.fn();
    const threadWithoutLastReply = {
      ...mockThread,
      last_reply_at: undefined,
      created_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    };

    render(
      <TimelineItem
        thread={threadWithoutLastReply}
        isActive={false}
        isFirst={false}
        isLast={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('2h ago')).toBeInTheDocument();
  });
});
