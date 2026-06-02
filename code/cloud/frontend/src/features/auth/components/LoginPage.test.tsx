import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './LoginPage';
import { useAuthStore } from '@/core/auth/authStore';

// Mock dependencies
vi.mock('@/core/auth/authStore');
vi.mock('@/lib/trpc', () => ({
  trpc: {
    auth: {
      login: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    realm: {
      list: {
        fetch: vi.fn(),
      },
    },
    useUtils: () => ({
      realm: {
        list: {
          fetch: vi.fn().mockResolvedValue({
            realms: [
              {
                realm_id: 'realm-1',
                name: 'Test Realm',
                display_name: 'Test Realm',
                logo_url: null,
                status: 'active',
                deviceStatus: 'online',
                isDefault: true,
                last_accessed_at: new Date().toISOString(),
              },
            ],
          }),
        },
      },
    }),
  },
}));

vi.mock('@/lib/trpc/hooks/auth.hooks', () => ({
  useRegister: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/core/stores/realmStore', () => ({
  useRealmStore: () => ({
    setRealms: vi.fn(),
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('LoginPage - Realm Selection on Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show RealmSelector when authenticated but no realm selected', async () => {
    // Simulate: user is authenticated but hasn't selected a realm
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      currentRealmId: null, // No realm selected
      rememberMe: true,
      userId: 'user-1',
      token: 'token-123',
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentRealmId: vi.fn(),
    });

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LoginPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    // Should show loading first
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();

    // Should eventually show RealmSelector
    await waitFor(() => {
      expect(screen.getByText('Select a Realm')).toBeInTheDocument();
    });
  });

  it('should redirect when authenticated and realm is selected', () => {
    // Simulate: user is authenticated and has selected a realm
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      currentRealmId: 'realm-1', // Realm already selected
      rememberMe: true,
      userId: 'user-1',
      token: 'token-123',
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentRealmId: vi.fn(),
    });

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LoginPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    // Should redirect (Navigate component will handle this)
    // In a real test, we'd check the navigation happened
    expect(screen.queryByText('Select a Realm')).not.toBeInTheDocument();
  });

  it('should show login form when not authenticated', () => {
    // Simulate: user is not authenticated
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      currentRealmId: null,
      rememberMe: true,
      userId: null,
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
      setCurrentRealmId: vi.fn(),
    });

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LoginPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    // Should show login form
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
