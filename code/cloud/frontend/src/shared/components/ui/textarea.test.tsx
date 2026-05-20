import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('should render textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render with placeholder', () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('should handle value changes', async () => {
    const user = userEvent.setup();
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Multi-line\ntext content');
    expect(textarea).toHaveValue('Multi-line\ntext content');
  });

  it('should call onChange handler', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Textarea onChange={handleChange} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Test');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should not accept input when disabled', async () => {
    const user = userEvent.setup();
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');

    await user.type(textarea, 'Test');
    expect(textarea).toHaveValue('');
  });

  it('should accept custom className', () => {
    render(<Textarea className="custom-class" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-class');
  });

  it('should render with aria-invalid attribute', () => {
    render(<Textarea aria-invalid />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
  });

  it('should render with default value', () => {
    render(<Textarea defaultValue="Default text" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Default text');
  });

  it('should render with controlled value', () => {
    render(<Textarea value="Controlled value" onChange={() => {}} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Controlled value');
  });

  it('should accept additional props', () => {
    render(<Textarea data-testid="test-textarea" />);
    expect(screen.getByTestId('test-textarea')).toBeInTheDocument();
  });

  it('should have data-slot attribute', () => {
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('data-slot', 'textarea');
  });

  it('should support rows attribute', () => {
    render(<Textarea rows={5} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('should support maxLength attribute', () => {
    render(<Textarea maxLength={100} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '100');
  });
});
