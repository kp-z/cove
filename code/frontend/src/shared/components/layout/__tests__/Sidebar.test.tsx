import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../../test/test-utils';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('renders Logo, Navigation, and UserSection', () => {
    renderWithRouter(<Sidebar collapsed={false} onToggle={() => {}} />, {
      route: '/',
    });
    // Logo text
    expect(screen.getByText('Open')).toBeInTheDocument();
    // Navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // User section
    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('renders collapse button', () => {
    renderWithRouter(<Sidebar collapsed={false} onToggle={() => {}} />, {
      route: '/',
    });
    // CollapseButton is a button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('passes collapsed state to children', () => {
    renderWithRouter(<Sidebar collapsed={true} onToggle={() => {}} />, {
      route: '/',
    });
    // Logo text hidden when collapsed
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
    // User text hidden when collapsed
    expect(screen.queryByText('user@cove.ai')).not.toBeInTheDocument();
  });
});
