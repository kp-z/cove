import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('should render with default variant and size', () => {
    render(<Button>Default Button</Button>);
    expect(screen.getByRole('button', { name: 'Default Button' })).toBeInTheDocument();
  });

  it('should render with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const button = screen.getByRole('button', { name: 'Outline Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('border-border');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole('button', { name: 'Secondary Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-secondary');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    const button = screen.getByRole('button', { name: 'Ghost Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('hover:bg-muted');
  });

  it('should render with destructive variant', () => {
    render(<Button variant="destructive">Destructive Button</Button>);
    const button = screen.getByRole('button', { name: 'Destructive Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-destructive/10');
  });

  it('should render with link variant', () => {
    render(<Button variant="link">Link Button</Button>);
    const button = screen.getByRole('button', { name: 'Link Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('text-primary');
  });

  it('should render with small size', () => {
    render(<Button size="sm">Small Button</Button>);
    const button = screen.getByRole('button', { name: 'Small Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('h-7');
  });

  it('should render with large size', () => {
    render(<Button size="lg">Large Button</Button>);
    const button = screen.getByRole('button', { name: 'Large Button' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('h-9');
  });

  it('should render with icon size', () => {
    render(<Button size="icon">Icon</Button>);
    const button = screen.getByRole('button', { name: 'Icon' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('size-8');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click Me</Button>);

    const button = screen.getByRole('button', { name: 'Click Me' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
  });

  it('should not trigger click when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);

    const button = screen.getByRole('button', { name: 'Disabled Button' });
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByRole('button', { name: 'Custom Button' });
    expect(button).toHaveClass('custom-class');
  });

  it('should render children correctly', () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should accept additional props', () => {
    render(<Button data-testid="test-button">Test Button</Button>);
    expect(screen.getByTestId('test-button')).toBeInTheDocument();
  });

  it('should render with type attribute', () => {
    render(<Button type="submit">Submit Button</Button>);
    const button = screen.getByRole('button', { name: 'Submit Button' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should combine variant and size classes', () => {
    render(<Button variant="outline" size="sm">Combined Button</Button>);
    const button = screen.getByRole('button', { name: 'Combined Button' });
    expect(button).toHaveClass('border-border');
    expect(button).toHaveClass('h-7');
  });
});
