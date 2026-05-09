import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../../../test/test-utils';
import { CollapseButton } from '../../ui/CollapseButton';

describe('CollapseButton', () => {
  it('renders a button', () => {
    renderWithRouter(<CollapseButton collapsed={false} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    let clicked = false;
    renderWithRouter(
      <CollapseButton collapsed={false} onClick={() => { clicked = true; }} />
    );

    await user.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });
});
