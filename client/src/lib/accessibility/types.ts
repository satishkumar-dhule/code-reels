/**
 * Accessibility Audit Types
 * 
 * TypeScript interfaces for the accessibility audit system.
 * These types support WCAG 2.1 AA compliance testing and reporting.
 */

/**
 * Result of an accessibility audit on a page
 */
export interface AuditResult {
  violations: Violation[];
  passes: Pass[];
  incomplete: Incomplete[];
  timestamp: string;
  url: string;
  viewport: { width: number; height: number };
  theme: 'light' | 'dark';
  error?: string;
}

/**
 * An accessibility violation found during audit
 */
export interface Violation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: ViolationNode[];
}

/**
 * A specific DOM node that has a violation
 */
export interface ViolationNode {
  html: string;
  target: string[] | any; // axe-core can return complex selectors
  failureSummary: string;
  element: string;
}

/**
 * An accessibility check that passed
 */
export interface Pass {
  id: string;
  description: string;
  nodes: PassNode[];
}

/**
 * A DOM node that passed an accessibility check
 */
export interface PassNode {
  html: string;
  target: string[] | any; // axe-core can return complex selectors
}

/**
 * An accessibility check that could not be completed automatically
 */
export interface Incomplete {
  id: string;
  description: string;
  nodes: IncompleteNode[];
}

/**
 * A DOM node with an incomplete check
 */
export interface IncompleteNode {
  html: string;
  target: string[] | any; // axe-core can return complex selectors
  message: string;
}

/**
 * Result of a Lighthouse accessibility audit
 */
export interface LighthouseResult {
  score: number;
  audits: Record<string, LighthouseAudit>;
}

/**
 * Individual Lighthouse audit result
 */
export interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
}

/**
 * Result of a custom accessibility check
 */
export interface CustomCheckResult {
  id: string;
  name: string;
  passed: boolean;
  violations?: any[];
  unreachable?: string[];
  message?: string;
}

/**
 * Options for configuring axe-core audits
 */
export interface AxeOptions {
  tags?: string[];
  rules?: Record<string, { enabled: boolean }>;
  runOnly?: {
    type: 'tag' | 'rule';
    values: string[];
  };
}

/**
 * Accessibility metadata for a component
 */
export interface ComponentAccessibility {
  componentName: string;
  ariaRole?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaModal?: boolean;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  ariaSelected?: boolean;
  ariaHidden?: boolean;
  tabIndex?: number;
  keyboardShortcuts?: KeyboardShortcut[];
  focusTrap?: boolean;
  touchTargetSize?: { width: number; height: number };
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
}

/**
 * Comprehensive accessibility audit report
 */
export interface AccessibilityReport {
  summary: {
    totalPages: number;
    totalViolations: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    lighthouseScore: number;
  };
  violations: Map<string, Violation[]>;
  pageResults: Array<[string, AuditResult]>;
  recommendations: Recommendation[];
  timestamp: string;
}

/**
 * Recommendation for fixing an accessibility issue
 */
export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  solution: string;
  codeExample?: string;
  affectedComponents: string[];
}

/**
 * Options for generating accessibility reports
 */
export interface ReportOptions {
  format: 'markdown' | 'html' | 'json';
  outputPath: string;
  includeScreenshots?: boolean;
}

/**
 * Options for the useFocusTrap hook
 */
export interface UseFocusTrapOptions {
  enabled: boolean;
  initialFocus?: React.RefObject<HTMLElement>;
  returnFocus?: boolean;
}

/**
 * Priority level for screen reader announcements
 */
export type AnnouncementPriority = 'polite' | 'assertive';
