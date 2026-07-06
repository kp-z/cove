import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      userId: null,
      token: null,
      isAuthenticated: false,
      rememberMe: true,
      currentRealmId: null,
    });
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should have initial state', () => {
    const state = useAuthStore.getState();
    expect(state.userId).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.currentRealmId).toBeNull();
  });

  it('should login user with userId', () => {
    const { login } = useAuthStore.getState();

    const mockUserId = 'user-123';
    const mockToken = 'mock-token-123';

    login(mockUserId, mockToken);

    const state = useAuthStore.getState();
    expect(state.userId).toBe(mockUserId);
    expect(state.token).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should store token and userId in localStorage on login', () => {
    const { login } = useAuthStore.getState();

    const mockUserId = 'user-123';
    const mockToken = 'mock-token-123';

    login(mockUserId, mockToken, true);

    expect(localStorage.getItem('auth_token')).toBe(mockToken);
    expect(localStorage.getItem('user_id')).toBe(mockUserId);
  });

  it('should store token and userId in sessionStorage when rememberMe is false', () => {
    const { login } = useAuthStore.getState();

    const mockUserId = 'user-123';
    const mockToken = 'mock-token-123';

    login(mockUserId, mockToken, false);

    expect(sessionStorage.getItem('auth_token')).toBe(mockToken);
    expect(sessionStorage.getItem('user_id')).toBe(mockUserId);
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
  });

  it('should login user with realmId', () => {
    const { login } = useAuthStore.getState();

    const mockUserId = 'user-123';
    const mockToken = 'mock-token-123';
    const mockRealmId = 'realm-456';

    login(mockUserId, mockToken, true, mockRealmId);

    const state = useAuthStore.getState();
    expect(state.userId).toBe(mockUserId);
    expect(state.token).toBe(mockToken);
    expect(state.currentRealmId).toBe(mockRealmId);
    expect(localStorage.getItem('current_realm_id')).toBe(mockRealmId);
  });

  it('should logout user', () => {
    const { login, logout } = useAuthStore.getState();

    // First login
    login('user-123', 'mock-token');

    // Then logout
    logout();

    const state = useAuthStore.getState();
    expect(state.userId).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.currentRealmId).toBeNull();
  });

  it('should remove token and userId from localStorage on logout', () => {
    const { login, logout } = useAuthStore.getState();

    // First login
    login('user-123', 'mock-token', true);

    expect(localStorage.getItem('auth_token')).toBe('mock-token');
    expect(localStorage.getItem('user_id')).toBe('user-123');

    // Then logout
    logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('user_id')).toBeNull();
  });

  it('should remove token and userId from sessionStorage on logout', () => {
    const { login, logout } = useAuthStore.getState();

    // First login with rememberMe = false
    login('user-123', 'mock-token', false);

    expect(sessionStorage.getItem('auth_token')).toBe('mock-token');
    expect(sessionStorage.getItem('user_id')).toBe('user-123');

    // Then logout
    logout();

    expect(sessionStorage.getItem('auth_token')).toBeNull();
    expect(sessionStorage.getItem('user_id')).toBeNull();
  });

  it('should set current realm ID', () => {
    const { login, setCurrentRealmId } = useAuthStore.getState();

    // First login
    login('user-123', 'mock-token');

    // Set realm
    setCurrentRealmId('realm-456');

    const state = useAuthStore.getState();
    expect(state.currentRealmId).toBe('realm-456');
    expect(localStorage.getItem('current_realm_id')).toBe('realm-456');
  });

  it('should handle multiple login/logout cycles', () => {
    const { login, logout } = useAuthStore.getState();

    // First login
    login('user-1', 'token-1');
    expect(useAuthStore.getState().userId).toBe('user-1');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Logout
    logout();
    expect(useAuthStore.getState().userId).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    // Second login
    login('user-2', 'token-2');
    expect(useAuthStore.getState().userId).toBe('user-2');
    expect(useAuthStore.getState().token).toBe('token-2');

    // Final logout
    logout();
    expect(useAuthStore.getState().userId).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('should maintain rememberMe preference', () => {
    const { login } = useAuthStore.getState();

    // Login with rememberMe = true
    login('user-123', 'token-123', true);
    expect(useAuthStore.getState().rememberMe).toBe(true);

    // Login with rememberMe = false
    login('user-456', 'token-456', false);
    expect(useAuthStore.getState().rememberMe).toBe(false);
  });
});

// 覆盖"记住我"登录状态跨刷新/重启持久化的场景（曾经的 bug：即使勾选了
// 记住我，刷新页面/重启应用后仍会被强制退出登录）。
// 这里通过 vi.resetModules() 重新加载 authStore 模块，模拟应用重新启动时
// store 首次被创建的过程。
describe('authStore - session restore on app restart', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should restore authenticated state from localStorage when remembered', async () => {
    // 模拟上一次勾选了"记住我"登录后，浏览器完全关闭再重新打开
    localStorage.setItem('auth_token', 'persisted-token');
    localStorage.setItem('user_id', 'user-persisted');

    const { useAuthStore: restartedStore } = await import('./authStore');
    const state = restartedStore.getState();

    expect(state.token).toBe('persisted-token');
    expect(state.userId).toBe('user-persisted');
    expect(state.isAuthenticated).toBe(true);
  });

  it('should not resurrect a stale authenticated state from an old full-state persist snapshot', async () => {
    // 模拟历史遗留数据：zustand persist 曾经把完整状态（含 token/isAuthenticated）
    // 写入 localStorage 的 'auth-storage' 键，即使当时勾选的是"不记住我"。
    // 修复后，'auth-storage' 只应影响 rememberMe 偏好，不能让这种历史脏数据
    // 把用户"复活"成已登录状态。
    localStorage.setItem(
      'auth-storage',
      JSON.stringify({
        state: {
          userId: 'stale-user',
          token: 'stale-token',
          isAuthenticated: true,
          rememberMe: false,
          currentRealmId: null,
        },
        version: 0,
      })
    );

    const { useAuthStore: restartedStore } = await import('./authStore');
    const state = restartedStore.getState();

    expect(state.token).toBeNull();
    expect(state.userId).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should stay logged out after browser restart when not remembered (sessionStorage cleared)', async () => {
    // 未勾选"记住我"时凭证写入 sessionStorage；浏览器完全关闭重开后
    // sessionStorage 会被清空，此时不应该被视为已登录。
    // （此处不写入 sessionStorage，模拟浏览器重启后的清空效果）

    const { useAuthStore: restartedStore } = await import('./authStore');
    const state = restartedStore.getState();

    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
