import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('should render with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText('Default Badge')).toBeInTheDocument();
  });

  it('should render with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>);
    const badge = screen.getByText('Secondary Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-secondary');
  });

  it('should render with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>);
    const badge = screen.getByText('Destructive Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-destructive/10');
  });

  it('should render with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>);
    const badge = screen.getByText('Outline Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('border-border');
  });

  it('should render with ghost variant', () => {
    render(<Badge variant="ghost">Ghost Badge</Badge>);
    const badge = screen.getByText('Ghost Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('hover:bg-muted');
  });

  it('should render with link variant', () => {
    render(<Badge variant="link">Link Badge</Badge>);
    const badge = screen.getByText('Link Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('text-primary');
  });

  it('should accept custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    const badge = screen.getByText('Custom Badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('should render as span by default', () => {
    const { container } = render(<Badge>Span Badge</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Span Badge');
  });

  it('should accept additional props', () => {
    render(<Badge data-testid="test-badge">Test Badge</Badge>);
    expect(screen.getByTestId('test-badge')).toBeInTheDocument();
  });

  it('should render children correctly', () => {
    render(
      <Badge>
        <span>Icon</span>
        <span>Text</span>
      </Badge>
    );
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });
});
