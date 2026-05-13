import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('should navigate to login page when login button clicked', () => {
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
    fireEvent.click(loginButton);

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

  it('should show dropdown menu when avatar clicked', () => {
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
    fireEvent.click(avatarButton);

    // Dropdown should show username and email
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should call logout when logout button clicked', () => {
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
    fireEvent.click(avatarButton);

    const logoutButton = screen.getByText('Log out');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should navigate to settings when settings clicked', () => {
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
    fireEvent.click(avatarButton);

    const settingsButton = screen.getByText('Account Settings');
    fireEvent.click(settingsButton);

    expect(mockNavigate).toHaveBeenCalledWith('/settings?tab=profile');
  });
});
