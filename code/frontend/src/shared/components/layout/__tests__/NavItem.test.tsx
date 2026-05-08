import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithRouter } from '../../../../test/test-utils';
import { NavItem } from '../../ui/NavItem';
import { LayoutDashboard } from 'lucide-react';

const mockItem = {
  name: 'Dashboard',
  path: '/',
  icon: LayoutDashboard,
};

describe('NavItem', () => {
  it('renders item name when not collapsed', () => {
    renderWithRouter(<NavItem item={mockItem} collapsed={false} />, { route: '/other' });
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('hides item name when collapsed', () => {
    renderWithRouter(<NavItem item={mockItem} collapsed={true} />, { route: '/other' });
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders as a link to the correct path', () => {
    renderWithRouter(<NavItem item={mockItem} collapsed={false} />, { route: '/other' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/');
  });

  it('shows title when collapsed', () => {
    renderWithRouter(<NavItem item={mockItem} collapsed={true} />, { route: '/other' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('title', 'Dashboard');
  });

  it('applies active styles when route matches', () => {
    renderWithRouter(<NavItem item={mockItem} collapsed={false} />, { route: '/' });
    const link = screen.getByRole('link');
    expect(link.className).toContain('bg-blue-600/30');
  });
});
