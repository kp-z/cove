import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch';

describe('Switch', () => {
  it('should render switch element', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('should be unchecked by default', () => {
    render(<Switch />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('should render as checked when checked prop is true', () => {
    render(<Switch checked />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });

  it('should toggle state on click', async () => {
    const user = userEvent.setup();
    render(<Switch />);
    const switchElement = screen.getByRole('switch');

    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    await user.click(switchElement);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');

    await user.click(switchElement);
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('should call onCheckedChange handler', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch onCheckedChange={handleChange} />);

    const switchElement = screen.getByRole('switch');
    await user.click(switchElement);

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-disabled', '');
  });

  it('should not toggle when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Switch disabled onCheckedChange={handleChange} />);

    const switchElement = screen.getByRole('switch');
    await user.click(switchElement);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should render with default size', () => {
    render(<Switch />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-size', 'default');
  });

  it('should render with small size', () => {
    render(<Switch size="sm" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-size', 'sm');
  });

  it('should accept custom className', () => {
    render(<Switch className="custom-class" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveClass('custom-class');
  });

  it('should render with aria-invalid attribute', () => {
    render(<Switch aria-invalid />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-invalid', 'true');
  });

  it('should accept additional props', () => {
    render(<Switch data-testid="test-switch" />);
    expect(screen.getByTestId('test-switch')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    render(<Switch />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-slot', 'switch');
  });

  it('should render thumb element', () => {
    const { container } = render(<Switch />);
    const thumb = container.querySelector('[data-slot="switch-thumb"]');
    expect(thumb).toBeInTheDocument();
  });

  it('should work as controlled component', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Switch checked={false} onCheckedChange={handleChange} />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'false');

    await user.click(switchElement);
    expect(handleChange).toHaveBeenCalled();

    rerender(<Switch checked={true} onCheckedChange={handleChange} />);
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });
});
