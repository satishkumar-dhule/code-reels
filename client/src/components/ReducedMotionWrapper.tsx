/**
 * Reduced Motion Wrapper
 * 
 * A utility component that wraps Framer Motion's AnimatePresence
 * and automatically disables animations when the user prefers reduced motion.
 * 
 * Usage:
 * ```tsx
 * <ReducedMotionWrapper>
 *   {show && (
 *     <motion.div
 *       initial={{ opacity: 0 }}
 *       animate={{ opacity: 1 }}
 *       exit={{ opacity: 0 }}
 *     >
 *       Content
 *     </motion.div>
 *   )}
 * </ReducedMotionWrapper>
 * ```
 */

import { AnimatePresence, AnimatePresenceProps } from 'framer-motion';
import { useReducedMotion } from '../hooks/use-reduced-motion';

interface ReducedMotionWrapperProps extends Omit<AnimatePresenceProps, 'children'> {
  children: React.ReactNode;
}

export function ReducedMotionWrapper({ children, ...props }: ReducedMotionWrapperProps) {
  const prefersReducedMotion = useReducedMotion();
  
  // If user prefers reduced motion, render children without AnimatePresence
  if (prefersReducedMotion) {
    return <>{children}</>;
  }
  
  // Otherwise, use AnimatePresence normally
  return <AnimatePresence {...props}>{children}</AnimatePresence>;
}

/**
 * Hook to get motion-safe animation variants
 * 
 * Returns animation variants that respect the user's reduced motion preference.
 * When reduced motion is preferred, returns instant transitions.
 * 
 * Usage:
 * ```tsx
 * const variants = useMotionSafeVariants({
 *   initial: { opacity: 0, y: 20 },
 *   animate: { opacity: 1, y: 0 },
 *   exit: { opacity: 0, y: -20 }
 * });
 * 
 * <motion.div {...variants}>Content</motion.div>
 * ```
 */
export function useMotionSafeVariants<T extends Record<string, any>>(variants: T): T {
  const prefersReducedMotion = useReducedMotion();
  
  if (!prefersReducedMotion) {
    return variants;
  }
  
  // Return variants with instant transitions
  const reducedVariants = {} as T;
  for (const key in variants) {
    reducedVariants[key] = {
      ...variants[key],
      transition: { duration: 0.01 }
    };
  }
  
  return reducedVariants;
}

/**
 * Hook to get motion-safe transition config
 * 
 * Returns a transition configuration that respects the user's reduced motion preference.
 * 
 * Usage:
 * ```tsx
 * const transition = useMotionSafeTransition({ duration: 0.3, ease: 'easeOut' });
 * 
 * <motion.div transition={transition}>Content</motion.div>
 * ```
 */
export function useMotionSafeTransition(transition?: any) {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return { duration: 0.01 };
  }
  
  return transition;
}
