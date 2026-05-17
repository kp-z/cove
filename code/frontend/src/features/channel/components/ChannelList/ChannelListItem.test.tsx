import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelListItem } from './ChannelListItem';
import type { ChannelEntity } from '../../api/client';

const mockChannel: ChannelEntity = {
  channel_id: 'channel-123',
  name: 'general',
  description: 'General discussion channel',
  type: 'public',
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
};

describe('ChannelListItem', () => {
  it('should render channel information', () => {
    const onClick = vi.fn();

    render(
      <ChannelListItem
        channel={mockChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('General discussion channel')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ChannelListItem
        channel={mockChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should apply active styles when isActive is true', () => {
    const onClick = vi.fn();

    render(
      <ChannelListItem
        channel={mockChannel}
        isActive={true}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-blue-500/10');
    expect(button.className).toContain('border-blue-500/20');
  });

  it('should not apply active styles when isActive is false', () => {
    const onClick = vi.fn();

    render(
      <ChannelListItem
        channel={mockChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('hover:bg-white/[0.03]');
    expect(button.className).not.toContain('bg-blue-500/10');
  });

  it('should display Hash icon for public channels', () => {
    const onClick = vi.fn();

    const { container } = render(
      <ChannelListItem
        channel={{ ...mockChannel, type: 'public' }}
        isActive={false}
        onClick={onClick}
      />
    );

    // Hash icon is rendered as SVG
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should display Lock icon for private channels', () => {
    const onClick = vi.fn();

    const { container } = render(
      <ChannelListItem
        channel={{ ...mockChannel, type: 'private' }}
        isActive={false}
        onClick={onClick}
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should display MessageSquare icon for DM channels', () => {
    const onClick = vi.fn();

    const { container } = render(
      <ChannelListItem
        channel={{ ...mockChannel, type: 'dm' }}
        isActive={false}
        onClick={onClick}
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should display MessageSquare icon for thread channels', () => {
    const onClick = vi.fn();

    const { container } = render(
      <ChannelListItem
        channel={{ ...mockChannel, type: 'thread' }}
        isActive={false}
        onClick={onClick}
      />
    );

    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should not render description when not provided', () => {
    const onClick = vi.fn();
    const channelWithoutDescription = {
      ...mockChannel,
      description: undefined,
    };

    render(
      <ChannelListItem
        channel={channelWithoutDescription}
        isActive={false}
        onClick={onClick}
      />
    );

    expect(screen.queryByText('General discussion channel')).not.toBeInTheDocument();
  });

  it('should format time as "now" for very recent updates', () => {
    const onClick = vi.fn();
    const recentChannel = {
      ...mockChannel,
      updated_at: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    };

    render(
      <ChannelListItem
        channel={recentChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('should format time as minutes for updates within an hour', () => {
    const onClick = vi.fn();
    const minutesAgoChannel = {
      ...mockChannel,
      updated_at: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
    };

    render(
      <ChannelListItem
        channel={minutesAgoChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('15m')).toBeInTheDocument();
  });

  it('should format time as hours for updates within a day', () => {
    const onClick = vi.fn();
    const hoursAgoChannel = {
      ...mockChannel,
      updated_at: new Date(Date.now() - 5 * 3600000).toISOString(), // 5 hours ago
    };

    render(
      <ChannelListItem
        channel={hoursAgoChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('5h')).toBeInTheDocument();
  });

  it('should format time as days for updates older than a day', () => {
    const onClick = vi.fn();
    const daysAgoChannel = {
      ...mockChannel,
      updated_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), // 3 days ago
    };

    render(
      <ChannelListItem
        channel={daysAgoChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    expect(screen.getByText('3d')).toBeInTheDocument();
  });

  it('should truncate long channel names', () => {
    const onClick = vi.fn();
    const longNameChannel = {
      ...mockChannel,
      name: 'This is a very long channel name that should be truncated',
    };

    render(
      <ChannelListItem
        channel={longNameChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    const nameElement = screen.getByText(longNameChannel.name);
    expect(nameElement.className).toContain('truncate');
  });

  it('should truncate long descriptions', () => {
    const onClick = vi.fn();
    const longDescChannel = {
      ...mockChannel,
      description: 'This is a very long description that should be truncated to fit in the available space',
    };

    render(
      <ChannelListItem
        channel={longDescChannel}
        isActive={false}
        onClick={onClick}
      />
    );

    const descElement = screen.getByText(longDescChannel.description);
    expect(descElement.className).toContain('truncate');
  });
});
