/**
 * Haptic Feedback Utilities
 * Provides vibration feedback for mobile gestures
 */

/**
 * Vibration patterns (in milliseconds)
 */
export const HapticPattern = {
  // Light tap for button presses
  LIGHT: 10,
  
  // Medium tap for swipe actions
  MEDIUM: 20,
  
  // Success pattern (short-pause-short)
  SUCCESS: [10, 50, 10] as number[],
  
  // Error pattern (short-pause-short-pause-short)
  ERROR: [10, 100, 10, 100, 10] as number[],
  
  // Selection pattern
  SELECTION: 15,
  
  // Impact pattern for pull-to-refresh trigger
  IMPACT: 30,
} as const;

/**
 * Trigger haptic feedback
 * @param pattern - Vibration pattern (number or array of numbers)
 */
export function haptic(pattern: number | number[]): void {
  // Check if vibration API is supported
  if (!('vibrate' in navigator)) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', error);
  }
}

/**
 * Check if haptic feedback is available
 */
export function isHapticAvailable(): boolean {
  return 'vibrate' in navigator;
}

/**
 * Convenience functions for common patterns
 */
export const Haptics = {
  /**
   * Light tap for button presses
   */
  light: () => haptic(HapticPattern.LIGHT),
  
  /**
   * Medium tap for swipe actions
   */
  medium: () => haptic(HapticPattern.MEDIUM),
  
  /**
   * Success pattern
   */
  success: () => haptic(HapticPattern.SUCCESS),
  
  /**
   * Error pattern
   */
  error: () => haptic(HapticPattern.ERROR),
  
  /**
   * Selection feedback
   */
  selection: () => haptic(HapticPattern.SELECTION),
  
  /**
   * Impact feedback for pull-to-refresh
   */
  impact: () => haptic(HapticPattern.IMPACT),
  
  /**
   * Check if available
   */
  isAvailable: isHapticAvailable,
} as const;
