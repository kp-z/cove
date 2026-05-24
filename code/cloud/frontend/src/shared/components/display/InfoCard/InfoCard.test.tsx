import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { InfoCard } from './InfoCard';
import { useUser } from '@/lib/trpc/hooks/user.hooks';
import { useAgent } from '@/lib/trpc/hooks/agent.hooks';

// Mock the hooks
jest.mock('@/lib/trpc/hooks/user.hooks');
jest.mock('@/lib/trpc/hooks/agent.hooks');
jest.mock('@/shared/components/display/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));
jest.mock('@/shared/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseAgent = useAgent as jest.MockedFunction<typeof useAgent>;

describe('InfoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(
      <InfoCard type="user" id="user-123" name="Test User">
        <button>Trigger</button>
      </InfoCard>
    );

    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('displays user information on hover', async () => {
    const user = userEvent.setup();
    mockUseUser.mockReturnValue({
      data: {
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      },
    } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(
      <InfoCard type="user" id="user-123" name="John Doe" role="admin" joinedAt="2026-05-20">
        <button>Trigger</button>
      </InfoCard>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Role: admin/)).toBeInTheDocument();
    });
  });

  it('displays agent information on hover', async () => {
    const user = userEvent.setup();
    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({
      data: {
        agent_id: 'agent-456',
        name: 'bot-helper',
        display_name: 'Helper Bot',
        description: 'A helpful assistant',
      },
    } as any);

    render(
      <InfoCard type="agent" id="agent-456" name="Helper Bot" role="member">
        <button>Trigger</button>
      </InfoCard>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText('Helper Bot')).toBeInTheDocument();
      expect(screen.getByText('A helpful assistant')).toBeInTheDocument();
      expect(screen.getByText(/Role: member/)).toBeInTheDocument();
    });
  });

  it('shows joined date when provided', async () => {
    const user = userEvent.setup();
    mockUseUser.mockReturnValue({
      data: { id: 'user-123', name: 'Test User' },
    } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(
      <InfoCard type="user" id="user-123" name="Test User" joinedAt="2026-05-20T10:00:00Z">
        <button>Trigger</button>
      </InfoCard>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText(/Joined:/)).toBeInTheDocument();
    });
  });

  it('does not fetch data until hover', () => {
    mockUseUser.mockReturnValue({ data: undefined } as any);
    mockUseAgent.mockReturnValue({ data: undefined } as any);

    render(
      <InfoCard type="user" id="user-123" name="Test User">
        <button>Trigger</button>
      </InfoCard>
    );

    // Should be called with enabled: false initially
    expect(mockUseUser).toHaveBeenCalledWith('user-123', { enabled: false });
  });
});
