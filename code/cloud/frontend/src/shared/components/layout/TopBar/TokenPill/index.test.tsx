import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TokenPill, TokenUsageData } from './index';

describe('TokenPill', () => {
  it('should render loading state', () => {
    const { container } = render(<TokenPill data={undefined} isLoading={true} />);
    const loadingElement = container.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should render with token data', () => {
    const mockData: TokenUsageData = {
      model: 'claude-sonnet-4-0',
      used: 50000,
      remaining: 150000,
      total: 200000,
      percentage: 25,
    };

    render(<TokenPill data={mockData} isLoading={false} />);
    expect(screen.getByText('Sonnet 4.0')).toBeInTheDocument();
  });

  it('should show warning color when usage > 80%', () => {
    const mockData: TokenUsageData = {
      model: 'claude-sonnet-4-0',
      used: 170000,
      remaining: 30000,
      total: 200000,
      percentage: 85,
    };

    const { container } = render(<TokenPill data={mockData} isLoading={false} />);
    const dot = container.querySelector('.bg-amber-400');
    expect(dot).toBeInTheDocument();
  });

  it('should format large token numbers correctly', () => {
    const mockData: TokenUsageData = {
      model: 'claude-opus-4-5',
      used: 1500000,
      remaining: 500000,
      total: 2000000,
      percentage: 75,
    };

    render(<TokenPill data={mockData} isLoading={false} />);
    expect(screen.getByText('Opus 4.5')).toBeInTheDocument();
  });

  it('should prioritize gateway_model over model', () => {
    const mockData: TokenUsageData = {
      model: 'claude-sonnet-4-0',
      gateway_model: 'claude-opus-4-5',
      used: 50000,
      remaining: 150000,
      total: 200000,
      percentage: 25,
    };

    render(<TokenPill data={mockData} isLoading={false} />);
    expect(screen.getByText('Opus 4.5')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<TokenPill data={undefined} isLoading={false} />);
    expect(screen.getByText('-- / --')).toBeInTheDocument();
  });
});
