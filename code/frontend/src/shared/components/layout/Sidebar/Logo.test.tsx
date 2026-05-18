import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../../../test/test-utils';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders logo icon', () => {
    renderWithRouter(<Logo collapsed={false} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('shows brand text when not collapsed', () => {
    renderWithRouter(<Logo collapsed={false} />);
    expect(screen.getByText('COVE')).toBeInTheDocument();
    expect(screen.getByText('AI WORKS, YOU CHILL')).toBeInTheDocument();
  });

  it('hides brand text when collapsed', () => {
    renderWithRouter(<Logo collapsed={true} />);
    expect(screen.queryByText('COVE')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    let clicked = false;
    renderWithRouter(<Logo collapsed={false} onClick={() => { clicked = true; }} />);

    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });
});
