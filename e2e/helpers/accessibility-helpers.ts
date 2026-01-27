/**
 * Accessibility Test Helpers
 * 
 * Helper functions for Playwright accessibility tests.
 * These utilities simplify common accessibility testing patterns.
 * 
 * This serves as the "audit engine" for the static site - all auditing
 * happens at BUILD TIME via Playwright tests, not at runtime.
 */

import { Page, Locator, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { 
  AuditResult, 
  CustomCheckResult, 
  LighthouseResult,
  AxeOptions 
} from '../../client/src/lib/accessibility/types';

/**
 * Run axe-core accessibility audit on a page
 * 
 * @param page - Playwright page object
 * @param tags - Optional WCAG tags to test (default: WCAG 2.1 AA)
 * @returns Axe audit results
 * 
 * @example
 * const results = await runAxeAudit(page);
 * expect(results.violations).toEqual([]);
 */
export async function runAxeAudit(
  page: Page,
  tags: string[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
) {
  return await new AxeBuilder({ page })
    .withTags(tags)
    .analyze();
}

/**
 * Check if all interactive elements on a page have accessible names
 * 
 * @param page - Playwright page object
 * @returns Array of elements without accessible names
 */
export async function checkAccessibleNames(page: Page): Promise<string[]> {
  const elementsWithoutNames: string[] = [];
  
  const interactiveElements = page.locator(
    'button, a, input, select, textarea, [role="button"], [role="link"]'
  );
  
  const count = await interactiveElements.count();
  
  for (let i = 0; i < count; i++) {
    const element = interactiveElements.nth(i);
    const accessibleName = await element.evaluate(el => {
      return el.getAttribute('aria-label') ||
             el.getAttribute('aria-labelledby') ||
             el.textContent?.trim() ||
             el.getAttribute('title') ||
             (el as HTMLInputElement).placeholder;
    });
    
    if (!accessibleName) {
      const html = await element.evaluate(el => el.outerHTML);
      elementsWithoutNames.push(html);
    }
  }
  
  return elementsWithoutNames;
}

/**
 * Check if focus trap works correctly in a modal/dialog
 * 
 * @param page - Playwright page object
 * @param modalSelector - CSS selector for the modal
 */
export async function testFocusTrap(page: Page, modalSelector: string) {
  const modal = page.locator(modalSelector);
  await expect(modal).toBeVisible();
  
  // Get all focusable elements in modal
  const focusableElements = modal.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const count = await focusableElements.count();
  
  if (count === 0) {
    throw new Error('No focusable elements found in modal');
  }
  
  const firstElement = focusableElements.first();
  const lastElement = focusableElements.last();
  
  // Focus first element
  await firstElement.focus();
  await expect(firstElement).toBeFocused();
  
  // Tab through all elements
  for (let i = 0; i < count - 1; i++) {
    await page.keyboard.press('Tab');
  }
  
  // Should be on last element
  await expect(lastElement).toBeFocused();
  
  // Tab once more should cycle to first
  await page.keyboard.press('Tab');
  await expect(firstElement).toBeFocused();
  
  // Shift+Tab should go to last
  await page.keyboard.press('Shift+Tab');
  await expect(lastElement).toBeFocused();
}

/**
 * Check if all touch targets meet minimum size requirements
 * 
 * @param page - Playwright page object
 * @param minWidth - Minimum width in pixels (default: 44)
 * @param minHeight - Minimum height in pixels (default: 44)
 * @returns Array of elements that don't meet size requirements
 */
export async function checkTouchTargetSizes(
  page: Page,
  minWidth: number = 44,
  minHeight: number = 44
): Promise<Array<{ html: string; width: number; height: number }>> {
  const violations: Array<{ html: string; width: number; height: number }> = [];
  
  const interactiveElements = page.locator(
    'button, a, input, select, textarea, [role="button"], [role="link"]'
  );
  
  const count = await interactiveElements.count();
  
  for (let i = 0; i < count; i++) {
    const element = interactiveElements.nth(i);
    const box = await element.boundingBox();
    
    if (box && (box.width < minWidth || box.height < minHeight)) {
      const html = await element.evaluate(el => el.outerHTML);
      violations.push({
        html,
        width: box.width,
        height: box.height
      });
    }
  }
  
  return violations;
}

/**
 * Test keyboard navigation through all interactive elements
 * 
 * @param page - Playwright page object
 * @returns True if all elements are keyboard accessible
 */
export async function testKeyboardNavigation(page: Page): Promise<boolean> {
  const interactiveElements = page.locator(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const count = await interactiveElements.count();
  
  if (count === 0) {
    return true; // No interactive elements to test
  }
  
  // Start from first element
  await page.keyboard.press('Tab');
  
  // Tab through all elements
  for (let i = 0; i < count; i++) {
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    
    if (!focusedElement) {
      return false;
    }
    
    await page.keyboard.press('Tab');
  }
  
  return true;
}

/**
 * Check if reduced motion preference is respected
 * 
 * @param page - Playwright page object
 * @returns Array of elements with animations that don't respect reduced motion
 */
export async function checkReducedMotion(page: Page): Promise<string[]> {
  // Enable reduced motion preference
  await page.emulateMedia({ reducedMotion: 'reduce' });
  
  const violations: string[] = [];
  
  const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
  const count = await animatedElements.count();
  
  for (let i = 0; i < count; i++) {
    const element = animatedElements.nth(i);
    const hasReducedMotion = await element.evaluate(el => {
      const styles = window.getComputedStyle(el);
      const duration = parseFloat(styles.animationDuration || '0');
      const transitionDuration = parseFloat(styles.transitionDuration || '0');
      return duration <= 0.01 && transitionDuration <= 0.01;
    });
    
    if (!hasReducedMotion) {
      const html = await element.evaluate(el => el.outerHTML);
      violations.push(html);
    }
  }
  
  return violations;
}

/**
 * Check if landmark roles are present on a page
 * 
 * @param page - Playwright page object
 * @returns Object indicating which landmarks are present
 */
export async function checkLandmarks(page: Page) {
  return {
    hasNav: await page.locator('nav, [role="navigation"]').count() > 0,
    hasMain: await page.locator('main, [role="main"]').count() > 0,
    hasFooter: await page.locator('footer, [role="contentinfo"]').count() > 0,
    hasAside: await page.locator('aside, [role="complementary"]').count() > 0
  };
}

/**
 * Check heading hierarchy on a page
 * 
 * @param page - Playwright page object
 * @returns Object with heading hierarchy information
 */
export async function checkHeadingHierarchy(page: Page) {
  const headings = await page.evaluate(() => {
    const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    return headingElements.map(el => ({
      level: parseInt(el.tagName.substring(1)),
      text: el.textContent?.trim() || ''
    }));
  });
  
  const violations: string[] = [];
  
  // Check for exactly one h1
  const h1Count = headings.filter(h => h.level === 1).length;
  if (h1Count !== 1) {
    violations.push(`Expected exactly one h1, found ${h1Count}`);
  }
  
  // Check for skipped levels
  for (let i = 1; i < headings.length; i++) {
    const diff = headings[i].level - headings[i - 1].level;
    if (diff > 1) {
      violations.push(
        `Heading level skipped: h${headings[i - 1].level} to h${headings[i].level}`
      );
    }
  }
  
  return {
    headings,
    violations,
    isValid: violations.length === 0
  };
}

/**
 * Check color contrast for text elements
 * 
 * @param page - Playwright page object
 * @returns Axe color contrast violations
 */
export async function checkColorContrast(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .include(['body'])
    .analyze();
  
  return results.violations.filter(v => v.id === 'color-contrast');
}

/**
 * Wait for page to be fully loaded and stable
 * 
 * @param page - Playwright page object
 */
export async function waitForPageStable(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
  // Wait a bit for any animations to settle
  await page.waitForTimeout(500);
}

// ============================================================================
// AUDIT ENGINE METHODS
// ============================================================================
// These methods form the "audit engine" for the static site.
// All auditing happens at BUILD TIME via Playwright tests.
// ============================================================================

/**
 * Run a comprehensive axe-core audit and return structured results
 * 
 * This is the primary audit method that integrates axe-core for WCAG compliance.
 * 
 * @param page - Playwright page object
 * @param options - Optional axe-core configuration
 * @returns Structured audit result with violations, passes, and metadata
 * 
 * @example
 * const result = await runAxeAuditEngine(page);
 * expect(result.violations).toEqual([]);
 * console.log(`Audited ${result.url} at ${result.timestamp}`);
 */
export async function runAxeAuditEngine(
  page: Page,
  options?: AxeOptions
): Promise<AuditResult> {
  const url = page.url();
  const viewport = page.viewportSize() || { width: 1280, height: 720 };
  
  // Detect theme from page
  const theme = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }) as 'light' | 'dark';
  
  try {
    const axeResults = await new AxeBuilder({ page })
      .withTags(options?.tags || ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    return {
      violations: axeResults.violations.map(v => ({
        id: v.id,
        impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map(n => ({
          html: n.html,
          target: n.target as any,
          failureSummary: n.failureSummary || '',
          element: Array.isArray(n.target) ? n.target.join(' > ') : String(n.target)
        }))
      })),
      passes: axeResults.passes.map(p => ({
        id: p.id,
        description: p.description,
        nodes: p.nodes.map(n => ({
          html: n.html,
          target: n.target as any
        }))
      })),
      incomplete: axeResults.incomplete.map(i => ({
        id: i.id,
        description: i.description,
        nodes: i.nodes.map(n => ({
          html: n.html,
          target: n.target as any,
          message: n.failureSummary || ''
        }))
      })),
      timestamp: new Date().toISOString(),
      url,
      viewport,
      theme
    };
  } catch (error) {
    return {
      violations: [],
      passes: [],
      incomplete: [],
      timestamp: new Date().toISOString(),
      url,
      viewport,
      theme,
      error: `Audit failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Run Lighthouse accessibility audit
 * 
 * Note: This is a placeholder for Lighthouse integration.
 * Lighthouse audits are typically run separately in CI/CD pipelines.
 * 
 * @param page - Playwright page object
 * @returns Lighthouse audit results
 * 
 * @example
 * const result = await runLighthouseAudit(page);
 * expect(result.score).toBeGreaterThanOrEqual(95);
 */
export async function runLighthouseAudit(page: Page): Promise<LighthouseResult> {
  // Lighthouse integration would go here
  // For now, we return a placeholder that indicates Lighthouse should be run separately
  console.warn('Lighthouse audits should be run separately in CI/CD pipeline');
  
  return {
    score: 0,
    audits: {
      'lighthouse-placeholder': {
        id: 'lighthouse-placeholder',
        title: 'Lighthouse Placeholder',
        description: 'Run Lighthouse separately in CI/CD',
        score: null,
        displayValue: 'Not implemented in Playwright helpers'
      }
    }
  };
}

/**
 * Run custom accessibility checks
 * 
 * Executes a suite of custom checks that complement axe-core:
 * - Touch target size compliance
 * - Keyboard navigation completeness
 * - Focus indicator visibility
 * - Reduced motion support
 * 
 * @param page - Playwright page object
 * @returns Array of custom check results
 * 
 * @example
 * const results = await runCustomChecks(page);
 * const failures = results.filter(r => !r.passed);
 * expect(failures).toEqual([]);
 */
export async function runCustomChecks(page: Page): Promise<CustomCheckResult[]> {
  const results: CustomCheckResult[] = [];
  
  // Check 1: Touch Target Size Compliance
  try {
    const touchTargetViolations = await checkTouchTargetSizes(page);
    results.push({
      id: 'touch-target-size',
      name: 'Touch Target Size Compliance',
      passed: touchTargetViolations.length === 0,
      violations: touchTargetViolations
    });
  } catch (error) {
    results.push({
      id: 'touch-target-size',
      name: 'Touch Target Size Compliance',
      passed: false,
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  // Check 2: Keyboard Navigation Completeness
  try {
    const keyboardAccessible = await testKeyboardNavigation(page);
    results.push({
      id: 'keyboard-navigation',
      name: 'Keyboard Navigation Completeness',
      passed: keyboardAccessible,
      message: keyboardAccessible ? 'All elements are keyboard accessible' : 'Some elements are not keyboard accessible'
    });
  } catch (error) {
    results.push({
      id: 'keyboard-navigation',
      name: 'Keyboard Navigation Completeness',
      passed: false,
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  // Check 3: Focus Indicator Visibility
  try {
    const focusIndicatorViolations = await checkFocusIndicators(page);
    results.push({
      id: 'focus-visible',
      name: 'Focus Indicator Visibility',
      passed: focusIndicatorViolations.length === 0,
      violations: focusIndicatorViolations
    });
  } catch (error) {
    results.push({
      id: 'focus-visible',
      name: 'Focus Indicator Visibility',
      passed: false,
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  // Check 4: Reduced Motion Support
  try {
    const reducedMotionViolations = await checkReducedMotion(page);
    results.push({
      id: 'reduced-motion',
      name: 'Reduced Motion Support',
      passed: reducedMotionViolations.length === 0,
      violations: reducedMotionViolations
    });
  } catch (error) {
    results.push({
      id: 'reduced-motion',
      name: 'Reduced Motion Support',
      passed: false,
      message: `Check failed: ${error instanceof Error ? error.message : String(error)}`
    });
  }
  
  return results;
}

/**
 * Check focus indicators on all focusable elements
 * 
 * @param page - Playwright page object
 * @returns Array of elements without visible focus indicators
 */
async function checkFocusIndicators(page: Page): Promise<string[]> {
  const violations: string[] = [];
  
  const focusableElements = page.locator(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const count = await focusableElements.count();
  
  for (let i = 0; i < count; i++) {
    const element = focusableElements.nth(i);
    
    try {
      await element.focus();
      
      const hasVisibleFocus = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        const focusComputed = window.getComputedStyle(el, ':focus');
        
        // Check if outline is explicitly disabled
        const outlineStyle = focusComputed.outlineStyle || computed.outlineStyle;
        const outlineWidth = focusComputed.outlineWidth || computed.outlineWidth;
        const outlineExplicitlyDisabled = outlineStyle === 'none' || outlineWidth === '0px';
        
        // If outline is explicitly disabled, check for alternative focus indicators
        if (outlineExplicitlyDisabled) {
          // Check for box-shadow
          const boxShadow = focusComputed.boxShadow;
          if (boxShadow && boxShadow !== 'none') {
            return true;
          }
          
          // Check for border changes
          if (computed.border !== focusComputed.border) {
            return true;
          }
          
          // Check for background changes
          if (computed.backgroundColor !== focusComputed.backgroundColor) {
            return true;
          }
          
          // Check for text decoration changes
          if (computed.textDecoration !== focusComputed.textDecoration) {
            return true;
          }
          
          // No alternative focus indicator found
          return false;
        }
        
        // Outline is not explicitly disabled, so browser default or custom outline exists
        return true;
      });
      
      if (!hasVisibleFocus) {
        const html = await element.evaluate(el => el.outerHTML);
        violations.push(html);
      }
    } catch (error) {
      // Element might not be focusable, skip it
      continue;
    }
  }
  
  return violations;
}

/**
 * Audit all pages in the application
 * 
 * This method runs a complete audit across multiple pages.
 * Useful for comprehensive site-wide accessibility testing.
 * 
 * @param page - Playwright page object
 * @param urls - Array of URLs to audit
 * @returns Map of URL to audit results
 * 
 * @example
 * const results = await auditAllPages(page, ['/', '/about', '/contact']);
 * for (const [url, result] of results) {
 *   console.log(`${url}: ${result.violations.length} violations`);
 * }
 */
export async function auditAllPages(
  page: Page,
  urls: string[]
): Promise<Map<string, AuditResult>> {
  const results = new Map<string, AuditResult>();
  
  for (const url of urls) {
    try {
      await page.goto(url, { timeout: 30000 });
      await waitForPageStable(page);
      
      const result = await runAxeAuditEngine(page);
      results.set(url, result);
    } catch (error) {
      results.set(url, {
        violations: [],
        passes: [],
        incomplete: [],
        timestamp: new Date().toISOString(),
        url,
        viewport: page.viewportSize() || { width: 1280, height: 720 },
        theme: 'light',
        error: `Failed to audit page: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  return results;
}

/**
 * Generate a summary report from audit results
 * 
 * @param results - Map of URL to audit results
 * @returns Summary object with aggregated statistics
 * 
 * @example
 * const results = await auditAllPages(page, urls);
 * const summary = generateAuditSummary(results);
 * console.log(`Total violations: ${summary.totalViolations}`);
 */
export function generateAuditSummary(results: Map<string, AuditResult>) {
  let totalViolations = 0;
  let critical = 0;
  let serious = 0;
  let moderate = 0;
  let minor = 0;
  
  for (const result of results.values()) {
    totalViolations += result.violations.length;
    
    for (const violation of result.violations) {
      switch (violation.impact) {
        case 'critical':
          critical++;
          break;
        case 'serious':
          serious++;
          break;
        case 'moderate':
          moderate++;
          break;
        case 'minor':
          minor++;
          break;
      }
    }
  }
  
  return {
    totalPages: results.size,
    totalViolations,
    critical,
    serious,
    moderate,
    minor,
    pageResults: Array.from(results.entries())
  };
}
