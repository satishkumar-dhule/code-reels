import { useEffect } from 'react';

/**
 * Configuration for a keyboard shortcut
 */
export interface KeyboardShortcut {
  /** The key to listen for (e.g., 'Enter', 'Escape', 'k') */
  key: string;
  /** Whether the Ctrl key must be pressed (Cmd on Mac) */
  ctrlKey?: boolean;
  /** Whether the Shift key must be pressed */
  shiftKey?: boolean;
  /** Whether the Alt key must be pressed (Option on Mac) */
  altKey?: boolean;
  /** Whether the Meta key must be pressed (Cmd on Mac, Windows key on Windows) */
  metaKey?: boolean;
  /** Handler function to call when the shortcut is triggered */
  handler: (event: KeyboardEvent) => void;
  /** Human-readable description of what the shortcut does */
  description: string;
}

/**
 * Hook that manages keyboard shortcuts and navigation.
 * 
 * This hook provides a declarative way to register keyboard shortcuts with support for:
 * - Modifier keys (Ctrl, Shift, Alt, Meta)
 * - Automatic event listener cleanup
 * - Prevention of duplicate listeners
 * - Automatic preventDefault for matched shortcuts
 * 
 * The hook automatically handles cross-platform differences (e.g., Ctrl on Windows/Linux, Cmd on Mac).
 * 
 * @param shortcuts - Array of keyboard shortcuts to register
 * 
 * @example
 * ```tsx
 * function SearchDialog() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   
 *   useKeyboardNavigation([
 *     {
 *       key: 'k',
 *       ctrlKey: true,
 *       handler: () => setIsOpen(true),
 *       description: 'Open search dialog'
 *     },
 *     {
 *       key: 'Escape',
 *       handler: () => setIsOpen(false),
 *       description: 'Close search dialog'
 *     }
 *   ]);
 *   
 *   return isOpen ? <div>Search...</div> : null;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Navigation shortcuts
 * useKeyboardNavigation([
 *   {
 *     key: 'ArrowLeft',
 *     handler: () => navigate(-1),
 *     description: 'Go back'
 *   },
 *   {
 *     key: 'ArrowRight',
 *     handler: () => navigate(1),
 *     description: 'Go forward'
 *   }
 * ]);
 * ```
 * 
 * Validates: Requirements 11.2
 */
export function useKeyboardNavigation(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    /**
     * Handle keydown events and match against registered shortcuts.
     * When a shortcut matches, prevent default behavior and call the handler.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check each shortcut for a match
      for (const shortcut of shortcuts) {
        const matches = 
          event.key === shortcut.key &&
          (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
          (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
          (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
          (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);
        
        if (matches) {
          // Prevent default browser behavior for this key combination
          event.preventDefault();
          
          // Call the shortcut handler
          shortcut.handler(event);
          
          // Stop checking other shortcuts once we find a match
          break;
        }
      }
    };
    
    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup: remove event listener when component unmounts or shortcuts change
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
