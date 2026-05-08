import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSidebar } from '../../../hooks/useSidebar';

// jsdom localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useSidebar', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('defaults to open when no saved state', () => {
    const { result } = renderHook(() => useSidebar());
    expect(result.current.isOpen).toBe(true);
  });

  it('reads saved state from localStorage', () => {
    localStorageMock.setItem('sidebar-open', 'false');
    const { result } = renderHook(() => useSidebar());
    expect(result.current.isOpen).toBe(false);
  });

  it('toggle switches state', () => {
    const { result } = renderHook(() => useSidebar());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
  });

  it('persists state to localStorage on change', () => {
    const { result } = renderHook(() => useSidebar());

    act(() => {
      result.current.toggle();
    });
    expect(localStorageMock.getItem('sidebar-open')).toBe('false');

    act(() => {
      result.current.toggle();
    });
    expect(localStorageMock.getItem('sidebar-open')).toBe('true');
  });
});
