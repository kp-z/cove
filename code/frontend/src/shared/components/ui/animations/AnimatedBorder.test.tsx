import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnimatedBorder } from './AnimatedBorder';

describe('AnimatedBorder', () => {
  it('should render animated border', () => {
    const { container } = render(<AnimatedBorder />);
    const border = container.querySelector('.absolute.bottom-0');
    expect(border).toBeInTheDocument();
  });

  it('should have correct positioning classes', () => {
    const { container } = render(<AnimatedBorder />);
    const border = container.querySelector('div');
    expect(border).toHaveClass('absolute', 'bottom-0', 'left-0', 'right-0', 'h-px');
  });

  it('should render as motion div', () => {
    const { container } = render(<AnimatedBorder />);
    const border = container.querySelector('div');
    expect(border).toBeInTheDocument();
  });
});
