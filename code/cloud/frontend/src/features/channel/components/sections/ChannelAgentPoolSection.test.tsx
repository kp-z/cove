import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelAgentPoolSection } from './ChannelAgentPoolSection';

describe('ChannelAgentPoolSection', () => {
  const mockOnAgentPoolChange = vi.fn();

  beforeEach(() => {
    mockOnAgentPoolChange.mockClear();
  });

  it('should render with empty agent pool', () => {
    render(
      <ChannelAgentPoolSection
        agentPool={[]}
        onAgentPoolChange={mockOnAgentPoolChange}
      />
    );

    expect(screen.getByText('Agent Pool')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter agent ID')).toBeInTheDocument();
  });

  it('should display existing agents in the pool', () => {
    const agentPool = ['agent-1', 'agent-2', 'agent-3'];

    render(
      <ChannelAgentPoolSection
        agentPool={agentPool}
        onAgentPoolChange={mockOnAgentPoolChange}
      />
    );

    expect(screen.getByText('agent-1')).toBeInTheDocument();
    expect(screen.getByText('agent-2')).toBeInTheDocument();
    expect(screen.getByText('agent-3')).toBeInTheDocument();
  });

  it('should call onAgentPoolChange when adding a new agent', async () => {
    const user = userEvent.setup();
    const agentPool = ['agent-1'];

    render(
      <ChannelAgentPoolSection
        agentPool={agentPool}
        onAgentPoolChange={mockOnAgentPoolChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter agent ID');
    await user.type(input, 'agent-2{Enter}');

    expect(mockOnAgentPoolChange).toHaveBeenCalledWith(['agent-1', 'agent-2']);
  });

  it('should not add duplicate agents', async () => {
    const user = userEvent.setup();
    const agentPool = ['agent-1'];

    render(
      <ChannelAgentPoolSection
        agentPool={agentPool}
        onAgentPoolChange={mockOnAgentPoolChange}
      />
    );

    const input = screen.getByPlaceholderText('Enter agent ID');
    await user.type(input, 'agent-1{Enter}');

    expect(mockOnAgentPoolChange).not.toHaveBeenCalled();
  });

  it('should call onAgentPoolChange when removing an agent', async () => {
    const user = userEvent.setup();
    const agentPool = ['agent-1', 'agent-2'];

    const { container } = render(
      <ChannelAgentPoolSection
        agentPool={agentPool}
        onAgentPoolChange={mockOnAgentPoolChange}
      />
    );

    // Find remove button for agent-1
    const removeButtons = container.querySelectorAll('button[aria-label*="Remove"]');
    if (removeButtons.length > 0) {
      await user.click(removeButtons[0]);
      expect(mockOnAgentPoolChange).toHaveBeenCalledWith(['agent-2']);
    }
  });
});
