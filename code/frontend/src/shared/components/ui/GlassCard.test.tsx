import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlassCard } from './GlassCard';

describe('GlassCard', () => {
  it('should render children', () => {
    render(
      <GlassCard>
        <div>Card Content</div>
      </GlassCard>
    );
    expect(screen.getByText('Card Content')).toBeInTheDocument();
  });

  it('should accept custom className', () => {
    const { container } = render(
      <GlassCard className="custom-class">
        <div>Content</div>
      </GlassCard>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('custom-class');
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <GlassCard onClick={handleClick}>
        <div>Clickable Card</div>
      </GlassCard>
    );

    const card = container.firstChild as HTMLElement;
    await user.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should add cursor-pointer class when onClick is provided', () => {
    const { container } = render(
      <GlassCard onClick={() => {}}>
        <div>Content</div>
      </GlassCard>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('cursor-pointer');
  });

  it('should not add cursor-pointer class when onClick is not provided', () => {
    const { container } = render(
      <GlassCard>
        <div>Content</div>
      </GlassCard>
    );
    const card = container.firstChild;
    expect(card).not.toHaveClass('cursor-pointer');
  });

  it('should render with glass effect styles', () => {
    const { container } = render(
      <GlassCard>
        <div>Content</div>
      </GlassCard>
    );
    const card = container.firstChild;
    expect(card).toHaveClass('backdrop-blur-md');
    expect(card).toHaveClass('bg-white/5');
  });

  it('should render gradient overlay', () => {
    const { container } = render(
      <GlassCard>
        <div>Content</div>
      </GlassCard>
    );
    const gradient = container.querySelector('.bg-gradient-to-br');
    expect(gradient).toBeInTheDocument();
  });

  it('should render content in relative z-10 container', () => {
    const { container } = render(
      <GlassCard>
        <div data-testid="content">Content</div>
      </GlassCard>
    );
    const contentContainer = screen.getByTestId('content').parentElement;
    expect(contentContainer).toHaveClass('relative');
    expect(contentContainer).toHaveClass('z-10');
  });
});
