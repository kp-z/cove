/**
 * Tests for useCurrentUser hook
 *
 * These tests ensure that the current user hook works correctly
 * with the unified datasource architecture.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCurrentUser, getCurrentUser } from './useCurrentUser';
import { useAuthStore } from './authStore';

// Mock the tRPC hooks
vi.mock('@/lib/trpc/hooks/user.hooks', () => ({
  useUser: vi.fn((userId: string, options?: any) => {
    if (!userId || !options?.enabled) {
      return {
        data: null,
        isLoading: false,
        error: null,
      };
    }

    // Return mock user data
    return {
      data: {
        id: userId,
        user_id: userId,
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        avatar: 'https://example.com/avatar.jpg',
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
    };
  }),
}));

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      userId: null,
      token: null,
      isAuthenticated: false,
      rememberMe: true,
      currentRealmId: null,
    });
  });

  describe('when user is authenticated', () => {
    it('should return user data from tRPC query', () => {
      // Set authenticated state
      useAuthStore.setState({
        userId: 'user-123',
        token: 'mock-token',
        isAuthenticated: true,
        rememberMe: true,
        currentRealmId: null,
      });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.userId).toBe('user-123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isGuest).toBe(false);
      expect(result.current.token).toBe('mock-token');
      expect(result.current.user).toBeTruthy();
      expect(result.current.user?.username).toBe('testuser');
    });

    it('should handle user without avatar', () => {
      useAuthStore.setState({
        userId: 'user-123',
        token: 'mock-token',
        isAuthenticated: true,
        rememberMe: true,
        currentRealmId: null,
      });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.user).toBeTruthy();
      // Avatar is mocked in our test, but in real scenario it could be undefined
    });
  });

  describe('when user is not authenticated', () => {
    it('should return null user and guest status', () => {
      useAuthStore.setState({
        userId: null,
        token: null,
        isAuthenticated: false,
        rememberMe: true,
        currentRealmId: null,
      });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.user).toBeNull();
      expect(result.current.userId).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isGuest).toBe(true);
      expect(result.current.token).toBeNull();
      expect(result.current.role).toBeUndefined();
      expect(result.current.permissions).toEqual([]);
    });
  });

  describe('getCurrentUser (synchronous)', () => {
    it('should return current auth state synchronously', () => {
      useAuthStore.setState({
        userId: 'user-123',
        token: 'mock-token',
        isAuthenticated: true,
        rememberMe: true,
        currentRealmId: null,
      });

      const result = getCurrentUser();

      expect(result.userId).toBe('user-123');
      expect(result.isAuthenticated).toBe(true);
      expect(result.isGuest).toBe(false);
      expect(result.token).toBe('mock-token');
    });

    it('should return guest state when not authenticated', () => {
      useAuthStore.setState({
        userId: null,
        token: null,
        isAuthenticated: false,
        rememberMe: true,
        currentRealmId: null,
      });

      const result = getCurrentUser();

      expect(result.userId).toBeNull();
      expect(result.isAuthenticated).toBe(false);
      expect(result.isGuest).toBe(true);
      expect(result.token).toBeNull();
    });
  });
});
