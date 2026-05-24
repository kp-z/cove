/**
 * Tests for useCurrentUser hook
 *
 * These tests ensure that the current user hook works correctly
 * before and after the unified datasource refactoring.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCurrentUser } from './useCurrentUser';
import { useAuthStore } from './authStore';

// Mock the authStore
vi.mock('./authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is authenticated', () => {
    it('should return user data from authStore', () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
        avatar: 'https://example.com/avatar.jpg',
        permissions: ['read', 'write'],
        createdAt: '2024-01-01T00:00:00Z',
      };

      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        token: 'mock-token',
      });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.userId).toBe('user-123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isGuest).toBe(false);
      expect(result.current.token).toBe('mock-token');
      expect(result.current.role).toBe('user');
      expect(result.current.permissions).toEqual(['read', 'write']);
    });

    it('should handle user without avatar', () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
        permissions: [],
        createdAt: '2024-01-01T00:00:00Z',
      };

      (useAuthStore as any).mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        token: 'mock-token',
      });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.user?.avatar).toBeUndefined();
    });
  });

  describe('when user is not authenticated', () => {
    it('should return null user and guest status', () => {
      (useAuthStore as any).mockReturnValue({
        user: null,
        isAuthenticated: false,
        token: null,
      });

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current.user).toBeNull();
      expect(result.current.userId).toBeUndefined();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isGuest).toBe(true);
      expect(result.current.token).toBeNull();
      expect(result.current.role).toBeUndefined();
      expect(result.current.permissions).toEqual([]);
    });
  });

  describe('getCurrentUser (synchronous)', () => {
    it('should return current user state synchronously', () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
        permissions: ['read'],
        createdAt: '2024-01-01T00:00:00Z',
      };

      (useAuthStore as any).getState = vi.fn().mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        token: 'mock-token',
      });

      const { getCurrentUser } = require('./useCurrentUser');
      const result = getCurrentUser();

      expect(result.user).toEqual(mockUser);
      expect(result.userId).toBe('user-123');
      expect(result.isAuthenticated).toBe(true);
    });
  });
});
