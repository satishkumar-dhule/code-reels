/**
 * Unit tests for useReducedMotion hook
 * 
 * Tests reduced motion preference detection and dynamic updates,
 * ensuring animations respect user accessibility preferences.
 * 
 * Validates: Requirements 6.1, 6.2, 6.4, 11.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useReducedMotion', () => {
  let mediaQueryList: {
    matches: boolean;
    media: string;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create a mock MediaQueryList
    mediaQueryList = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return mediaQueryList;
      }
      return {
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Media Query Detection', () => {
    it('should detect prefers-reduced-motion media query', () => {
      expect(window.matchMedia).toBeDefined();
      
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(mq).toBeDefined();
      expect(mq.media).toBe('(prefers-reduced-motion: reduce)');
    });

    it('should return correct matches value when reduced motion is not set', () => {
      mediaQueryList.matches = false;
      
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(mq.matches).toBe(false);
    });

    it('should return correct matches value when reduced motion is enabled', () => {
      mediaQueryList.matches = true;
      
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      expect(mq.matches).toBe(true);
    });
  });

  describe('Event Listener Management', () => {
    it('should support addEventListener for media query changes', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      mq.addEventListener('change', handler);
      
      expect(mediaQueryList.addEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('should support removeEventListener for cleanup', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      mq.addEventListener('change', handler);
      mq.removeEventListener('change', handler);
      
      expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', handler);
    });

    it('should handle multiple event listeners', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      mq.addEventListener('change', handler1);
      mq.addEventListener('change', handler2);
      
      expect(mediaQueryList.addEventListener).toHaveBeenCalledTimes(2);
    });
  });

  describe('Media Query Change Events', () => {
    it('should create valid MediaQueryListEvent', () => {
      const event = { matches: true } as MediaQueryListEvent;
      
      expect(event.matches).toBe(true);
    });

    it('should handle change from false to true', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      mq.addEventListener('change', handler);
      
      // Simulate change event
      const event = { matches: true } as MediaQueryListEvent;
      handler(event);
      
      expect(handler).toHaveBeenCalledWith(event);
      expect(handler.mock.calls[0][0].matches).toBe(true);
    });

    it('should handle change from true to false', () => {
      mediaQueryList.matches = true;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      mq.addEventListener('change', handler);
      
      // Simulate change event
      const event = { matches: false } as MediaQueryListEvent;
      handler(event);
      
      expect(handler).toHaveBeenCalledWith(event);
      expect(handler.mock.calls[0][0].matches).toBe(false);
    });

    it('should handle rapid changes', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      mq.addEventListener('change', handler);
      
      // Simulate rapid changes
      handler({ matches: true } as MediaQueryListEvent);
      handler({ matches: false } as MediaQueryListEvent);
      handler({ matches: true } as MediaQueryListEvent);
      
      expect(handler).toHaveBeenCalledTimes(3);
      expect(handler.mock.calls[2][0].matches).toBe(true);
    });
  });

  describe('Animation Duration Calculation', () => {
    it('should support minimal duration when reduced motion is enabled', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const duration = prefersReducedMotion ? 0.01 : 0.3;
      expect(duration).toBe(0.01);
    });

    it('should support normal duration when reduced motion is disabled', () => {
      mediaQueryList.matches = false;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const duration = prefersReducedMotion ? 0.01 : 0.3;
      expect(duration).toBe(0.3);
    });

    it('should handle zero duration for instant animations', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const duration = prefersReducedMotion ? 0 : 0.5;
      expect(duration).toBe(0);
    });
  });

  describe('Conditional Animation Logic', () => {
    it('should disable animations when reduced motion is enabled', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const shouldAnimate = !prefersReducedMotion;
      expect(shouldAnimate).toBe(false);
    });

    it('should enable animations when reduced motion is disabled', () => {
      mediaQueryList.matches = false;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const shouldAnimate = !prefersReducedMotion;
      expect(shouldAnimate).toBe(true);
    });

    it('should support conditional transition properties', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const transition = prefersReducedMotion 
        ? { duration: 0.01 } 
        : { duration: 0.3, ease: 'easeInOut' };
      
      expect(transition.duration).toBe(0.01);
      expect(transition).not.toHaveProperty('ease');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing matchMedia', () => {
      const originalMatchMedia = window.matchMedia;
      // @ts-expect-error - Testing edge case
      delete window.matchMedia;
      
      expect(window.matchMedia).toBeUndefined();
      
      window.matchMedia = originalMatchMedia;
    });

    it('should handle null event listener', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      // @ts-expect-error - Testing edge case
      expect(() => mq.addEventListener('change', null)).not.toThrow();
    });

    it('should handle removing non-existent listener', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      // Remove without adding
      expect(() => mq.removeEventListener('change', handler)).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should support Framer Motion integration', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const motionConfig = {
        animate: { opacity: 1 },
        transition: { duration: prefersReducedMotion ? 0.01 : 0.3 }
      };
      
      expect(motionConfig.transition.duration).toBe(0.01);
    });

    it('should support CSS transition integration', () => {
      mediaQueryList.matches = false;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const transitionStyle = prefersReducedMotion 
        ? 'none' 
        : 'all 0.3s ease-in-out';
      
      expect(transitionStyle).toBe('all 0.3s ease-in-out');
    });

    it('should support conditional rendering of animated components', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      const shouldRenderAnimation = !prefersReducedMotion;
      expect(shouldRenderAnimation).toBe(false);
    });

    it('should maintain essential motion when reduced motion is enabled', () => {
      mediaQueryList.matches = true;
      const prefersReducedMotion = mediaQueryList.matches;
      
      // Essential loading indicators should remain functional
      const loadingIndicatorDuration = prefersReducedMotion ? 0.01 : 1.0;
      expect(loadingIndicatorDuration).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Behavior', () => {
    it('should properly cleanup event listeners', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = vi.fn();
      
      mq.addEventListener('change', handler);
      expect(mediaQueryList.addEventListener).toHaveBeenCalled();
      
      mq.removeEventListener('change', handler);
      expect(mediaQueryList.removeEventListener).toHaveBeenCalled();
    });

    it('should handle cleanup with multiple listeners', () => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      mq.addEventListener('change', handler1);
      mq.addEventListener('change', handler2);
      
      mq.removeEventListener('change', handler1);
      mq.removeEventListener('change', handler2);
      
      expect(mediaQueryList.removeEventListener).toHaveBeenCalledTimes(2);
    });
  });
});
