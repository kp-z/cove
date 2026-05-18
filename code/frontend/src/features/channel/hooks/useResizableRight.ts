import { useState, useCallback, useEffect, useRef } from 'react';

interface UseResizableRightOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

/**
 * Hook for resizing panels with drag handle on the RIGHT edge
 * (opposite direction from useResizable which is for LEFT edge handles)
 */
export function useResizableRight({ defaultWidth, minWidth, maxWidth, storageKey }: UseResizableRightOptions) {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) return Math.min(Math.max(Number(saved), minWidth), maxWidth);
    }
    return defaultWidth;
  });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, String(width));
    }
  }, [width, storageKey]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      // For RIGHT edge handle: moving right increases width, moving left decreases width
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(Math.max(startWidth.current + delta, minWidth), maxWidth);
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [minWidth, maxWidth]);

  return { width, onDragStart };
}
