/**
 * Screen Reader Accessibility Audit
 * 
 * Task 6.1: Run audit to identify screen reader issues
 * 
 * This test suite runs the audit engine on all key pages to identify:
 * - Elements missing accessible names (Requirement 1.1)
 * - Missing ARIA attributes on custom components (Requirement 1.2)
 * - Images missing alt text (Requirement 1.5)
 * 
 * All auditing happens at BUILD TIME via Playwright tests.
 * This is a static site deployed on GitHub Pages.
 */

import { test, expect } from '@playwright/test';
import {
  runAxeAuditEngine,
  checkAccessibleNames,
  runCustomChecks,
  auditAllPages,
  generateAuditSummary,
  waitForPageStable
} from './helpers/accessibility-helpers';
import fs from 'fs/promises';
import path from 'path';

// Key pages to audit
const KEY_PAGES = [
  '/',                          // Home page
  '/learning-paths',            // Learning paths
  '/channel/1',                 // Question viewer
  '/coding',                    // Coding challenges
  '/certifications',            // Certifications
  '/bookmarks',                 // Bookmarks
  '/review',                    // Review session
  '/stats',                     // Stats page
  '/about',                     // About page
  '/profile',                   // Profile page
];

test.describe('Screen Reader Accessibility Audit - Task 6.1', () => {
  
  // Increase timeout for comprehensive audit
  test.setTimeout(120000); // 2 minutes
  
  test('should run comprehensive audit on all key pages', async ({ page, baseURL }) => {
    const results = new Map<string, any>();
    
    // Audit each page individually with error handling
    for (const pagePath of KEY_PAGES) {
      const url = `${baseURL}${pagePath}`;
      console.log(`\nAuditing: ${url}`);
      
      try {
        await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        // Don't wait for networkidle - it causes timeouts
        await page.waitForTimeout(2000); // Just wait 2 seconds for page to settle
        
        const result = await runAxeAuditEngine(page);
        results.set(url, result);
        console.log(`  ✓ Audited successfully - ${result.violations.length} violations found`);
      } catch (error) {
        console.log(`  ✗ Failed to audit: ${error instanceof Error ? error.message : String(error)}`);
        results.set(url, {
          violations: [],
          passes: [],
          incomplete: [],
          timestamp: new Date().toISOString(),
          url,
          viewport: { width: 1280, height: 720 },
          theme: 'light',
          error: `Failed to audit page: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    // Generate summary
    const summary = generateAuditSummary(results);
    
    // Generate detailed report
    const report = await generateScreenReaderReport(results, summary);
    
    // Save report to file
    const reportPath = path.join(process.cwd(), '.kiro/specs/accessibility-audit/SCREEN_READER_AUDIT_REPORT.md');
    await fs.writeFile(reportPath, report, 'utf-8');
    
    console.log('\n' + '='.repeat(80));
    console.log('SCREEN READER AUDIT COMPLETE');
    console.log('='.repeat(80));
    console.log(`Total Pages Audited: ${summary.totalPages}`);
    console.log(`Total Violations: ${summary.totalViolations}`);
    console.log(`  - Critical: ${summary.critical}`);
    console.log(`  - Serious: ${summary.serious}`);
    console.log(`  - Moderate: ${summary.moderate}`);
    console.log(`  - Minor: ${summary.minor}`);
    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log('='.repeat(80) + '\n');
    
    // This test documents findings - it doesn't fail
    // Fixes will be implemented in Task 6.2
  });
  
  test('should identify elements missing accessible names on home page', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const elementsWithoutNames = await checkAccessibleNames(page);
    
    console.log('\n--- Home Page: Elements Missing Accessible Names ---');
    if (elementsWithoutNames.length === 0) {
      console.log('✓ All interactive elements have accessible names');
    } else {
      console.log(`✗ Found ${elementsWithoutNames.length} elements without accessible names:`);
      elementsWithoutNames.forEach((html, i) => {
        console.log(`  ${i + 1}. ${html.substring(0, 100)}...`);
      });
    }
  });
  
  test('should identify elements missing accessible names on learning paths', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/learning-paths`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const elementsWithoutNames = await checkAccessibleNames(page);
    
    console.log('\n--- Learning Paths: Elements Missing Accessible Names ---');
    if (elementsWithoutNames.length === 0) {
      console.log('✓ All interactive elements have accessible names');
    } else {
      console.log(`✗ Found ${elementsWithoutNames.length} elements without accessible names:`);
      elementsWithoutNames.forEach((html, i) => {
        console.log(`  ${i + 1}. ${html.substring(0, 100)}...`);
      });
    }
  });
  
  test('should identify elements missing accessible names on question viewer', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/channel/1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const elementsWithoutNames = await checkAccessibleNames(page);
    
    console.log('\n--- Question Viewer: Elements Missing Accessible Names ---');
    if (elementsWithoutNames.length === 0) {
      console.log('✓ All interactive elements have accessible names');
    } else {
      console.log(`✗ Found ${elementsWithoutNames.length} elements without accessible names:`);
      elementsWithoutNames.forEach((html, i) => {
        console.log(`  ${i + 1}. ${html.substring(0, 100)}...`);
      });
    }
  });
  
  test('should identify elements missing accessible names on coding challenges', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/coding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const elementsWithoutNames = await checkAccessibleNames(page);
    
    console.log('\n--- Coding Challenges: Elements Missing Accessible Names ---');
    if (elementsWithoutNames.length === 0) {
      console.log('✓ All interactive elements have accessible names');
    } else {
      console.log(`✗ Found ${elementsWithoutNames.length} elements without accessible names:`);
      elementsWithoutNames.forEach((html, i) => {
        console.log(`  ${i + 1}. ${html.substring(0, 100)}...`);
      });
    }
  });
  
  test('should check for missing ARIA attributes on custom components', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    console.log('\n--- Custom Components ARIA Audit ---');
    
    // Check BottomSheet components
    const bottomSheets = await page.locator('[data-component="BottomSheet"]').count();
    console.log(`\nBottomSheet components found: ${bottomSheets}`);
    
    if (bottomSheets > 0) {
      for (let i = 0; i < bottomSheets; i++) {
        const sheet = page.locator('[data-component="BottomSheet"]').nth(i);
        const role = await sheet.getAttribute('role');
        const ariaModal = await sheet.getAttribute('aria-modal');
        
        console.log(`  BottomSheet ${i + 1}:`);
        console.log(`    - role: ${role || 'MISSING'}`);
        console.log(`    - aria-modal: ${ariaModal || 'MISSING'}`);
      }
    }
    
    // Check FloatingButton components
    const floatingButtons = await page.locator('[data-component="FloatingButton"]').count();
    console.log(`\nFloatingButton components found: ${floatingButtons}`);
    
    if (floatingButtons > 0) {
      for (let i = 0; i < floatingButtons; i++) {
        const button = page.locator('[data-component="FloatingButton"]').nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        console.log(`  FloatingButton ${i + 1}:`);
        console.log(`    - aria-label: ${ariaLabel || 'MISSING'}`);
        console.log(`    - text content: ${textContent?.trim() || 'NONE'}`);
        console.log(`    - has accessible name: ${ariaLabel || textContent?.trim() ? 'YES' : 'NO'}`);
      }
    }
    
    // Check SwipeableCard components
    const swipeableCards = await page.locator('[data-component="SwipeableCard"]').count();
    console.log(`\nSwipeableCard components found: ${swipeableCards}`);
    
    if (swipeableCards > 0) {
      for (let i = 0; i < swipeableCards; i++) {
        const card = page.locator('[data-component="SwipeableCard"]').nth(i);
        const role = await card.getAttribute('role');
        const ariaLabel = await card.getAttribute('aria-label');
        
        console.log(`  SwipeableCard ${i + 1}:`);
        console.log(`    - role: ${role || 'MISSING'}`);
        console.log(`    - aria-label: ${ariaLabel || 'MISSING'}`);
      }
    }
    
    // Check SkeletonLoader components
    const skeletonLoaders = await page.locator('[data-component="SkeletonLoader"]').count();
    console.log(`\nSkeletonLoader components found: ${skeletonLoaders}`);
    
    if (skeletonLoaders > 0) {
      for (let i = 0; i < skeletonLoaders; i++) {
        const loader = page.locator('[data-component="SkeletonLoader"]').nth(i);
        const ariaBusy = await loader.getAttribute('aria-busy');
        const ariaLabel = await loader.getAttribute('aria-label');
        
        console.log(`  SkeletonLoader ${i + 1}:`);
        console.log(`    - aria-busy: ${ariaBusy || 'MISSING'}`);
        console.log(`    - aria-label: ${ariaLabel || 'MISSING'}`);
      }
    }
  });
  
  test('should check for images missing alt text', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const imagesWithoutAlt = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images
        .filter(img => !img.hasAttribute('alt'))
        .map(img => ({
          src: img.src,
          html: img.outerHTML.substring(0, 100)
        }));
    });
    
    console.log('\n--- Home Page: Images Missing Alt Text ---');
    if (imagesWithoutAlt.length === 0) {
      console.log('✓ All images have alt attributes');
    } else {
      console.log(`✗ Found ${imagesWithoutAlt.length} images without alt text:`);
      imagesWithoutAlt.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.src}`);
        console.log(`     ${img.html}...`);
      });
    }
  });
  
  test('should run axe-core audit on home page', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const result = await runAxeAuditEngine(page);
    
    console.log('\n--- Home Page: Axe-Core Audit Results ---');
    console.log(`Total Violations: ${result.violations.length}`);
    
    if (result.violations.length > 0) {
      const grouped = groupViolationsByImpact(result.violations);
      
      console.log(`  - Critical: ${grouped.critical.length}`);
      console.log(`  - Serious: ${grouped.serious.length}`);
      console.log(`  - Moderate: ${grouped.moderate.length}`);
      console.log(`  - Minor: ${grouped.minor.length}`);
      
      // Show critical and serious violations
      if (grouped.critical.length > 0) {
        console.log('\nCritical Violations:');
        grouped.critical.forEach(v => {
          console.log(`  - ${v.id}: ${v.description}`);
          console.log(`    Help: ${v.help}`);
          console.log(`    Affected elements: ${v.nodes.length}`);
        });
      }
      
      if (grouped.serious.length > 0) {
        console.log('\nSerious Violations:');
        grouped.serious.forEach(v => {
          console.log(`  - ${v.id}: ${v.description}`);
          console.log(`    Help: ${v.help}`);
          console.log(`    Affected elements: ${v.nodes.length}`);
        });
      }
    } else {
      console.log('✓ No violations found');
    }
  });
  
  test('should run custom checks on home page', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const results = await runCustomChecks(page);
    
    console.log('\n--- Home Page: Custom Accessibility Checks ---');
    results.forEach(result => {
      const status = result.passed ? '✓' : '✗';
      console.log(`${status} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      
      if (!result.passed) {
        if (result.message) {
          console.log(`  Message: ${result.message}`);
        }
        if (result.violations && Array.isArray(result.violations)) {
          console.log(`  Violations: ${result.violations.length}`);
          if (result.violations.length > 0 && result.violations.length <= 5) {
            result.violations.forEach((v: any, i: number) => {
              if (typeof v === 'string') {
                console.log(`    ${i + 1}. ${v.substring(0, 80)}...`);
              } else if (v.html) {
                console.log(`    ${i + 1}. ${v.html.substring(0, 80)}...`);
              }
            });
          }
        }
      }
    });
  });
});

// Helper function to group violations by impact
function groupViolationsByImpact(violations: any[]) {
  return {
    critical: violations.filter(v => v.impact === 'critical'),
    serious: violations.filter(v => v.impact === 'serious'),
    moderate: violations.filter(v => v.impact === 'moderate'),
    minor: violations.filter(v => v.impact === 'minor')
  };
}

// Helper function to generate comprehensive report
async function generateScreenReaderReport(
  results: Map<string, any>,
  summary: any
): Promise<string> {
  let report = '# Screen Reader Accessibility Audit Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Task:** 6.1 - Run audit to identify screen reader issues\n\n`;
  report += `**Requirements:** 1.1 (Accessible Names), 1.2 (ARIA Attributes), 1.5 (Alt Text)\n\n`;
  
  report += '## Executive Summary\n\n';
  report += `- **Total Pages Audited:** ${summary.totalPages}\n`;
  report += `- **Total Violations:** ${summary.totalViolations}\n`;
  report += `- **Critical:** ${summary.critical}\n`;
  report += `- **Serious:** ${summary.serious}\n`;
  report += `- **Moderate:** ${summary.moderate}\n`;
  report += `- **Minor:** ${summary.minor}\n\n`;
  
  report += '## Findings by Page\n\n';
  
  for (const [url, result] of results) {
    const pageName = url.split('/').pop() || 'Home';
    report += `### ${pageName} (${url})\n\n`;
    
    if (result.error) {
      report += `**Error:** ${result.error}\n\n`;
      continue;
    }
    
    report += `**Violations:** ${result.violations.length}\n\n`;
    
    if (result.violations.length > 0) {
      const grouped = groupViolationsByImpact(result.violations);
      
      if (grouped.critical.length > 0) {
        report += '#### Critical Issues\n\n';
        grouped.critical.forEach((v: any) => {
          report += `- **${v.id}**: ${v.description}\n`;
          report += `  - Help: ${v.help}\n`;
          report += `  - Learn more: ${v.helpUrl}\n`;
          report += `  - Affected elements: ${v.nodes.length}\n`;
          if (v.nodes.length > 0 && v.nodes.length <= 3) {
            v.nodes.forEach((node: any, i: number) => {
              report += `    ${i + 1}. \`${node.target.join(' > ')}\`\n`;
            });
          }
          report += '\n';
        });
      }
      
      if (grouped.serious.length > 0) {
        report += '#### Serious Issues\n\n';
        grouped.serious.forEach((v: any) => {
          report += `- **${v.id}**: ${v.description}\n`;
          report += `  - Help: ${v.help}\n`;
          report += `  - Learn more: ${v.helpUrl}\n`;
          report += `  - Affected elements: ${v.nodes.length}\n`;
          if (v.nodes.length > 0 && v.nodes.length <= 3) {
            v.nodes.forEach((node: any, i: number) => {
              report += `    ${i + 1}. \`${node.target.join(' > ')}\`\n`;
            });
          }
          report += '\n';
        });
      }
      
      if (grouped.moderate.length > 0) {
        report += '#### Moderate Issues\n\n';
        grouped.moderate.forEach((v: any) => {
          report += `- **${v.id}**: ${v.description}\n`;
          report += `  - Affected elements: ${v.nodes.length}\n`;
        });
        report += '\n';
      }
      
      if (grouped.minor.length > 0) {
        report += '#### Minor Issues\n\n';
        grouped.minor.forEach((v: any) => {
          report += `- **${v.id}**: ${v.description}\n`;
          report += `  - Affected elements: ${v.nodes.length}\n`;
        });
        report += '\n';
      }
    } else {
      report += '✓ No violations found on this page.\n\n';
    }
  }
  
  report += '## Recommendations\n\n';
  report += 'Based on the audit findings, the following actions are recommended:\n\n';
  report += '1. **Fix Critical Issues First**: Address all critical violations as they severely impact screen reader users\n';
  report += '2. **Add Accessible Names**: Ensure all interactive elements have proper aria-label or text content\n';
  report += '3. **Add ARIA Attributes**: Add proper ARIA roles and attributes to custom components\n';
  report += '4. **Add Alt Text**: Ensure all images have appropriate alt attributes\n';
  report += '5. **Test with Screen Readers**: Manually test with VoiceOver, NVDA, or TalkBack after fixes\n\n';
  
  report += '## Next Steps\n\n';
  report += 'Task 6.2 will implement fixes for all identified issues.\n\n';
  
  return report;
}
