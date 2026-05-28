import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelMemberBar } from './ChannelMemberBar';
import { useChannelMembers } from '@/lib/trpc/hooks';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import { useUser } from '@/lib/trpc/hooks/user.hooks';

// Mock dependencies
vi.mock('@/lib/trpc/hooks');
vi.mock('@/lib/trpc/hooks/agent.hooks');
vi.mock('@/lib/trpc/hooks/user.hooks');
vi.mock('@/shared/components/display/Avatar', () => ({
  getAvatarUrl: (avatar: any) => avatar?.url || 'https://example.com/default-avatar.png',
  AvatarStack: ({ items }: any) => <div data-testid="avatar-stack">{items.length} members</div>,
}));

describe('ChannelMemberBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('shows loading indicator when fetching members', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any);

      render(<ChannelMemberBar channelId="ch-123" />);

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('shows "No members" when channel has no members', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: { members: [], total: 0 },
        isLoading: false,
      } as any);

      render(<ChannelMemberBar channelId="ch-123" />);

      expect(screen.getByText('No members')).toBeInTheDocument();
    });
  });

  describe('Collapsed state with agent member', () => {
    beforeEach(() => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: {
          members: [
            { memberId: 'agent-1', memberType: 'agent', role: 'member' },
            { memberId: 'user-1', memberType: 'human', role: 'member' },
          ],
          total: 2,
        },
        isLoading: false,
      } as any);

      vi.mocked(useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          name: 'test-agent',
          display_name: 'Test Agent',
          persona: { avatar: { url: 'https://example.com/agent.png' } },
          runtime_config: { model: 'sonnet' },
          skills: { skillIds: ['skill1', 'skill2'] },
          tools: { toolIds: ['Read', 'Write'] },
        },
      } as any);

      vi.mocked(useUser).mockReturnValue({
        data: undefined,
      } as any);
    });

    it('renders collapsed state with first member info', () => {
      render(<ChannelMemberBar channelId="ch-123" />);

      expect(screen.getByText('Test Agent')).toBeInTheDocument();
      expect(screen.getByText('Sonnet')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('shows expand button in collapsed state', () => {
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      expect(expandButton).toBeInTheDocument();
    });

    it('displays agent avatar', () => {
      render(<ChannelMemberBar channelId="ch-123" />);

      const avatar = screen.getByAltText('Test Agent');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/agent.png');
    });
  });

  describe('Expanded state', () => {
    beforeEach(() => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: {
          members: [
            { memberId: 'agent-1', memberType: 'agent', role: 'admin' },
            { memberId: 'user-1', memberType: 'human', role: 'member' },
          ],
          total: 2,
        },
        isLoading: false,
      } as any);

      vi.mocked(useAgent).mockImplementation((id: string) => {
        if (id === 'agent-1') {
          return {
            data: {
              agent_id: 'agent-1',
              name: 'test-agent',
              display_name: 'Test Agent',
              persona: { avatar: { url: 'https://example.com/agent.png' } },
              runtime_config: { model: 'opus' },
              skills: { skillIds: [] },
              tools: { toolIds: [] },
            },
          } as any;
        }
        return { data: undefined } as any;
      });

      vi.mocked(useUser).mockImplementation((id: string) => {
        if (id === 'user-1') {
          return {
            data: {
              user_id: 'user-1',
              username: 'testuser',
              email: 'test@example.com',
              avatar: { url: 'https://example.com/user.png' },
            },
          } as any;
        }
        return { data: undefined } as any;
      });
    });

    it('expands to show all members when clicked', async () => {
      const user = userEvent.setup();
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Members')).toBeInTheDocument();
        expect(screen.getByText('(2)')).toBeInTheDocument();
      });
    });

    it('shows agents section with correct count', async () => {
      const user = userEvent.setup();
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Agents (1)')).toBeInTheDocument();
      });
    });

    it('shows users section with correct count', async () => {
      const user = userEvent.setup();
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Users (1)')).toBeInTheDocument();
      });
    });

    it('displays agent member details', async () => {
      const user = userEvent.setup();
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
        expect(screen.getByText('Opus')).toBeInTheDocument();
      });
    });

    it('displays user member details', async () => {
      const user = userEvent.setup();
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('collapses when clicked again', async () => {
      const user = userEvent.setup();
      render(<ChannelMemberBar channelId="ch-123" />);

      const expandButton = screen.getByRole('button');
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Members')).toBeInTheDocument();
      });

      const collapseButton = screen.getByRole('button');
      await user.click(collapseButton);

      await waitFor(() => {
        expect(screen.queryByText('Members')).not.toBeInTheDocument();
      });
    });
  });

  describe('Model labels', () => {
    it('displays correct model label for Opus', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: {
          members: [{ memberId: 'agent-1', memberType: 'agent', role: 'member' }],
          total: 1,
        },
        isLoading: false,
      } as any);

      vi.mocked(useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          name: 'test-agent',
          display_name: 'Test Agent',
          runtime_config: { model: 'opus' },
          skills: { skillIds: [] },
          tools: { toolIds: [] },
        },
      } as any);

      render(<ChannelMemberBar channelId="ch-123" />);

      expect(screen.getByText('Opus')).toBeInTheDocument();
    });

    it('displays correct model label for Haiku', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: {
          members: [{ memberId: 'agent-1', memberType: 'agent', role: 'member' }],
          total: 1,
        },
        isLoading: false,
      } as any);

      vi.mocked(useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          name: 'test-agent',
          display_name: 'Test Agent',
          runtime_config: { model: 'haiku' },
          skills: { skillIds: [] },
          tools: { toolIds: [] },
        },
      } as any);

      render(<ChannelMemberBar channelId="ch-123" />);

      expect(screen.getByText('Haiku')).toBeInTheDocument();
    });
  });

  describe('Data fetching', () => {
    it('calls useChannelMembers with correct channelId', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: { members: [], total: 0 },
        isLoading: false,
      } as any);

      render(<ChannelMemberBar channelId="ch-456" />);

      expect(useChannelMembers).toHaveBeenCalledWith('ch-456');
    });

    it('fetches agent details only for agent members', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: {
          members: [{ memberId: 'agent-1', memberType: 'agent', role: 'member' }],
          total: 1,
        },
        isLoading: false,
      } as any);

      vi.mocked(useAgent).mockReturnValue({
        data: {
          agent_id: 'agent-1',
          name: 'test-agent',
          display_name: 'Test Agent',
          skills: { skillIds: [] },
          tools: { toolIds: [] },
        },
      } as any);

      render(<ChannelMemberBar channelId="ch-123" />);

      expect(useAgent).toHaveBeenCalledWith('agent-1', { enabled: true });
      expect(useUser).toHaveBeenCalledWith('agent-1', { enabled: false });
    });

    it('fetches user details only for human members', () => {
      vi.mocked(useChannelMembers).mockReturnValue({
        data: {
          members: [{ memberId: 'user-1', memberType: 'human', role: 'member' }],
          total: 1,
        },
        isLoading: false,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        data: {
          user_id: 'user-1',
          username: 'testuser',
          email: 'test@example.com',
        },
      } as any);

      render(<ChannelMemberBar channelId="ch-123" />);

      expect(useUser).toHaveBeenCalledWith('user-1', { enabled: true });
      expect(useAgent).toHaveBeenCalledWith('user-1', { enabled: false });
    });
  });
});
