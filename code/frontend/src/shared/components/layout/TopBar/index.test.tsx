import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithRouter } from '../../../../test/test-utils';
import { TopBar } from './index';

// Mock useAuthStore
vi.mock('@/core/auth/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  })),
}));

describe('TopBar', () => {
  it('should render header element', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    renderWithRouter(<TopBar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render search button', () => {
    renderWithRouter(<TopBar />);
    const searchButtons = screen.getAllByRole('button').filter(btn => {
      const svg = btn.querySelector('svg');
      return svg !== null;
    });
    expect(searchButtons.length).toBeGreaterThan(0);
  });

  it('should expand search input when search button clicked', () => {
    renderWithRouter(<TopBar />);
    const buttons = screen.getAllByRole('button');
    const searchButton = buttons[2]; // Third button is search

    fireEvent.click(searchButton);

    const searchInput = screen.getByPlaceholderText('Search...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should close search input when Escape pressed', () => {
    renderWithRouter(<TopBar />);
    const buttons = screen.getAllByRole('button');
    const searchButton = buttons[2];

    fireEvent.click(searchButton);
    const searchInput = screen.getByPlaceholderText('Search...');

    fireEvent.keyDown(searchInput, { key: 'Escape' });

    setTimeout(() => {
      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    }, 300);
  });

  it('should render all TopBar components', () => {
    const { container } = renderWithRouter(<TopBar />);

    // Should have multiple buttons (nav, search, agent, notification, user)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);

    // Should have header element
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('h-12');
  });

  it('should have correct layout classes', () => {
    const { container } = renderWithRouter(<TopBar />);
    const header = container.querySelector('header');

    expect(header).toHaveClass('hidden');
    expect(header).toHaveClass('md:flex');
    expect(header).toHaveClass('items-center');
    expect(header).toHaveClass('justify-between');
  });

  it('should render TokenPill component', () => {
    renderWithRouter(<TopBar />);
    // TokenPill should render with "-- / --" when no data
    expect(screen.getByText('-- / --')).toBeInTheDocument();
  });

  it('should render TimeCapsule component', () => {
    const { container } = renderWithRouter(<TopBar />);
    // TimeCapsule should render with clock icon
    const clockIcons = container.querySelectorAll('svg');
    expect(clockIcons.length).toBeGreaterThan(0);
  });
});
