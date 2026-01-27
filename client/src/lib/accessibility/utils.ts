/**
 * Accessibility Utility Functions
 * 
 * Helper functions for implementing accessible patterns and checking compliance.
 */

import { WCAG_AA_CONTRAST } from './constants';

/**
 * Counter for generating unique IDs
 */
let idCounter = 0;

/**
 * Generate a unique ID for ARIA relationships
 * 
 * @param prefix - Optional prefix for the ID (default: 'a11y')
 * @returns A unique ID string
 * 
 * @example
 * const labelId = generateId('label'); // 'label-1'
 * const descId = generateId('desc');   // 'desc-2'
 */
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Calculate the relative luminance of a color
 * 
 * @param color - Hex color string (e.g., '#ffffff')
 * @returns Relative luminance value between 0 and 1
 */
function getLuminance(color: string): number {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Calculate relative luminance using sRGB formula
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate the contrast ratio between two colors
 * 
 * @param foreground - Foreground color in hex format
 * @param background - Background color in hex format
 * @returns Contrast ratio (1:1 to 21:1)
 * 
 * @example
 * const ratio = getContrastRatio('#000000', '#ffffff'); // 21
 */
export function getContrastRatio(foreground: string, background: string): number {
  try {
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  } catch (error) {
    console.error('Error calculating contrast ratio:', error);
    return 0;
  }
}

/**
 * Check if color contrast meets WCAG AA standards
 * 
 * @param foreground - Foreground color in hex format
 * @param background - Background color in hex format
 * @param fontSize - Font size in pixels
 * @param isBold - Whether the text is bold
 * @returns True if contrast meets WCAG AA requirements
 * 
 * @example
 * meetsWCAGAA('#000000', '#ffffff', 16, false); // true
 * meetsWCAGAA('#777777', '#ffffff', 14, false); // false
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  fontSize: number,
  isBold: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);
  const requiredRatio = isLargeText 
    ? WCAG_AA_CONTRAST.LARGE_TEXT 
    : WCAG_AA_CONTRAST.NORMAL_TEXT;
  
  return ratio >= requiredRatio;
}

/**
 * Get the accessible name of an element
 * 
 * @param element - HTML element to check
 * @returns The accessible name or null if none found
 * 
 * @example
 * const button = document.querySelector('button');
 * const name = getAriaLabel(button); // 'Submit'
 */
export function getAriaLabel(element: HTMLElement): string | null {
  // Check aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // Check aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent?.trim() || null;
  }
  
  // Check text content
  const textContent = element.textContent?.trim();
  if (textContent) return textContent;
  
  // Check title attribute as fallback
  const title = element.getAttribute('title');
  if (title) return title;
  
  return null;
}

/**
 * Check if an element is focusable
 * 
 * @param element - HTML element to check
 * @returns True if the element can receive keyboard focus
 * 
 * @example
 * const button = document.querySelector('button');
 * isFocusable(button); // true
 */
export function isFocusable(element: HTMLElement): boolean {
  // Check if element is disabled
  const isDisabled = element.hasAttribute('disabled') || 
                     element.getAttribute('aria-disabled') === 'true';
  
  if (isDisabled) return false;
  
  // Check tabindex
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex && parseInt(tabIndex) >= 0) return true;
  
  // Check if element is naturally focusable
  const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableElements.includes(element.tagName)) {
    // For links, check if href exists
    if (element.tagName === 'A') {
      return element.hasAttribute('href');
    }
    return true;
  }
  
  return false;
}

/**
 * Get all focusable elements within a container
 * 
 * @param container - Container element to search within
 * @returns Array of focusable elements
 * 
 * @example
 * const modal = document.querySelector('[role="dialog"]');
 * const focusableElements = getFocusableElements(modal);
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(', ');
  
  return Array.from(
    container.querySelectorAll<HTMLElement>(selector)
  ).filter(el => !el.hasAttribute('aria-hidden') && isFocusable(el));
}

/**
 * Check if an element meets minimum touch target size
 * 
 * @param element - Element to check
 * @param minWidth - Minimum width in pixels (default: 44)
 * @param minHeight - Minimum height in pixels (default: 44)
 * @returns True if element meets minimum size
 */
export function meetsTouchTargetSize(
  element: HTMLElement,
  minWidth: number = 44,
  minHeight: number = 44
): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= minWidth && rect.height >= minHeight;
}

/**
 * Announce a message to screen readers
 * 
 * @param message - Message to announce
 * @param priority - 'polite' or 'assertive' (default: 'polite')
 * 
 * @example
 * announceToScreenReader('Form submitted successfully', 'polite');
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Find or create live region
  let liveRegion = document.getElementById('a11y-announcer');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-announcer';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
  }
  
  // Update aria-live priority if different
  if (liveRegion.getAttribute('aria-live') !== priority) {
    liveRegion.setAttribute('aria-live', priority);
  }
  
  // Set message
  liveRegion.textContent = message;
  
  // Clear after announcement
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = '';
    }
  }, 1000);
}
