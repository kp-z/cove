import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';

describe('Input', () => {
  it('should render input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should render with default text type', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should render with password type', () => {
    const { container } = render(<Input type="password" />);
    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('should render with email type', () => {
    const { container } = render(<Input type="email" />);
    const input = container.querySelector('input[type="email"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    render(<Input />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'Hello World');
    expect(input).toHaveValue('Hello World');
  });

  it('should call onChange handler', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('should not accept input when disabled', async () => {
    const user = userEvent.setup();
    render(<Input disabled />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'Test');
    expect(input).toHaveValue('');
  });

  it('should accept custom className', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('should render with aria-invalid attribute', () => {
    render(<Input aria-invalid />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should render with default value', () => {
    render(<Input defaultValue="Default text" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Default text');
  });

  it('should render with controlled value', () => {
    render(<Input value="Controlled value" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Controlled value');
  });

  it('should accept additional props', () => {
    render(<Input data-testid="test-input" />);
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('data-slot', 'input');
  });
});
