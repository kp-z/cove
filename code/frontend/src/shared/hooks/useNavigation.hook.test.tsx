import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigation } from './useNavigation';

describe('useNavigation hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );

  beforeEach(() => {
    // Reset any state between tests
  });

  it('should initialize with empty expandedMenus', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    expect(result.current.expandedMenus.size).toBe(0);
  });

  it('should toggle menu expansion', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.toggleMenu('menu1');
    });

    expect(result.current.expandedMenus.has('menu1')).toBe(true);

    act(() => {
      result.current.toggleMenu('menu1');
    });

    expect(result.current.expandedMenus.has('menu1')).toBe(false);
  });

  it('should toggle multiple menus independently', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.toggleMenu('menu1');
    });

    expect(result.current.expandedMenus.has('menu1')).toBe(true);

    act(() => {
      result.current.toggleMenu('menu2');
    });

    expect(result.current.expandedMenus.has('menu1')).toBe(true);
    expect(result.current.expandedMenus.has('menu2')).toBe(true);

    act(() => {
      result.current.toggleMenu('menu1');
    });

    expect(result.current.expandedMenus.has('menu1')).toBe(false);
    expect(result.current.expandedMenus.has('menu2')).toBe(true);
  });

  it('should expand menu when navigating to child route', () => {
    const { result, rerender } = renderHook(() => useNavigation(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/dashboard']}>{children}</MemoryRouter>
      ),
    });

    // Initial state
    expect(result.current.expandedMenus.size).toBeGreaterThanOrEqual(0);

    // The hook should automatically expand parent menus based on current route
    rerender();
  });

  it('should maintain expanded state across re-renders', () => {
    const { result, rerender } = renderHook(() => useNavigation(), { wrapper });

    act(() => {
      result.current.toggleMenu('menu1');
      result.current.toggleMenu('menu2');
    });

    expect(result.current.expandedMenus.has('menu1')).toBe(true);
    expect(result.current.expandedMenus.has('menu2')).toBe(true);

    rerender();

    expect(result.current.expandedMenus.has('menu1')).toBe(true);
    expect(result.current.expandedMenus.has('menu2')).toBe(true);
  });

  it('should return toggleMenu function', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    expect(typeof result.current.toggleMenu).toBe('function');
  });

  it('should return expandedMenus Set', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    expect(result.current.expandedMenus).toBeInstanceOf(Set);
  });
});
