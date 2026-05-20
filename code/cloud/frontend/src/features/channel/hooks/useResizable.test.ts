import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useResizable } from './useResizable';

describe('useResizable', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('should initialize with default width', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    expect(result.current.width).toBe(300);
  });

  it('should load width from localStorage when storageKey is provided', () => {
    localStorage.setItem('test-width', '350');

    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        storageKey: 'test-width',
      })
    );

    expect(result.current.width).toBe(350);
  });

  it('should clamp saved width to min/max bounds', () => {
    localStorage.setItem('test-width', '600'); // Above maxWidth

    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        storageKey: 'test-width',
      })
    );

    expect(result.current.width).toBe(500); // Clamped to maxWidth
  });

  it('should clamp saved width to minimum', () => {
    localStorage.setItem('test-width', '100'); // Below minWidth

    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        storageKey: 'test-width',
      })
    );

    expect(result.current.width).toBe(200); // Clamped to minWidth
  });

  it('should save width to localStorage when changed', async () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
        storageKey: 'test-width',
      })
    );

    // Simulate drag start
    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onDragStart(mockEvent);
    });

    // Simulate mouse move
    const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 50 });
    act(() => {
      document.dispatchEvent(mouseMoveEvent);
    });

    await waitFor(() => {
      expect(localStorage.getItem('test-width')).toBe('350');
    });
  });

  it('should set cursor style on drag start', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onDragStart(mockEvent);
    });

    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');
  });

  it('should reset cursor style on mouse up', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onDragStart(mockEvent);
    });

    expect(document.body.style.cursor).toBe('col-resize');

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(document.body.style.cursor).toBe('');
    expect(document.body.style.userSelect).toBe('');
  });

  it('should update width on mouse move during drag', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onDragStart(mockEvent);
    });

    // Move mouse to the left (increase width)
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50 }));
    });

    expect(result.current.width).toBe(350); // 300 + (100 - 50)
  });

  it('should clamp width to maxWidth during drag', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onDragStart(mockEvent);
    });

    // Move mouse far to the left (would exceed maxWidth)
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: -300 }));
    });

    expect(result.current.width).toBe(500); // Clamped to maxWidth
  });

  it('should clamp width to minWidth during drag', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
      clientX: 100,
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onDragStart(mockEvent);
    });

    // Move mouse far to the right (would go below minWidth)
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 300 }));
    });

    expect(result.current.width).toBe(200); // Clamped to minWidth
  });

  it('should not update width on mouse move when not dragging', () => {
    const { result } = renderHook(() =>
      useResizable({
        defaultWidth: 300,
        minWidth: 200,
        maxWidth: 500,
      })
    );

    // Move mouse without starting drag
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 50 }));
    });

    expect(result.current.width).toBe(300); // Should remain unchanged
  });
});
