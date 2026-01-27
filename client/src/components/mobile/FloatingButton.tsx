/**
 * Floating Action Button (FAB) - Mobile-First
 * Pattern: Material Design, Google Apps
 */

import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Haptics } from '../../lib/haptics';
import { trackFABTap, trackHapticFeedback } from '../../lib/analytics';
import { rafThrottle } from '../../lib/performance';

interface FloatingButtonProps {
  icon: ReactNode;
  label?: string;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  hideOnScroll?: boolean;
  className?: string;
}

export function FloatingButton({
  icon,
  label,
  onClick,
  position = 'bottom-right',
  hideOnScroll = true,
  className
}: FloatingButtonProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (!hideOnScroll) return;

    // Use RAF throttle for smooth 60fps performance
    const handleScroll = rafThrottle(() => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, hideOnScroll]);

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 md:bottom-6 md:right-6',
    'bottom-left': 'bottom-20 left-4 md:bottom-6 md:left-6',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2 md:bottom-6'
  };

  const handleClick = () => {
    Haptics.light(); // Haptic feedback on tap
    trackHapticFeedback('light', 'fab_tap');
    
    const page = window.location.pathname;
    const action = label || 'fab_action';
    const scrollPosition = window.scrollY;
    trackFABTap(page, action, scrollPosition);
    
    onClick();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleClick}
          aria-label={label || 'Floating action button'}
          className={cn(
            "fixed z-40 flex items-center gap-2",
            "bg-gradient-to-r from-primary to-cyan-500",
            "text-primary-foreground font-bold",
            "rounded-full shadow-lg shadow-primary/50",
            "transition-all duration-200",
            "hover:shadow-xl hover:shadow-primary/60",
            "active:scale-95",
            label ? "px-6 py-4" : "w-14 h-14 md:w-16 md:h-16 justify-center",
            positionClasses[position],
            className
          )}
        >
          <span className={cn("flex items-center justify-center", label ? "w-6 h-6" : "w-7 h-7")}>
            {icon}
          </span>
          {label && (
            <span className="text-sm md:text-base whitespace-nowrap">
              {label}
            </span>
          )}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
