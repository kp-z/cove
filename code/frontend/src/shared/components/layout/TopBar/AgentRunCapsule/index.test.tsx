import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentRunCapsule } from './index';

describe('AgentRunCapsule', () => {
  it('should render bot icon when no running agents', () => {
    const { container } = render(<AgentRunCapsule runningCount={0} />);
    const botIcon = container.querySelector('svg');
    expect(botIcon).toBeInTheDocument();
  });

  it('should render loading spinner when has running agents', () => {
    const { container } = render(<AgentRunCapsule runningCount={3} />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show pulse animation when has running agents', () => {
    const { container } = render(<AgentRunCapsule runningCount={2} />);
    const pulseElement = container.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('should have correct aria-label when no running agents', () => {
    render(<AgentRunCapsule runningCount={0} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Agent 执行与历史');
  });

  it('should have correct aria-label when has running agents', () => {
    render(<AgentRunCapsule runningCount={3} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Agent 执行，3 项进行中');
  });

  it('should open popover when clicked', () => {
    render(<AgentRunCapsule runningCount={0} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('快捷 Agent（开发中）')).toBeInTheDocument();
  });

  it('should show empty state in popover', () => {
    render(<AgentRunCapsule runningCount={0} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('历史')).toBeInTheDocument();
    expect(screen.getByText('暂无记录')).toBeInTheDocument();
  });

  it('should apply correct styles when has running agents', () => {
    const { container } = render(<AgentRunCapsule runningCount={2} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('border-blue-400/30');
    expect(button).toHaveClass('bg-blue-500/12');
  });

  it('should apply correct styles when no running agents', () => {
    const { container } = render(<AgentRunCapsule runningCount={0} />);
    const button = container.querySelector('button');
    expect(button).not.toHaveClass('border-blue-400/30');
    expect(button).not.toHaveClass('bg-blue-500/12');
  });
});
