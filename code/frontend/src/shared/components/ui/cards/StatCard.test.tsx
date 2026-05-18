import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  it('should render title and value', () => {
    render(<StatCard title="Total Users" value={1234} icon={Activity} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('should render with string value', () => {
    render(<StatCard title="Status" value="Active" icon={Activity} />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should render with number value', () => {
    render(<StatCard title="Count" value={42} icon={Activity} />);
    expect(screen.getByText('Count')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render icon', () => {
    const { container } = render(<StatCard title="Test" value={100} icon={Activity} />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('w-8');
    expect(icon).toHaveClass('h-8');
  });

  it('should render trend when provided', () => {
    render(<StatCard title="Sales" value={5000} icon={Activity} trend="+12% from last month" />);
    expect(screen.getByText('+12% from last month')).toBeInTheDocument();
  });

  it('should not render trend when not provided', () => {
    const { container } = render(<StatCard title="Sales" value={5000} icon={Activity} />);
    const trendElements = container.querySelectorAll('.text-xs');
    expect(trendElements.length).toBe(0);
  });

  it('should render within GlassCard', () => {
    const { container } = render(<StatCard title="Test" value={100} icon={Activity} />);
    const glassCard = container.querySelector('.backdrop-blur-md');
    expect(glassCard).toBeInTheDocument();
  });

  it('should have correct text styling', () => {
    render(<StatCard title="Revenue" value="$10,000" icon={Activity} trend="+5%" />);

    const title = screen.getByText('Revenue');
    expect(title).toHaveClass('text-sm');
    expect(title).toHaveClass('text-muted-foreground');

    const value = screen.getByText('$10,000');
    expect(value).toHaveClass('text-3xl');
    expect(value).toHaveClass('font-bold');

    const trend = screen.getByText('+5%');
    expect(trend).toHaveClass('text-xs');
    expect(trend).toHaveClass('text-muted-foreground');
  });

  it('should render icon with primary color', () => {
    const { container } = render(<StatCard title="Test" value={100} icon={Activity} />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('text-primary');
  });
});
