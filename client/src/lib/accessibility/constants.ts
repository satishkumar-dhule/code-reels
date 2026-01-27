/**
 * Accessibility Constants
 * 
 * Standard values and thresholds for WCAG 2.1 AA compliance.
 */

/**
 * WCAG 2.1 AA contrast ratio requirements
 */
export const WCAG_AA_CONTRAST = {
  /** Minimum contrast ratio for normal text (under 18pt or 14pt bold) */
  NORMAL_TEXT: 4.5,
  /** Minimum contrast ratio for large text (18pt+ or 14pt+ bold) */
  LARGE_TEXT: 3.0,
  /** Minimum contrast ratio for UI components and graphical objects */
  UI_COMPONENTS: 3.0
} as const;

/**
 * Minimum touch target sizes for mobile platforms
 */
export const TOUCH_TARGET_SIZE = {
  /** iOS Human Interface Guidelines minimum touch target */
  IOS: { width: 44, height: 44 },
  /** Android Material Design minimum touch target */
  ANDROID: { width: 48, height: 48 },
  /** Recommended minimum for cross-platform compatibility */
  MINIMUM: { width: 44, height: 44 }
} as const;

/**
 * Standard ARIA roles for common component patterns
 */
export const ARIA_ROLES = {
  DIALOG: 'dialog',
  NAVIGATION: 'navigation',
  MAIN: 'main',
  COMPLEMENTARY: 'complementary',
  BUTTON: 'button',
  LINK: 'link',
  STATUS: 'status',
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  FORM: 'form',
  SEARCH: 'search',
  REGION: 'region',
  ARTICLE: 'article',
  LIST: 'list',
  LISTITEM: 'listitem',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist'
} as const;

/**
 * Standard keyboard keys for navigation and interaction
 */
export const KEYBOARD_KEYS = {
  TAB: 'Tab',
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const;

/**
 * CSS selector for focusable elements
 */
export const FOCUSABLE_ELEMENTS_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

/**
 * Minimum spacing between touch targets (in pixels)
 */
export const TOUCH_TARGET_SPACING = 8;

/**
 * Maximum animation duration for reduced motion (in seconds)
 */
export const REDUCED_MOTION_DURATION = 0.01;

/**
 * Lighthouse accessibility score threshold
 */
export const LIGHTHOUSE_SCORE_THRESHOLD = 95;

/**
 * Default timeout for accessibility audits (in milliseconds)
 */
export const AUDIT_TIMEOUT = 30000;

/**
 * WCAG 2.1 AA tags for axe-core
 */
export const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa'
] as const;
