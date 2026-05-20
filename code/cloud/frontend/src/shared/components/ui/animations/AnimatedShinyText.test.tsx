import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedShinyText } from './AnimatedShinyText';

describe('AnimatedShinyText', () => {
  it('should render children', () => {
    render(<AnimatedShinyText>Shiny Text</AnimatedShinyText>);
    expect(screen.getByText('Shiny Text')).toBeInTheDocument();
  });

  it('should render as span element', () => {
    const { container } = render(<AnimatedShinyText>Text</AnimatedShinyText>);
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    render(<AnimatedShinyText className="custom-class">Text</AnimatedShinyText>);
    const element = screen.getByText('Text');
    expect(element).toHaveClass('custom-class');
  });

  it('should have default shimmerWidth of 100px', () => {
    const { container } = render(<AnimatedShinyText>Text</AnimatedShinyText>);
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ '--shiny-width': '100px' });
  });

  it('should accept custom shimmerWidth', () => {
    const { container } = render(<AnimatedShinyText shimmerWidth={200}>Text</AnimatedShinyText>);
    const span = container.querySelector('span');
    expect(span).toHaveStyle({ '--shiny-width': '200px' });
  });

  it('should have animation classes', () => {
    render(<AnimatedShinyText>Text</AnimatedShinyText>);
    const element = screen.getByText('Text');
    expect(element).toHaveClass('animate-shiny-text');
    expect(element).toHaveClass('bg-clip-text');
    expect(element).toHaveClass('text-transparent');
  });

  it('should have gradient background classes', () => {
    render(<AnimatedShinyText>Text</AnimatedShinyText>);
    const element = screen.getByText('Text');
    expect(element).toHaveClass('bg-gradient-to-r');
  });
});
