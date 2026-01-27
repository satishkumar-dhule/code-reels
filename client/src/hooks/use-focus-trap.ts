import { useEffect, useRef, RefObject } from 'react';

/**
 * Options for configuring the focus trap behavior
 */
export interface UseFocusTrapOptions {
  /** Whether the focus trap is enabled */
  enabled: boolean;
  /** Optional ref to the element that should receive initial focus */
  initialFocus?: RefObject<HTMLElement>;
  /** Whether to return focus to the previously focused element when trap is disabled */
  returnFocus?: boolean;
}

/**
 * Hook that manages focus trapping within a container element.
 * 
 * This hook is essential for accessible modals and dialogs, ensuring that:
 * - Focus stays within the container when Tab/Shift+Tab is pressed
 * - Focus moves to the first focusable element when the trap is activated
 * - Focus returns to the previously focused element when the trap is deactivated
 * 
 * @param containerRef - Ref to the container element that should trap focus
 * @param options - Configuration options for the focus trap
 * 
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(modalRef, { enabled: isOpen, returnFocus: true });
 *   
 *   return (
 *     <div ref={modalRef} role="dialog" aria-modal="true">
 *       <button onClick={onClose}>Close</button>
 *       <input type="text" />
 *     </div>
 *   );
 * }
 * ```
 * 
 * Validates: Requirements 2.2, 2.3, 5.2, 5.3, 11.1
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  options: UseFocusTrapOptions = { enabled: true, returnFocus: true }
): void {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    // Early return if trap is disabled or container doesn't exist
    if (!options.enabled || !containerRef.current) {
      return;
    }
    
    // Store the element that had focus before trap activated
    previousActiveElement.current = document.activeElement as HTMLElement;
    
    /**
     * Get all focusable elements within the container.
     * Includes standard focusable elements and elements with non-negative tabindex.
     * Excludes disabled elements and elements with aria-hidden.
     */
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      if (!containerRef.current) return [];
      
      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(selector)
      ).filter(el => {
        // Exclude elements that are hidden from assistive technologies
        if (el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        
        // Exclude elements that are not visible
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        
        return true;
      });
    };
    
    // Focus initial element or first focusable element
    const focusableElements = getFocusableElements();
    
    if (focusableElements.length === 0) {
      console.warn('useFocusTrap: No focusable elements found in container');
      return;
    }
    
    if (options.initialFocus?.current) {
      options.initialFocus.current.focus();
    } else {
      focusableElements[0].focus();
    }
    
    /**
     * Handle Tab key to trap focus within the container.
     * When Tab is pressed on the last element, focus cycles to the first.
     * When Shift+Tab is pressed on the first element, focus cycles to the last.
     */
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      // Shift+Tab on first element: cycle to last
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } 
      // Tab on last element: cycle to first
      else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    // Add event listener for Tab key
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Return focus to previous element if option is enabled
      if (options.returnFocus && previousActiveElement.current) {
        // Use setTimeout to ensure the element is focusable
        setTimeout(() => {
          if (previousActiveElement.current) {
            previousActiveElement.current.focus();
          }
        }, 0);
      }
    };
  }, [options.enabled, containerRef, options.initialFocus, options.returnFocus]);
}
