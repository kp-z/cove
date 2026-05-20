import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AdvancedLoader } from './AdvancedLoader';

describe('AdvancedLoader', () => {
  it('should render loader', () => {
    const { container } = render(<AdvancedLoader />);
    const loader = container.querySelector('.relative');
    expect(loader).toBeInTheDocument();
  });

  it('should render with default medium size', () => {
    const { container } = render(<AdvancedLoader />);
    const loader = container.querySelector('.w-12.h-12');
    expect(loader).toBeInTheDocument();
  });

  it('should render with small size', () => {
    const { container } = render(<AdvancedLoader size="sm" />);
    const loader = container.querySelector('.w-8.h-8');
    expect(loader).toBeInTheDocument();
  });

  it('should render with large size', () => {
    const { container } = render(<AdvancedLoader size="lg" />);
    const loader = container.querySelector('.w-16.h-16');
    expect(loader).toBeInTheDocument();
  });

  it('should render three animated dots', () => {
    const { container } = render(<AdvancedLoader />);
    const dots = container.querySelectorAll('.rounded-full.bg-primary');
    expect(dots).toHaveLength(3);
  });

  it('should not render message by default', () => {
    render(<AdvancedLoader />);
    const message = screen.queryByText(/./);
    expect(message).not.toBeInTheDocument();
  });

  it('should render message when provided', () => {
    render(<AdvancedLoader message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should apply muted text color to message', () => {
    render(<AdvancedLoader message="Loading..." />);
    const message = screen.getByText('Loading...');
    expect(message).toHaveClass('text-muted-foreground');
  });

  it('should center loader and message', () => {
    const { container } = render(<AdvancedLoader message="Loading..." />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
  });
});
