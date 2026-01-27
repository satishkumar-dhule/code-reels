/**
 * Accessibility Library
 * 
 * Comprehensive accessibility utilities, hooks, and constants for WCAG 2.1 AA compliance.
 * 
 * @module accessibility
 */

// Export types
export type {
  AuditResult,
  Violation,
  ViolationNode,
  Pass,
  PassNode,
  Incomplete,
  IncompleteNode,
  LighthouseResult,
  LighthouseAudit,
  CustomCheckResult,
  AxeOptions,
  ComponentAccessibility,
  KeyboardShortcut,
  AccessibilityReport,
  Recommendation,
  ReportOptions,
  UseFocusTrapOptions,
  AnnouncementPriority
} from './types';

// Export constants
export {
  WCAG_AA_CONTRAST,
  TOUCH_TARGET_SIZE,
  ARIA_ROLES,
  KEYBOARD_KEYS,
  FOCUSABLE_ELEMENTS_SELECTOR,
  TOUCH_TARGET_SPACING,
  REDUCED_MOTION_DURATION,
  LIGHTHOUSE_SCORE_THRESHOLD,
  AUDIT_TIMEOUT,
  WCAG_TAGS
} from './constants';

// Export utility functions
export {
  generateId,
  getContrastRatio,
  meetsWCAGAA,
  getAriaLabel,
  isFocusable,
  getFocusableElements,
  meetsTouchTargetSize,
  announceToScreenReader
} from './utils';
