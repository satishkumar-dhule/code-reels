/**
 * Pull to Refresh Component - Mobile-First
 * Pattern: Instagram Feed, Twitter Timeline
 * 
 * Keyboard Accessibility:
 * - Includes a visible refresh button for keyboard users
 * - Button appears at the top of the content area
 */

import { ReactNode, useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Haptics } from '../../lib/haptics';
import { trackPullToRefresh, trackHapticFeedback } from '../../lib/analytics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  disabled?: boolean;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 80,
  disabled = false 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  
  // Transform pull distance to rotation for spinner
  const rotation = useTransform(pullDistance, [0, threshold], [0, 360]);
  const opacity = useTransform(pullDistance, [0, threshold], [0, 1]);
  const scale = useTransform(pullDistance, [0, threshold], [0.5, 1]);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only start if at top of scroll
    if (window.scrollY === 0 || containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
      setHasTriggered(false);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    // Apply resistance curve (feels more natural)
    const resistedDistance = Math.pow(distance, 0.7);
    pullDistance.set(Math.min(resistedDistance, threshold * 1.5));
    
    // Trigger haptic feedback when threshold is reached
    if (resistedDistance >= threshold && !hasTriggered) {
      Haptics.impact();
      trackHapticFeedback('impact', 'pull_to_refresh_threshold');
      setHasTriggered(true);
    }
    
    // Prevent default scroll if pulling
    if (distance > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || disabled) return;
    
    setIsPulling(false);
    const distance = pullDistance.get();
    const startTime = Date.now();
    
    if (distance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      // Animate to threshold position
      animate(pullDistance, threshold, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
      
      try {
        await onRefresh();
        const duration = Date.now() - startTime;
        Haptics.success(); // Success haptic
        trackHapticFeedback('success', 'pull_to_refresh');
        
        // Track successful pull-to-refresh
        const page = window.location.pathname;
        trackPullToRefresh(page, duration, true);
      } catch (error) {
        const duration = Date.now() - startTime;
        Haptics.error(); // Error haptic
        trackHapticFeedback('error', 'pull_to_refresh');
        
        // Track failed pull-to-refresh
        const page = window.location.pathname;
        trackPullToRefresh(page, duration, false);
      } finally {
        // Animate back to 0
        animate(pullDistance, 0, {
          type: 'spring',
          stiffness: 300,
          damping: 30
        }).then(() => {
          setIsRefreshing(false);
        });
      }
    } else {
      // Snap back
      animate(pullDistance, 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30
      });
    }
    
    startY.current = 0;
    setHasTriggered(false);
  };

  const handleRefreshClick = async () => {
    if (disabled || isRefreshing) return;
    
    setIsRefreshing(true);
    const startTime = Date.now();
    
    try {
      await onRefresh();
      const duration = Date.now() - startTime;
      Haptics.success();
      trackHapticFeedback('success', 'keyboard_refresh');
      
      const page = window.location.pathname;
      trackPullToRefresh(page, duration, true);
    } catch (error) {
      const duration = Date.now() - startTime;
      Haptics.error();
      trackHapticFeedback('error', 'keyboard_refresh');
      
      const page = window.location.pathname;
      trackPullToRefresh(page, duration, false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, isRefreshing, disabled, hasTriggered]);

  return (
    <div 
      ref={containerRef} 
      className="relative h-full overflow-auto"
      data-component="PullToRefresh"
    >
      {/* Keyboard-accessible refresh button */}
      <div className="sticky top-0 z-20 flex justify-center py-2 bg-background/80 backdrop-blur-sm border-b border-border">
        <button
          onClick={handleRefreshClick}
          disabled={disabled || isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-colors"
          aria-label="Refresh content"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      
      {/* Pull indicator */}
      <motion.div
        style={{ 
          y: pullDistance,
          opacity,
          scale
        }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-20 -mt-20 z-10"
      >
        <motion.div
          style={{ rotate: rotation }}
          className="w-8 h-8 flex items-center justify-center"
        >
          <RefreshCw 
            className={`w-6 h-6 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </motion.div>
      </motion.div>
      
      {/* Content */}
      <motion.div style={{ y: pullDistance }}>
        {children}
      </motion.div>
    </div>
  );
}
