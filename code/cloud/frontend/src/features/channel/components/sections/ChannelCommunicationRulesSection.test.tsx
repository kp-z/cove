import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelCommunicationRulesSection } from './ChannelCommunicationRulesSection';

describe('ChannelCommunicationRulesSection', () => {
  const mockOnRulesChange = vi.fn();

  const defaultRules = {
    allowMentions: true,
    allowThreads: true,
    allowAttachments: true,
    maxMessageLength: 10000,
    maxMembers: undefined,
    rateLimit: undefined,
  };

  beforeEach(() => {
    mockOnRulesChange.mockClear();
  });

  it('should render with default rules', () => {
    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    expect(screen.getByText('Communication Rules')).toBeInTheDocument();
    expect(screen.getByText('Mentions')).toBeInTheDocument();
    expect(screen.getByText('Threads')).toBeInTheDocument();
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });

  it('should display all switches in correct state', () => {
    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(3);
  });

  it('should call onRulesChange when toggling mentions', async () => {
    const user = userEvent.setup();

    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]); // Toggle mentions

    expect(mockOnRulesChange).toHaveBeenCalledWith({
      ...defaultRules,
      allowMentions: false,
    });
  });

  it('should display max message length input', () => {
    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    const input = screen.getByDisplayValue('10000');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
  });

  it('should call onRulesChange when changing max message length', async () => {
    const user = userEvent.setup();

    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    const input = screen.getByDisplayValue('10000');
    await user.clear(input);
    await user.type(input, '5000');

    expect(mockOnRulesChange).toHaveBeenCalled();
  });

  it('should handle rate limit configuration', () => {
    const rulesWithRateLimit = {
      ...defaultRules,
      rateLimit: {
        messagesPerMinute: 60,
        enabled: true,
      },
    };

    render(
      <ChannelCommunicationRulesSection
        rules={rulesWithRateLimit}
        onRulesChange={mockOnRulesChange}
      />
    );

    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
  });

  it('should disable rate limit input when rate limit is not enabled', () => {
    const rulesWithDisabledRateLimit = {
      ...defaultRules,
      rateLimit: {
        messagesPerMinute: 60,
        enabled: false,
      },
    };

    render(
      <ChannelCommunicationRulesSection
        rules={rulesWithDisabledRateLimit}
        onRulesChange={mockOnRulesChange}
      />
    );

    const rateLimitInput = screen.getByDisplayValue('60');
    expect(rateLimitInput).toBeDisabled();
  });

  it('should handle optional maxMembers field', () => {
    const rulesWithMaxMembers = {
      ...defaultRules,
      maxMembers: 100,
    };

    render(
      <ChannelCommunicationRulesSection
        rules={rulesWithMaxMembers}
        onRulesChange={mockOnRulesChange}
      />
    );

    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('should show placeholder for unlimited max members', () => {
    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    expect(screen.getByPlaceholderText('Unlimited')).toBeInTheDocument();
  });

  it('should call onRulesChange when enabling rate limit', async () => {
    const user = userEvent.setup();

    render(
      <ChannelCommunicationRulesSection
        rules={defaultRules}
        onRulesChange={mockOnRulesChange}
      />
    );

    const switches = screen.getAllByRole('switch');
    const rateLimitSwitch = switches[3]; // 4th switch is rate limit
    await user.click(rateLimitSwitch);

    expect(mockOnRulesChange).toHaveBeenCalledWith({
      ...defaultRules,
      rateLimit: {
        messagesPerMinute: 60,
        enabled: true,
      },
    });
  });
});
