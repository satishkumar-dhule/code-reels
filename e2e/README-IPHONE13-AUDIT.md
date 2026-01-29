# iPhone 13 UI Audit

Comprehensive UI audit infrastructure for testing on iPhone 13 viewport (390x844px).

## Overview

This audit system identifies layout issues, clipped content, and accessibility problems specific to iPhone 13 screen dimensions. It validates that all content is visible, interactive elements are accessible, and the layout respects safe areas (notch and home indicator).

## Quick Start

### Run the Full Audit

```bash
# Run all iPhone 13 audit tests
npx playwright test --project=iphone13-audit

# Run with UI mode for debugging
npx playwright test --project=iphone13-audit --ui

# Run specific test
npx playwright test iphone13-ui-audit.spec.ts --project=iphone13-audit
```

### Run Individual Test Suites

```bash
# Test specific pages
npx playwright test iphone13-ui-audit.spec.ts --project=iphone13-audit --grep "Home Page"

# Test viewport compliance only
npx playwright test iphone13-ui-audit.spec.ts --project=iphone13-audit --grep "Viewport Compliance"

# Test touch targets only
npx playwright test iphone13-ui-audit.spec.ts --project=iphone13-audit --grep "Touch Targets"

# Generate full audit report
npx playwright test iphone13-ui-audit.spec.ts --project=iphone13-audit --grep "Full Report"
```

## What Gets Tested

### 1. Viewport Bounds Compliance
- All content within 390x844px viewport
- No text or elements clipped at edges
- All buttons and interactive elements fully visible

### 2. Safe Area Compliance
- Content respects notch area (top 47px)
- Content respects home indicator (bottom 34px)
- Critical content not in unsafe zones

### 3. Touch Target Sizing
- All interactive elements meet 44x44px minimum (Apple HIG)
- Critical severity for targets < 30px
- High severity for targets < 44px

### 4. Fixed Element Overlap
- Fixed/sticky elements don't obscure content
- Navigation bars don't block interactive elements
- Floating action buttons positioned correctly

### 5. Horizontal Overflow
- No unintentional horizontal scrolling
- Page width constrained to 390px
- Intentional scrolling (carousels) excluded

### 6. Theme Consistency
- Both light and dark themes tested
- No layout shifts during theme changes
- All issues tracked per theme

## Architecture

### Files

```
e2e/
├── iphone13-ui-audit.spec.ts          # Main test suite
├── helpers/
│   ├── iphone13-helpers.ts            # iPhone 13 specific utilities
│   └── viewport-helpers.ts            # Generic viewport measurements
└── reports/
    ├── iphone13-audit-report.json     # Machine-readable results
    ├── iphone13-audit-report.md       # Human-readable summary
    └── screenshots/                   # Issue screenshots
```

### Key Constants

```typescript
IPHONE13_STANDARDS = {
  viewport: { width: 390, height: 844 },
  safeArea: { top: 47, bottom: 34, left: 0, right: 0 },
  minTouchTarget: 44,
  thumbReachZone: { top: 200, bottom: 810 },
}

PAGES_TO_TEST = [
  'Home', 'Learning Paths', 'Question Viewer',
  'Coding Challenges', 'Certifications', 'Stats',
  'SRS Review', 'Voice Interview', 'Blog', 'Settings'
]
```

## Issue Types and Severity

### Issue Types
- **clipping**: Content cut off at viewport edges
- **overlap**: Fixed elements obscuring content
- **touch-target**: Interactive elements too small
- **safe-area**: Content in notch/home indicator zones
- **overflow**: Horizontal scrolling detected

### Severity Levels
- **critical**: Completely unusable (hidden buttons, unreadable text)
- **high**: Significant usability impact (small touch targets, unsafe zones)
- **medium**: Minor issues (slight clipping, non-critical overlap)
- **low**: Cosmetic issues (spacing, minor visual problems)

## Helper Functions

### iPhone 13 Helpers

```typescript
// Safe area checks
isInSafeArea(page, selector, safeArea)
checkSafeAreaViolations(page, safeArea)

// Touch target checks
getTouchTargetSize(page, selector)
checkTouchTargets(page, minSize)

// Overlap detection
checkFixedElementOverlap(page)
getZIndexStack(page, selector)

// Theme utilities
switchTheme(page, 'light' | 'dark')
getCurrentTheme(page)

// Utilities
waitForPageStable(page)
generateAuditReport(pageResults)
```

### Viewport Helpers

```typescript
// Viewport measurements
isElementInViewport(page, selector)
getElementBounds(page, selector)
isElementClipped(page, selector, viewport)

// Overflow detection
checkHorizontalOverflow(page)
checkVerticalOverflow(page)

// Compliance checks
checkViewportCompliance(page, viewport)
getOutOfViewportElements(page)

// Visibility
getVisibleAreaPercentage(page, selector)
isElementFullyVisible(page, selector)
```

## Audit Report Format

### JSON Report Structure

```typescript
{
  device: 'iPhone 13',
  viewport: { width: 390, height: 844 },
  totalPages: 20,
  totalIssues: 15,
  criticalIssues: 0,
  pageResults: [
    {
      page: 'Home',
      url: '/',
      theme: 'light',
      timestamp: '2024-01-01T00:00:00.000Z',
      issues: [
        {
          type: 'touch-target',
          severity: 'high',
          page: '/',
          element: '<button>...</button>',
          selector: 'button',
          description: 'Touch target too small: 40x40px',
          measurements: {
            expected: 44,
            actual: 40,
            bounds: { x: 10, y: 20, width: 40, height: 40 }
          }
        }
      ],
      passed: false
    }
  ],
  summary: {
    clippingIssues: 3,
    overlapIssues: 2,
    touchTargetIssues: 8,
    safeAreaIssues: 1,
    overflowIssues: 1
  }
}
```

## Test Configuration

The audit uses a dedicated Playwright project:

```typescript
{
  name: 'iphone13-audit',
  use: {
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  testMatch: '**/iphone13-ui-audit.spec.ts',
}
```

## Interpreting Results

### Zero Critical Issues = Success
The primary goal is **zero critical issues**. Critical issues mean:
- Interactive elements completely hidden
- Text unreadable due to clipping
- Touch targets < 30px (unusable)

### High Issues Should Be Fixed
High severity issues significantly impact UX:
- Touch targets < 44px
- Content in unsafe zones
- Fixed elements blocking content

### Medium/Low Issues Are Informational
These can be addressed in future iterations:
- Minor clipping (1-2px)
- Non-critical spacing issues
- Cosmetic problems

## Adding New Pages

To add a new page to the audit:

```typescript
// In e2e/helpers/iphone13-helpers.ts
export const PAGES_TO_TEST: PageTestConfig[] = [
  // ... existing pages
  {
    name: 'New Page',
    url: '/new-page',
    waitFor: '[data-testid="new-page"]', // Optional
    skipChecks: ['overlap'], // Optional
    modals: [ // Optional
      {
        name: 'Settings Modal',
        trigger: '[data-testid="open-settings"]',
        closeButton: '[data-testid="close-modal"]',
      }
    ],
  },
];
```

## Debugging Issues

### View Issues in UI Mode

```bash
npx playwright test --project=iphone13-audit --ui
```

### Capture Screenshots

```bash
npx playwright test --project=iphone13-audit --screenshot=on
```

### Run in Headed Mode

```bash
npx playwright test --project=iphone13-audit --headed
```

### Debug Specific Page

```bash
npx playwright test --project=iphone13-audit --grep "Home Page" --debug
```

## CI/CD Integration

The audit can run in CI pipelines:

```yaml
# .github/workflows/iphone13-audit.yml
- name: Run iPhone 13 UI Audit
  run: npx playwright test --project=iphone13-audit
  
- name: Upload Audit Report
  uses: actions/upload-artifact@v3
  with:
    name: iphone13-audit-report
    path: e2e/reports/
```

## Requirements Coverage

This infrastructure satisfies:
- **Requirements 1.1-1.6**: Content visibility
- **Requirements 2.1-2.6**: Interactive element accessibility
- **Requirements 3.1-3.6**: Layout integrity
- **Requirements 4.1-4.6**: Navigation usability
- **Requirements 5.1-5.12**: Page-specific testing
- **Requirements 6.1-6.6**: Dynamic content testing
- **Requirements 7.1-7.6**: Theme compatibility

## Next Steps

After infrastructure setup:
1. Implement viewport measurement utilities (Task 2)
2. Implement safe area utilities (Task 3)
3. Implement touch target utilities (Task 4)
4. Add property-based tests for universal rules
5. Add page-specific audit tests
6. Generate comprehensive audit reports

## Support

For questions or issues:
- Review the design document: `.kiro/specs/iphone13-ui-audit/design.md`
- Check requirements: `.kiro/specs/iphone13-ui-audit/requirements.md`
- See task list: `.kiro/specs/iphone13-ui-audit/tasks.md`
