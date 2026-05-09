import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useResponsive } from '../../../hooks/useResponsive';

describe('useResponsive', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('returns isMobile false for desktop width', () => {
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(false);
  });

  it('returns isMobile true for mobile width', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(true);
  });

  it('returns isMobile false at exactly 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(false);
  });

  it('returns isMobile true at 767px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767, writable: true });
    const { result } = renderHook(() => useResponsive());
    expect(result.current.isMobile).toBe(true);
  });
});
