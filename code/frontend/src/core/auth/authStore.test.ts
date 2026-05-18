import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should login user', () => {
    const { login } = useAuthStore.getState();

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };
    const mockToken = 'mock-token-123';

    login(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should store token in localStorage on login', () => {
    const { login } = useAuthStore.getState();

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };
    const mockToken = 'mock-token-123';

    login(mockUser, mockToken);

    expect(localStorage.getItem('auth_token')).toBe(mockToken);
  });

  it('should login user with avatar', () => {
    const { login } = useAuthStore.getState();

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
    };
    const mockToken = 'mock-token-123';

    login(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.user?.avatar).toBe('https://example.com/avatar.jpg');
  });

  it('should logout user', () => {
    const { login, logout } = useAuthStore.getState();

    // First login
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };
    login(mockUser, 'mock-token');

    // Then logout
    logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should remove token from localStorage on logout', () => {
    const { login, logout } = useAuthStore.getState();

    // First login
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };
    login(mockUser, 'mock-token');

    expect(localStorage.getItem('auth_token')).toBe('mock-token');

    // Then logout
    logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('should update user information', () => {
    const { login, updateUser } = useAuthStore.getState();

    // First login
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };
    login(mockUser, 'mock-token');

    // Update user
    updateUser({
      username: 'newusername',
      avatar: 'https://example.com/new-avatar.jpg',
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual({
      id: 'user-123',
      username: 'newusername',
      email: 'test@example.com',
      avatar: 'https://example.com/new-avatar.jpg',
    });
  });

  it('should partially update user information', () => {
    const { login, updateUser } = useAuthStore.getState();

    // First login
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
    };
    login(mockUser, 'mock-token');

    // Update only username
    updateUser({ username: 'newusername' });

    const state = useAuthStore.getState();
    expect(state.user).toEqual({
      id: 'user-123',
      username: 'newusername',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
    });
  });

  it('should not update user when user is null', () => {
    const { updateUser } = useAuthStore.getState();

    // Try to update without logging in
    updateUser({ username: 'newusername' });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
  });

  it('should maintain authentication state after update', () => {
    const { login, updateUser } = useAuthStore.getState();

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };
    login(mockUser, 'mock-token');

    updateUser({ username: 'newusername' });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('mock-token');
  });

  it('should handle multiple login/logout cycles', () => {
    const { login, logout } = useAuthStore.getState();

    const user1 = {
      id: 'user-1',
      username: 'user1',
      email: 'user1@example.com',
    };

    const user2 = {
      id: 'user-2',
      username: 'user2',
      email: 'user2@example.com',
    };

    // First login
    login(user1, 'token-1');
    expect(useAuthStore.getState().user).toEqual(user1);

    // Logout
    logout();
    expect(useAuthStore.getState().user).toBeNull();

    // Second login
    login(user2, 'token-2');
    expect(useAuthStore.getState().user).toEqual(user2);
    expect(useAuthStore.getState().token).toBe('token-2');

    // Final logout
    logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
