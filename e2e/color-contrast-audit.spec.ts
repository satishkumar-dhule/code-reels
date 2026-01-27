/**
 * Color Contrast Audit Tests
 * 
 * Comprehensive color contrast testing for WCAG 2.1 AA compliance.
 * Tests all pages in both light and dark modes.
 * 
 * Requirements:
 * - Normal text: 4.5:1 contrast ratio (Requirement 3.1)
 * - Large text: 3:1 contrast ratio (Requirement 3.2)
 * - UI components: 3:1 contrast ratio (Requirement 3.3)
 * - Dark mode compliance (Requirement 3.4)
 */

import { test, expect } from '@playwright/test';
import { 
  runAxeAuditEngine, 
  checkColorContrast,
  waitForPageStable,
  generateAuditSummary,
  auditAllPages
} from './helpers/accessibility-helpers';

// All pages to audit
const PAGES_TO_AUDIT = [
  '/',
  '/learning-paths',
  '/coding-challenges',
  '/blog',
  '/about',
  '/privacy',
  '/terms'
];

test.describe('Color Contrast Audit - Light Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure light mode is active
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
  });

  test('should have no color contrast violations on home page', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    
    if (violations.length > 0) {
      console.log('Color contrast violations found:');
      violations.forEach(v => {
        console.log(`\n${v.id}: ${v.description}`);
        console.log(`Impact: ${v.impact}`);
        console.log(`Help: ${v.help}`);
        v.nodes.forEach(node => {
          console.log(`  - ${node.target}`);
          console.log(`    HTML: ${node.html.substring(0, 100)}...`);
          console.log(`    Issue: ${node.failureSummary}`);
        });
      });
    }
    
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on learning paths page', async ({ page }) => {
    await page.goto('/learning-paths');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on coding challenges page', async ({ page }) => {
    await page.goto('/coding-challenges');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on blog page', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on about page', async ({ page }) => {
    await page.goto('/about');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on privacy page', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on terms page', async ({ page }) => {
    await page.goto('/terms');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Color Contrast Audit - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
  });

  test('should have no color contrast violations on home page in dark mode', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    
    if (violations.length > 0) {
      console.log('Dark mode color contrast violations found:');
      violations.forEach(v => {
        console.log(`\n${v.id}: ${v.description}`);
        console.log(`Impact: ${v.impact}`);
        console.log(`Help: ${v.help}`);
        v.nodes.forEach(node => {
          console.log(`  - ${node.target}`);
          console.log(`    HTML: ${node.html.substring(0, 100)}...`);
          console.log(`    Issue: ${node.failureSummary}`);
        });
      });
    }
    
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on learning paths page in dark mode', async ({ page }) => {
    await page.goto('/learning-paths');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on coding challenges page in dark mode', async ({ page }) => {
    await page.goto('/coding-challenges');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on blog page in dark mode', async ({ page }) => {
    await page.goto('/blog');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on about page in dark mode', async ({ page }) => {
    await page.goto('/about');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on privacy page in dark mode', async ({ page }) => {
    await page.goto('/privacy');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });

  test('should have no color contrast violations on terms page in dark mode', async ({ page }) => {
    await page.goto('/terms');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Comprehensive Color Contrast Report', () => {
  test('should generate comprehensive contrast audit report for all pages', async ({ page }) => {
    const lightModeResults = new Map();
    const darkModeResults = new Map();
    
    // Audit all pages in light mode
    console.log('\n=== LIGHT MODE AUDIT ===\n');
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    });
    
    for (const url of PAGES_TO_AUDIT) {
      await page.goto(url);
      await waitForPageStable(page);
      
      const result = await runAxeAuditEngine(page);
      const contrastViolations = result.violations.filter(v => v.id === 'color-contrast');
      
      lightModeResults.set(url, {
        ...result,
        violations: contrastViolations
      });
      
      console.log(`${url}: ${contrastViolations.length} contrast violations`);
    }
    
    // Audit all pages in dark mode
    console.log('\n=== DARK MODE AUDIT ===\n');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    
    for (const url of PAGES_TO_AUDIT) {
      await page.goto(url);
      await waitForPageStable(page);
      
      const result = await runAxeAuditEngine(page);
      const contrastViolations = result.violations.filter(v => v.id === 'color-contrast');
      
      darkModeResults.set(url, {
        ...result,
        violations: contrastViolations
      });
      
      console.log(`${url}: ${contrastViolations.length} contrast violations`);
    }
    
    // Generate summary
    const lightSummary = generateAuditSummary(lightModeResults);
    const darkSummary = generateAuditSummary(darkModeResults);
    
    console.log('\n=== SUMMARY ===\n');
    console.log(`Light Mode: ${lightSummary.totalViolations} total violations`);
    console.log(`  Critical: ${lightSummary.critical}`);
    console.log(`  Serious: ${lightSummary.serious}`);
    console.log(`  Moderate: ${lightSummary.moderate}`);
    console.log(`  Minor: ${lightSummary.minor}`);
    
    console.log(`\nDark Mode: ${darkSummary.totalViolations} total violations`);
    console.log(`  Critical: ${darkSummary.critical}`);
    console.log(`  Serious: ${darkSummary.serious}`);
    console.log(`  Moderate: ${darkSummary.moderate}`);
    console.log(`  Minor: ${darkSummary.minor}`);
    
    // Detailed violation report
    if (lightSummary.totalViolations > 0 || darkSummary.totalViolations > 0) {
      console.log('\n=== DETAILED VIOLATIONS ===\n');
      
      if (lightSummary.totalViolations > 0) {
        console.log('LIGHT MODE VIOLATIONS:');
        for (const [url, result] of lightModeResults) {
          if (result.violations.length > 0) {
            console.log(`\n${url}:`);
            result.violations.forEach((v: any) => {
              console.log(`  ${v.id} (${v.impact}): ${v.description}`);
              v.nodes.forEach((node: any) => {
                console.log(`    - ${node.target}`);
                console.log(`      ${node.failureSummary}`);
              });
            });
          }
        }
      }
      
      if (darkSummary.totalViolations > 0) {
        console.log('\nDARK MODE VIOLATIONS:');
        for (const [url, result] of darkModeResults) {
          if (result.violations.length > 0) {
            console.log(`\n${url}:`);
            result.violations.forEach((v: any) => {
              console.log(`  ${v.id} (${v.impact}): ${v.description}`);
              v.nodes.forEach((node: any) => {
                console.log(`    - ${node.target}`);
                console.log(`      ${node.failureSummary}`);
              });
            });
          }
        }
      }
    }
    
    // Test should pass if no violations found
    expect(lightSummary.totalViolations).toBe(0);
    expect(darkSummary.totalViolations).toBe(0);
  });
});

test.describe('Specific UI Component Contrast', () => {
  test('should have sufficient contrast for buttons', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    console.log(`\nChecking ${count} buttons for contrast...`);
    
    // Run axe on the page and filter for button-related contrast issues
    const violations = await checkColorContrast(page);
    const buttonViolations = violations.filter(v => 
      v.nodes.some(node => node.html.includes('<button'))
    );
    
    if (buttonViolations.length > 0) {
      console.log('Button contrast violations:');
      buttonViolations.forEach(v => {
        v.nodes.forEach(node => {
          if (node.html.includes('<button')) {
            console.log(`  - ${node.target}`);
            console.log(`    ${node.failureSummary}`);
          }
        });
      });
    }
    
    expect(buttonViolations).toEqual([]);
  });

  test('should have sufficient contrast for links', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    const linkViolations = violations.filter(v => 
      v.nodes.some(node => node.html.includes('<a'))
    );
    
    if (linkViolations.length > 0) {
      console.log('Link contrast violations:');
      linkViolations.forEach(v => {
        v.nodes.forEach(node => {
          if (node.html.includes('<a')) {
            console.log(`  - ${node.target}`);
            console.log(`    ${node.failureSummary}`);
          }
        });
      });
    }
    
    expect(linkViolations).toEqual([]);
  });

  test('should have sufficient contrast for form inputs', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    
    const violations = await checkColorContrast(page);
    const inputViolations = violations.filter(v => 
      v.nodes.some(node => 
        node.html.includes('<input') || 
        node.html.includes('<textarea') || 
        node.html.includes('<select')
      )
    );
    
    if (inputViolations.length > 0) {
      console.log('Form input contrast violations:');
      inputViolations.forEach(v => {
        v.nodes.forEach(node => {
          if (node.html.includes('<input') || node.html.includes('<textarea') || node.html.includes('<select')) {
            console.log(`  - ${node.target}`);
            console.log(`    ${node.failureSummary}`);
          }
        });
      });
    }
    
    expect(inputViolations).toEqual([]);
  });
});
