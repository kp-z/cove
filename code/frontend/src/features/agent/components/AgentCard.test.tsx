import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentCard } from './AgentCard';
import type { Agent } from '@/lib/trpc-types';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'category.engineering': 'Engineering',
        'category.operations': 'Operations',
        'category.design': 'Design',
        'category.qa': 'QA',
        'category.research': 'Research',
        'category.platform': 'Platform',
        'category.collaboration': 'Collaboration',
        'category.custom': 'Custom',
        'status.idle': 'Idle',
        'status.active': 'Active',
        'status.disabled': 'Disabled',
        'status.error': 'Error',
        'card.status': 'Status',
        'card.category': 'Category',
        'card.delete': 'Delete',
        'card.empty.noCapabilities': 'No capabilities',
        'actions.run': 'Run',
        'actions.config': 'Configure',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock avatar utils
vi.mock('../utils/avatar', () => ({
  getAgentAvatarUrl: (id: string, name: string) => `https://avatar.example.com/${id}`,
  getAgentInitials: (name: string) => name.slice(0, 2).toUpperCase(),
}));

const mockAgent: Agent = {
  agent_id: 'agent-123',
  name: 'test-agent',
  display_name: 'Test Agent',
  description: 'A test agent for unit testing',
  status: 'idle',
  category: 'engineering',
  capabilities: ['coding', 'testing', 'debugging'],
  tags: ['typescript', 'react'],
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

describe('AgentCard', () => {
  it('should render agent information', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('A test agent for unit testing')).toBeInTheDocument();
    // Engineering appears multiple times (badge and stats grid)
    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
  });

  it('should display agent avatar', () => {
    render(<AgentCard agent={mockAgent} />);

    const avatar = screen.getByAltText('test-agent');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://avatar.example.com/agent-123');
  });

  it('should display initials when avatar fails to load', async () => {
    const { container } = render(<AgentCard agent={mockAgent} />);

    const avatar = screen.getByAltText('test-agent') as HTMLImageElement;

    // Trigger error event
    const errorEvent = new Event('error');
    Object.defineProperty(errorEvent, 'target', { value: avatar, enumerable: true });
    avatar.dispatchEvent(errorEvent);

    // Wait for state update
    await waitFor(() => {
      expect(container.textContent).toContain('TE');
    });
  });

  it('should display agent status', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getAllByText('Idle')[0]).toBeInTheDocument();
  });

  it('should display all status types correctly', () => {
    const statuses: Array<'idle' | 'active' | 'disabled' | 'error'> = ['idle', 'active', 'disabled', 'error'];
    const statusLabels = ['Idle', 'Active', 'Disabled', 'Error'];

    statuses.forEach((status, index) => {
      const { unmount } = render(
        <AgentCard agent={{ ...mockAgent, status }} />
      );

      expect(screen.getAllByText(statusLabels[index])[0]).toBeInTheDocument();
      unmount();
    });
  });

  it('should display capabilities', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('coding')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('debugging')).toBeInTheDocument();
  });

  it('should show "+N" badge when more than 3 capabilities', () => {
    const agentWithManyCapabilities = {
      ...mockAgent,
      capabilities: ['cap1', 'cap2', 'cap3', 'cap4', 'cap5'],
    };

    render(<AgentCard agent={agentWithManyCapabilities} />);

    expect(screen.getByText('cap1')).toBeInTheDocument();
    expect(screen.getByText('cap2')).toBeInTheDocument();
    expect(screen.getByText('cap3')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('cap4')).not.toBeInTheDocument();
  });

  it('should show "No capabilities" when capabilities array is empty', () => {
    const agentWithoutCapabilities = {
      ...mockAgent,
      capabilities: [],
    };

    render(<AgentCard agent={agentWithoutCapabilities} />);

    expect(screen.getByText('No capabilities')).toBeInTheDocument();
  });

  it('should display tags count badge', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should call onRun when Run button is clicked', async () => {
    const user = userEvent.setup();
    const onRun = vi.fn();

    render(<AgentCard agent={mockAgent} onRun={onRun} />);

    const runButton = screen.getByRole('button', { name: /run/i });
    await user.click(runButton);

    expect(onRun).toHaveBeenCalledWith(mockAgent);
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('should call onConfigure when Configure button is clicked', async () => {
    const user = userEvent.setup();
    const onConfigure = vi.fn();

    render(<AgentCard agent={mockAgent} onConfigure={onConfigure} />);

    const configButton = screen.getByRole('button', { name: /configure/i });
    await user.click(configButton);

    expect(onConfigure).toHaveBeenCalledWith(mockAgent);
    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('should disable Run button when agent status is error', () => {
    const agentWithError = {
      ...mockAgent,
      status: 'error' as const,
    };

    render(<AgentCard agent={agentWithError} />);

    const runButton = screen.getByRole('button', { name: /run/i });
    expect(runButton).toBeDisabled();
  });

  it('should call onDelete when Delete menu item is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    const { container } = render(<AgentCard agent={mockAgent} onDelete={onDelete} />);

    // Find the menu trigger button (MoreVertical icon button)
    const menuButtons = container.querySelectorAll('button');
    const menuButton = Array.from(menuButtons).find(btn =>
      btn.querySelector('svg') && !btn.textContent?.includes('Run') && !btn.textContent?.includes('Configure')
    );

    expect(menuButton).toBeDefined();
    await user.click(menuButton!);

    // Wait for menu to appear and click delete
    await waitFor(async () => {
      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);
    });

    expect(onDelete).toHaveBeenCalledWith(mockAgent);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('should use display_name if available, otherwise use name', () => {
    const { rerender } = render(<AgentCard agent={mockAgent} />);
    expect(screen.getByText('Test Agent')).toBeInTheDocument();

    const agentWithoutDisplayName = {
      ...mockAgent,
      display_name: undefined,
    };
    rerender(<AgentCard agent={agentWithoutDisplayName} />);
    expect(screen.getByText('test-agent')).toBeInTheDocument();
  });

  it('should render all category types correctly', () => {
    const categories: Array<'engineering' | 'operations' | 'design' | 'qa' | 'research' | 'platform' | 'collaboration' | 'custom'> = [
      'engineering',
      'operations',
      'design',
      'qa',
      'research',
      'platform',
      'collaboration',
      'custom',
    ];
    const categoryLabels = [
      'Engineering',
      'Operations',
      'Design',
      'QA',
      'Research',
      'Platform',
      'Collaboration',
      'Custom',
    ];

    categories.forEach((category, index) => {
      const { unmount } = render(
        <AgentCard agent={{ ...mockAgent, category }} />
      );

      // Category appears twice: in badge and in stats grid
      const elements = screen.getAllByText(categoryLabels[index]);
      expect(elements.length).toBeGreaterThanOrEqual(1);
      unmount();
    });
  });
});
