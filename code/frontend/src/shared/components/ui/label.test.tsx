import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('Label', () => {
  it('should render label element', () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render with htmlFor attribute', () => {
    render(<Label htmlFor="test-input">Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('for', 'test-input');
  });

  it('should accept custom className', () => {
    render(<Label className="custom-class">Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('custom-class');
  });

  it('should have data-slot attribute', () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('data-slot', 'label');
  });

  it('should render children correctly', () => {
    render(
      <Label>
        <span>Icon</span>
        <span>Label Text</span>
      </Label>
    );
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Label Text')).toBeInTheDocument();
  });

  it('should accept additional props', () => {
    render(<Label data-testid="test-label">Test Label</Label>);
    expect(screen.getByTestId('test-label')).toBeInTheDocument();
  });

  it('should have default styling classes', () => {
    render(<Label>Test Label</Label>);
    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('flex');
    expect(label).toHaveClass('items-center');
    expect(label).toHaveClass('gap-2');
    expect(label).toHaveClass('text-sm');
  });
});
