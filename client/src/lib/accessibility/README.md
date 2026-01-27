# Accessibility Library

Comprehensive accessibility utilities, hooks, and constants for WCAG 2.1 AA compliance.

## Overview

This library provides tools for implementing and testing accessible web applications:

- **Types**: TypeScript interfaces for accessibility audit results and component metadata
- **Constants**: WCAG standards, ARIA roles, keyboard keys, and touch target sizes
- **Utilities**: Helper functions for contrast checking, focus management, and screen reader announcements

## Installation

All required dependencies are already installed:
- `axe-core`: ^4.11.1
- `@axe-core/playwright`: ^4.11.0
- `fast-check`: ^4.5.3

## Directory Structure

```
client/src/lib/accessibility/
├── index.ts           # Main exports
├── types.ts           # TypeScript interfaces
├── constants.ts       # WCAG standards and constants
├── utils.ts           # Utility functions
└── README.md          # This file

e2e/helpers/
└── accessibility-helpers.ts  # Playwright test helpers
```

## Usage

### Importing

```typescript
import {
  // Constants
  WCAG_AA_CONTRAST,
  TOUCH_TARGET_SIZE,
  ARIA_ROLES,
  KEYBOARD_KEYS,
  
  // Utilities
  generateId,
  getContrastRatio,
  meetsWCAGAA,
  getAriaLabel,
  isFocusable,
  getFocusableElements,
  announceToScreenReader,
  
  // Types
  type AuditResult,
  type Violation,
  type ComponentAccessibility
} from '@/lib/accessibility';
```

### Utility Functions

#### Generate Unique IDs

```typescript
import { generateId } from '@/lib/accessibility';

const labelId = generateId('label');  // 'label-1'
const descId = generateId('desc');    // 'desc-2'

// Use in components
<input aria-labelledby={labelId} aria-describedby={descId} />
```

#### Check Color Contrast

```typescript
import { getContrastRatio, meetsWCAGAA } from '@/lib/accessibility';

// Calculate contrast ratio
const ratio = getContrastRatio('#000000', '#ffffff'); // 21

// Check WCAG AA compliance
const isCompliant = meetsWCAGAA('#000000', '#ffffff', 16, false); // true
```

#### Get Accessible Name

```typescript
import { getAriaLabel } from '@/lib/accessibility';

const button = document.querySelector('button');
const name = getAriaLabel(button); // Returns aria-label, text content, or title
```

#### Check Focusability

```typescript
import { isFocusable, getFocusableElements } from '@/lib/accessibility';

// Check single element
const button = document.querySelector('button');
const canFocus = isFocusable(button); // true

// Get all focusable elements in container
const modal = document.querySelector('[role="dialog"]');
const focusableElements = getFocusableElements(modal);
```

#### Screen Reader Announcements

```typescript
import { announceToScreenReader } from '@/lib/accessibility';

// Polite announcement (doesn't interrupt)
announceToScreenReader('Form submitted successfully', 'polite');

// Assertive announcement (interrupts current speech)
announceToScreenReader('Error: Please fix the form', 'assertive');
```

### Constants

#### WCAG Contrast Ratios

```typescript
import { WCAG_AA_CONTRAST } from '@/lib/accessibility';

WCAG_AA_CONTRAST.NORMAL_TEXT;    // 4.5:1
WCAG_AA_CONTRAST.LARGE_TEXT;     // 3:1
WCAG_AA_CONTRAST.UI_COMPONENTS;  // 3:1
```

#### Touch Target Sizes

```typescript
import { TOUCH_TARGET_SIZE } from '@/lib/accessibility';

TOUCH_TARGET_SIZE.IOS;      // { width: 44, height: 44 }
TOUCH_TARGET_SIZE.ANDROID;  // { width: 48, height: 48 }
TOUCH_TARGET_SIZE.MINIMUM;  // { width: 44, height: 44 }
```

#### ARIA Roles

```typescript
import { ARIA_ROLES } from '@/lib/accessibility';

ARIA_ROLES.DIALOG;         // 'dialog'
ARIA_ROLES.NAVIGATION;     // 'navigation'
ARIA_ROLES.MAIN;           // 'main'
ARIA_ROLES.BUTTON;         // 'button'
```

#### Keyboard Keys

```typescript
import { KEYBOARD_KEYS } from '@/lib/accessibility';

KEYBOARD_KEYS.TAB;         // 'Tab'
KEYBOARD_KEYS.ENTER;       // 'Enter'
KEYBOARD_KEYS.ESCAPE;      // 'Escape'
KEYBOARD_KEYS.ARROW_UP;    // 'ArrowUp'
```

## Testing Helpers

### Playwright Test Helpers

```typescript
import {
  runAxeAudit,
  checkAccessibleNames,
  testFocusTrap,
  checkTouchTargetSizes,
  testKeyboardNavigation,
  checkReducedMotion,
  checkLandmarks,
  checkHeadingHierarchy,
  checkColorContrast
} from '../helpers/accessibility-helpers';

test('accessibility audit', async ({ page }) => {
  await page.goto('/');
  
  // Run axe-core audit
  const results = await runAxeAudit(page);
  expect(results.violations).toEqual([]);
  
  // Check accessible names
  const missingNames = await checkAccessibleNames(page);
  expect(missingNames).toEqual([]);
  
  // Check touch target sizes
  const sizeViolations = await checkTouchTargetSizes(page);
  expect(sizeViolations).toEqual([]);
  
  // Check landmarks
  const landmarks = await checkLandmarks(page);
  expect(landmarks.hasNav).toBe(true);
  expect(landmarks.hasMain).toBe(true);
});
```

## TypeScript Types

### AuditResult

```typescript
interface AuditResult {
  violations: Violation[];
  passes: Pass[];
  incomplete: Incomplete[];
  timestamp: string;
  url: string;
  viewport: { width: number; height: number };
  theme: 'light' | 'dark';
}
```

### ComponentAccessibility

```typescript
interface ComponentAccessibility {
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
```

## Next Steps

This infrastructure setup provides the foundation for:

1. **Accessibility Hooks**: Custom React hooks for focus management, keyboard navigation, and reduced motion
2. **Audit Engine**: Automated scanning with axe-core and custom checks
3. **Testing Suite**: Comprehensive Playwright tests for accessibility compliance
4. **Report Generation**: Detailed reports in Markdown, HTML, and JSON formats

See the [design document](/.kiro/specs/accessibility-audit/design.md) for complete implementation details.

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
