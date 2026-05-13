import { useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useRef, useCallback } from 'react';

interface UseDockMagnificationOptions {
  maxScale?: number;
  distance?: number;
  springConfig?: { mass?: number; stiffness?: number; damping?: number };
}

interface UseDockMagnificationReturn {
  mouseX: MotionValue<number>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
}

export function useDockMagnification(
  options: UseDockMagnificationOptions = {}
): UseDockMagnificationReturn {
  const mouseX = useMotionValue(Infinity);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
      }
    },
    [mouseX]
  );

  const handleMouseLeave = useCallback(() => {
    mouseX.set(Infinity);
  }, [mouseX]);

  return { mouseX, containerRef, handleMouseMove, handleMouseLeave };
}

export function useItemScale(
  mouseX: MotionValue<number>,
  itemRef: React.RefObject<HTMLElement | null>,
  options: UseDockMagnificationOptions = {}
): { scale: MotionValue<number>; y: MotionValue<number> } {
  const { maxScale = 1.12, distance = 140, springConfig = { mass: 0.1, stiffness: 150, damping: 12 } } = options;

  const distanceFromMouse = useTransform(mouseX, (val) => {
    const bounds = itemRef.current?.getBoundingClientRect();
    const containerBounds = itemRef.current?.parentElement?.getBoundingClientRect();
    if (!bounds || !containerBounds) return Infinity;
    const itemCenterX = bounds.left - containerBounds.left + bounds.width / 2;
    return val - itemCenterX;
  });

  const scaleTransform = useTransform(
    distanceFromMouse,
    [-distance, 0, distance],
    [1, maxScale, 1]
  );

  const yTransform = useTransform(
    distanceFromMouse,
    [-distance, 0, distance],
    [0, -2, 0]
  );

  const scale = useSpring(scaleTransform, springConfig);
  const y = useSpring(yTransform, springConfig);

  return { scale, y };
}
