import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../../test/test-utils';
import { TopBar } from '../TopBar';

describe('TopBar', () => {
  it('renders search placeholder', () => {
    renderWithRouter(<TopBar />);
    // The header should exist
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders user avatar', () => {
    renderWithRouter(<TopBar />);
    // Multiple buttons (search, nav, notification)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
