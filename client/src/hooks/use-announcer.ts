import { useRef, useEffect, useCallback } from 'react';

/**
 * Priority level for screen reader announcements.
 * - 'polite': Waits for the user to finish their current activity before announcing
 * - 'assertive': Interrupts the user immediately to announce the message
 */
export type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Hook that provides screen reader announcement functionality via ARIA live regions.
 * 
 * This hook creates and manages a live region element that screen readers use to
 * announce dynamic content changes to users. The live region is automatically
 * created on mount and cleaned up on unmount.
 * 
 * @returns {Object} An object containing the announce function
 * @returns {Function} announce - Function to announce a message to screen readers
 * 
 * @example
 * ```tsx
 * function NotificationComponent() {
 *   const { announce } = useAnnouncer();
 *   
 *   const handleSave = () => {
 *     // ... save logic
 *     announce('Changes saved successfully', 'polite');
 *   };
 *   
 *   const handleError = () => {
 *     // ... error handling
 *     announce('Error: Unable to save changes', 'assertive');
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleSave}>Save</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * Requirements validated: 1.3, 9.5, 11.4
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // Create live region if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      
      // Screen reader only styles - visually hidden but accessible
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }
    
    // Cleanup: remove live region on unmount
    return () => {
      if (announcerRef.current && document.body.contains(announcerRef.current)) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);
  
  /**
   * Announces a message to screen readers via the live region.
   * 
   * @param message - The text message to announce
   * @param priority - The announcement priority ('polite' or 'assertive')
   *                   Defaults to 'polite' if not specified
   */
  const announce = useCallback((message: string, priority: AnnouncementPriority = 'polite') => {
    if (!announcerRef.current) {
      console.warn('useAnnouncer: Live region not initialized');
      return;
    }
    
    // Update the aria-live priority
    announcerRef.current.setAttribute('aria-live', priority);
    
    // Set the message content
    announcerRef.current.textContent = message;
    
    // Clear the message after a delay to allow for repeated announcements
    // of the same message
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
      }
    }, 1000);
  }, []);
  
  return { announce };
}
