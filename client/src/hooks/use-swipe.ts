/**
 * Custom hook for swipe gesture detection
 * Reusable across mobile components
 */

import { useRef, useCallback } from 'react';
import { LIMITS } from '../lib/constants';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  minDistance?: number;
  preventScroll?: boolean;
}

/**
 * Hook for detecting swipe gestures on touch devices
 * 
 * @param callbacks - Object containing callback functions for each swipe direction
 * @param options - Configuration options
 * @returns Touch event handlers to spread on the target element
 * 
 * @example
 * ```tsx
 * const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
 *   onSwipeLeft: () => nextSlide(),
 *   onSwipeRight: () => prevSlide(),
 * });
 * 
 * return (
 *   <div
 *     onTouchStart={onTouchStart}
 *     onTouchMove={onTouchMove}
 *     onTouchEnd={onTouchEnd}
 *   >
 *     Content
 *   </div>
 * );
 * ```
 */
export function useSwipe(
  callbacks: SwipeCallbacks,
  options: SwipeOptions = {}
): SwipeHandlers {
  const {
    minDistance = LIMITS.MIN_SWIPE_DISTANCE,
    preventScroll = false,
  } = options;

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;

    // Prevent scroll if horizontal swipe is detected
    if (preventScroll && touchStartX.current !== null && touchEndX.current !== null) {
      const distanceX = Math.abs(touchStartX.current - touchEndX.current);
      const distanceY = Math.abs((touchStartY.current ?? 0) - (touchEndY.current ?? 0));
      
      if (distanceX > distanceY) {
        e.preventDefault();
      }
    }
  }, [preventScroll]);

  const onTouchEnd = useCallback(() => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      touchEndX.current === null ||
      touchEndY.current === null
    ) {
      return;
    }

    const distanceX = touchStartX.current - touchEndX.current;
    const distanceY = touchStartY.current - touchEndY.current;
    const absDistanceX = Math.abs(distanceX);
    const absDistanceY = Math.abs(distanceY);

    // Determine if swipe is primarily horizontal or vertical
    const isHorizontal = absDistanceX > absDistanceY;

    if (isHorizontal && absDistanceX > minDistance) {
      if (distanceX > 0) {
        callbacks.onSwipeLeft?.();
      } else {
        callbacks.onSwipeRight?.();
      }
    } else if (!isHorizontal && absDistanceY > minDistance) {
      if (distanceY > 0) {
        callbacks.onSwipeUp?.();
      } else {
        callbacks.onSwipeDown?.();
      }
    }

    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  }, [callbacks, minDistance]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/**
 * Simplified hook for horizontal swipe only
 */
export function useHorizontalSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  minDistance?: number
): SwipeHandlers {
  return useSwipe(
    { onSwipeLeft, onSwipeRight },
    { minDistance }
  );
}

/**
 * Simplified hook for vertical swipe only
 */
export function useVerticalSwipe(
  onSwipeUp: () => void,
  onSwipeDown: () => void,
  minDistance?: number
): SwipeHandlers {
  return useSwipe(
    { onSwipeUp, onSwipeDown },
    { minDistance }
  );
}

export default useSwipe;
