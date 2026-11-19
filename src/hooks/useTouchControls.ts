import { useEffect, useRef, useCallback } from 'react';
import { Direction } from './useSnakeGame';

export function useTouchControls(
  onDirectionChange: (dir: Direction) => void,
  onTap: () => void,
  enabled: boolean
) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    const minSwipeDistance = 30;

    if (Math.max(absDx, absDy) < minSwipeDistance) {
      onTap();
      touchStartRef.current = null;
      return;
    }

    if (absDx > absDy) {
      onDirectionChange(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      onDirectionChange(dy > 0 ? 'DOWN' : 'UP');
    }

    touchStartRef.current = null;
  }, [enabled, onDirectionChange, onTap]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return containerRef;
}
