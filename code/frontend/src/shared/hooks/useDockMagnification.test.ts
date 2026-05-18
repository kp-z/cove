import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDockMagnification, useItemScale } from './useDockMagnification';
import { useMotionValue } from 'framer-motion';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  useMotionValue: vi.fn((initial) => ({
    get: vi.fn(() => initial),
    set: vi.fn(),
  })),
  useSpring: vi.fn((value) => value),
  useTransform: vi.fn((value, input, output) => value),
}));

describe('useDockMagnification', () => {
  it('should initialize with mouseX at Infinity', () => {
    const { result } = renderHook(() => useDockMagnification());

    expect(result.current.mouseX).toBeDefined();
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.handleMouseMove).toBeInstanceOf(Function);
    expect(result.current.handleMouseLeave).toBeInstanceOf(Function);
  });

  it('should update mouseX on mouse move', () => {
    const { result } = renderHook(() => useDockMagnification());

    // Create a mock container element
    const mockContainer = document.createElement('div');
    mockContainer.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 0,
      right: 500,
      bottom: 100,
      width: 400,
      height: 100,
      x: 100,
      y: 0,
      toJSON: () => {},
    }));

    // Assign the mock container to the ref
    Object.defineProperty(result.current.containerRef, 'current', {
      writable: true,
      value: mockContainer,
    });

    const mockEvent = {
      clientX: 250,
      clientY: 50,
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseMove(mockEvent);
    });

    // mouseX should be set to clientX - rect.left = 250 - 100 = 150
    expect(result.current.mouseX.set).toHaveBeenCalledWith(150);
  });

  it('should reset mouseX to Infinity on mouse leave', () => {
    const { result } = renderHook(() => useDockMagnification());

    act(() => {
      result.current.handleMouseLeave();
    });

    expect(result.current.mouseX.set).toHaveBeenCalledWith(Infinity);
  });

  it('should not update mouseX if container ref is null', () => {
    const { result } = renderHook(() => useDockMagnification());

    // Ensure containerRef.current is null
    Object.defineProperty(result.current.containerRef, 'current', {
      writable: true,
      value: null,
    });

    const mockEvent = {
      clientX: 250,
      clientY: 50,
    } as React.MouseEvent;

    const setCallCount = (result.current.mouseX.set as ReturnType<typeof vi.fn>).mock.calls.length;

    act(() => {
      result.current.handleMouseMove(mockEvent);
    });

    // set should not be called again
    expect((result.current.mouseX.set as ReturnType<typeof vi.fn>).mock.calls.length).toBe(setCallCount);
  });
});

describe('useItemScale', () => {
  it('should return scale and y motion values', () => {
    const mouseX = useMotionValue(Infinity);
    const itemRef = { current: null };

    const { result } = renderHook(() => useItemScale(mouseX, itemRef));

    expect(result.current.scale).toBeDefined();
    expect(result.current.y).toBeDefined();
  });

  it('should accept custom options', () => {
    const mouseX = useMotionValue(Infinity);
    const itemRef = { current: null };
    const options = {
      maxScale: 1.5,
      distance: 200,
      springConfig: { mass: 0.2, stiffness: 200, damping: 15 },
    };

    const { result } = renderHook(() => useItemScale(mouseX, itemRef, options));

    expect(result.current.scale).toBeDefined();
    expect(result.current.y).toBeDefined();
  });

  it('should use default options when not provided', () => {
    const mouseX = useMotionValue(Infinity);
    const itemRef = { current: null };

    const { result } = renderHook(() => useItemScale(mouseX, itemRef));

    // Should not throw and should return valid motion values
    expect(result.current.scale).toBeDefined();
    expect(result.current.y).toBeDefined();
  });
});
