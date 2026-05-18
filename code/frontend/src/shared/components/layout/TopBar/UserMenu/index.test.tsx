import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { UserMenu } from './index';
import { useAuthStore } from '@/core/auth/authStore';

// Mock useAuthStore
vi.mock('@/core/auth/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login button when not authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <BrowserRouter>
        <UserMenu />
      </BrowserRouter>
    );

    expect(screen.getByText('Log in')).toBeInTheDocument();
  });

  it('should navigate to login page when login button clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      isAuthenticated: false,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <BrowserRouter>
        <UserMenu />
      </BrowserRouter>
    );

    const loginButton = screen.getByText('Log in');
    await user.click(loginButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should render user avatar when authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <BrowserRouter>
        <UserMenu />
      </BrowserRouter>
    );

    // Should render user initial
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should show dropdown menu when avatar clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <BrowserRouter>
        <UserMenu />
      </BrowserRouter>
    );

    const avatarButton = screen.getByRole('button');
    await user.click(avatarButton);

    // Dropdown should show username and email
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
    // Username appears in multiple places (button and dropdown), so just check email
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should call logout when logout button clicked', async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn();
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
      login: vi.fn(),
      logout: mockLogout,
      updateUser: vi.fn(),
    });

    render(
      <BrowserRouter>
        <UserMenu />
      </BrowserRouter>
    );

    const avatarButton = screen.getByRole('button');
    await user.click(avatarButton);

    const logoutButton = await screen.findByText('Log out');
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to settings when settings clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuthStore).mockReturnValue({
      user: {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      },
      isAuthenticated: true,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    });

    render(
      <BrowserRouter>
        <UserMenu />
      </BrowserRouter>
    );

    const avatarButton = screen.getByRole('button');
    await user.click(avatarButton);

    const settingsButton = await screen.findByText('Account Settings');
    await user.click(settingsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/settings?tab=profile');
  });
});
