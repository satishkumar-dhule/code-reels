/**
 * Swipeable Card Component - Mobile-First
 * Pattern: WhatsApp, Gmail, Tinder
 * 
 * Keyboard Accessibility:
 * - Arrow Left: Trigger right action
 * - Arrow Right: Trigger left action
 * - Tab: Focus on action buttons
 */

import { ReactNode, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';
import { trackSwipeCard, trackHapticFeedback } from '../../lib/analytics';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  onAction: () => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  threshold = 100,
  className,
  disabled = false
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Transform x position to background opacity
  const leftOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  
  // Keyboard navigation for accessibility
  useKeyboardNavigation([
    {
      key: 'ArrowRight',
      handler: () => {
        if (leftAction && !disabled) {
          leftAction.onAction();
        }
      },
      description: leftAction ? `${leftAction.label}` : 'No action'
    },
    {
      key: 'ArrowLeft',
      handler: () => {
        if (rightAction && !disabled) {
          rightAction.onAction();
        }
      },
      description: rightAction ? `${rightAction.label}` : 'No action'
    }
  ]);
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const page = window.location.pathname;
    
    // Swipe right (left action)
    if (offset > threshold || velocity > 500) {
      if (leftAction) {
        Haptics.medium(); // Haptic feedback on action
        trackHapticFeedback('medium', 'swipe_card_right');
        trackSwipeCard(page, 'right', leftAction.label, Math.abs(velocity));
        leftAction.onAction();
      }
    }
    // Swipe left (right action)
    else if (offset < -threshold || velocity < -500) {
      if (rightAction) {
        Haptics.medium(); // Haptic feedback on action
        trackHapticFeedback('medium', 'swipe_card_left');
        trackSwipeCard(page, 'left', rightAction.label, Math.abs(velocity));
        rightAction.onAction();
      }
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden" 
      role="group" 
      aria-label="Swipeable card"
      data-component="SwipeableCard"
      tabIndex={0}
    >
      {/* Keyboard hint for screen readers */}
      <div className="sr-only">
        {leftAction && `Press right arrow to ${leftAction.label}. `}
        {rightAction && `Press left arrow to ${rightAction.label}.`}
      </div>
      {/* Left action background */}
      {leftAction && (
        <motion.div
          style={{ opacity: leftOpacity }}
          className={cn(
            "absolute inset-0 flex items-center justify-start px-6",
            leftAction.color
          )}
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            {leftAction.icon}
            <span className="font-semibold text-white">{leftAction.label}</span>
          </div>
        </motion.div>
      )}
      
      {/* Right action background */}
      {rightAction && (
        <motion.div
          style={{ opacity: rightOpacity }}
          className={cn(
            "absolute inset-0 flex items-center justify-end px-6",
            rightAction.color
          )}
          aria-hidden="true"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </motion.div>
      )}
      
      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={cn("relative bg-white dark:bg-gray-900", className)}
        role="article"
      >
        {children}
      </motion.div>
    </div>
  );
}
