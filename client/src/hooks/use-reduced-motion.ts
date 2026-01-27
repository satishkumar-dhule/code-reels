import { useState, useEffect } from 'react';

/**
 * Hook that detects and tracks the user's reduced motion preference.
 * 
 * This hook monitors the `prefers-reduced-motion` media query and returns
 * a boolean indicating whether the user has requested reduced motion.
 * 
 * @returns {boolean} true if the user prefers reduced motion, false otherwise
 * 
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <motion.div
 *       animate={{ opacity: 1 }}
 *       transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 * 
 * Requirements validated: 6.1, 6.2, 6.4, 11.3
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    // Create media query for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);
    
    // Handle changes to the media query
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    
    // Add event listener for changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup: remove event listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return prefersReducedMotion;
}
