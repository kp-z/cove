import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemberListItem } from './MemberListItem';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';
import type { ChannelMember } from '@/lib/trpc-types';

// Mock the hooks and components
jest.mock('@/lib/trpc/hooks/user.hooks');
jest.mock('@/lib/trpc/hooks/agent.hooks');
jest.mock('@/shared/components/display/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));
jest.mock('@/shared/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));
jest.mock('@/shared/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
jest.mock('@/shared/components/display/InfoCard', () => ({
  InfoCard: ({ children }: { children: React.ReactNode }) => <div data-testid="info-card">{children}</div>,
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseAgent = useAgent as jest.MockedFunction<typeof useAgent>;

describe('MemberListItem', () => {
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders human member correctly', () => {
    const member: ChannelMember = {
      member_id: 'user-123',
      member_type: 'human',
      role: 'member',
      joined_at: '2026-05-20T10:00:00Z',
    };

    mockUseUser.mockReturnValue({
      data: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
    } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(<MemberListItem member={member} onRemove={mockOnRemove} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('human')).toBeInTheDocument();
    expect(screen.getByText('• member')).toBeInTheDocument();
  });

  it('renders agent member correctly', () => {
    const member: ChannelMember = {
      member_id: 'agent-456',
      member_type: 'agent',
      role: 'admin',
      joined_at: '2026-05-21T10:00:00Z',
    };

    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({
      data: {
        agent_id: 'agent-456',
        name: 'bot-helper',
        display_name: 'Helper Bot',
      },
    } as any);

    render(<MemberListItem member={member} onRemove={mockOnRemove} />);

    expect(screen.getByText('Helper Bot')).toBeInTheDocument();
    expect(screen.getByText('agent')).toBeInTheDocument();
    expect(screen.getByText('• admin')).toBeInTheDocument();
  });

  it('shows member_id as fallback when user data is not loaded', () => {
    const member: ChannelMember = {
      member_id: 'user-123',
      member_type: 'human',
      role: 'member',
      joined_at: '2026-05-20T10:00:00Z',
    };

    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(<MemberListItem member={member} onRemove={mockOnRemove} />);

    expect(screen.getByText('user-123')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const member: ChannelMember = {
      member_id: 'user-123',
      member_type: 'human',
      role: 'member',
      joined_at: '2026-05-20T10:00:00Z',
    };

    mockUseUser.mockReturnValue({
      data: { id: 'user-123', name: 'John Doe' },
    } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(<MemberListItem member={member} onRemove={mockOnRemove} />);

    const removeButton = screen.getByRole('button');
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith('user-123');
    expect(mockOnRemove).toHaveBeenCalledTimes(1);
  });

  it('fetches user data only for human members', () => {
    const member: ChannelMember = {
      member_id: 'user-123',
      member_type: 'human',
      role: 'member',
      joined_at: '2026-05-20T10:00:00Z',
    };

    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(<MemberListItem member={member} onRemove={mockOnRemove} />);

    expect(mockUseUser).toHaveBeenCalledWith('user-123', { enabled: true });
    expect(mockUseAgent).toHaveBeenCalledWith('', { enabled: false });
  });

  it('fetches agent data only for agent members', () => {
    const member: ChannelMember = {
      member_id: 'agent-456',
      member_type: 'agent',
      role: 'member',
      joined_at: '2026-05-21T10:00:00Z',
    };

    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(<MemberListItem member={member} onRemove={mockOnRemove} />);

    expect(mockUseUser).toHaveBeenCalledWith('', { enabled: false });
    expect(mockUseAgent).toHaveBeenCalledWith('agent-456', { enabled: true });
  });
});
