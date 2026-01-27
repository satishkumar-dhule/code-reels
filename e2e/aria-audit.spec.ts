/**
 * ARIA Implementation Audit
 * 
 * Task 10.1: Run ARIA audit on all pages
 * 
 * This test suite audits ARIA implementation across all pages:
 * - Missing or incorrect ARIA attributes (Requirement 4.5)
 * - Improper landmark usage (Requirement 4.3)
 * - Missing ARIA state attributes (Requirement 4.4)
 * 
 * All auditing happens at BUILD TIME via Playwright tests.
 */

import { test, expect } from '@playwright/test';
import {
  runAxeAuditEngine,
  checkLandmarks,
  waitForPageStable
} from './helpers/accessibility-helpers';
import fs from 'fs/promises';
import path from 'path';

// Key pages to audit for ARIA implementation
const KEY_PAGES = [
  '/',
  '/learning-paths',
  '/channel/1',
  '/coding',
  '/certifications',
  '/bookmarks',
  '/review',
  '/stats',
  '/about',
  '/profile',
];

test.describe('ARIA Implementation Audit - Task 10.1', () => {
  
  test.setTimeout(120000); // 2 minutes
  
  test('should audit ARIA implementation on all key pages', async ({ page, baseURL }) => {
    const results = new Map<string, any>();
    
    for (const pagePath of KEY_PAGES) {
      const url = `${baseURL}${pagePath}`;
      console.log(`\nAuditing ARIA on: ${url}`);
      
      try {
        await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        
        // Run axe-core audit focusing on ARIA rules
        const axeResult = await runAxeAuditEngine(page, {
          tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        });
        
        // Check landmarks
        const landmarks = await checkLandmarks(page);
        
        // Check for ARIA state attributes on stateful elements
        const stateAttributeIssues = await checkARIAStateAttributes(page);
        
        // Check for proper ARIA roles
        const roleIssues = await checkARIARoles(page);
        
        results.set(url, {
          axeResult,
          landmarks,
          stateAttributeIssues,
          roleIssues
        });
        
        console.log(`  ✓ ARIA audit complete`);
        console.log(`    - Axe violations: ${axeResult.violations.length}`);
        console.log(`    - Landmarks: nav=${landmarks.hasNav}, main=${landmarks.hasMain}, footer=${landmarks.hasFooter}`);
        console.log(`    - State attribute issues: ${stateAttributeIssues.length}`);
        console.log(`    - Role issues: ${roleIssues.length}`);
        
      } catch (error) {
        console.log(`  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`);
        results.set(url, {
          error: `Failed to audit: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
    
    // Generate report
    const report = await generateARIAReport(results);
    
    // Save report
    const reportPath = path.join(process.cwd(), '.kiro/specs/accessibility-audit/ARIA_AUDIT_REPORT.md');
    await fs.writeFile(reportPath, report, 'utf-8');
    
    console.log('\n' + '='.repeat(80));
    console.log('ARIA IMPLEMENTATION AUDIT COMPLETE');
    console.log('='.repeat(80));
    console.log(`Report saved to: ${reportPath}`);
    console.log('='.repeat(80) + '\n');
  });

  
  test('should check landmark roles on home page', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const landmarks = await checkLandmarks(page);
    
    console.log('\n--- Home Page: Landmark Roles ---');
    console.log(`  Navigation landmark: ${landmarks.hasNav ? '✓ Present' : '✗ Missing'}`);
    console.log(`  Main landmark: ${landmarks.hasMain ? '✓ Present' : '✗ Missing'}`);
    console.log(`  Footer landmark: ${landmarks.hasFooter ? '✓ Present' : '✗ Missing'}`);
    console.log(`  Complementary landmark: ${landmarks.hasAside ? '✓ Present' : '✗ Missing'}`);
    
    // Document findings but don't fail - fixes in Task 10.2
  });
  
  test('should check ARIA state attributes on stateful elements', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const issues = await checkARIAStateAttributes(page);
    
    console.log('\n--- Home Page: ARIA State Attributes ---');
    if (issues.length === 0) {
      console.log('✓ All stateful elements have appropriate ARIA state attributes');
    } else {
      console.log(`✗ Found ${issues.length} elements with missing/incorrect state attributes:`);
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.type}: ${issue.element.substring(0, 80)}...`);
        console.log(`     Issue: ${issue.issue}`);
      });
    }
  });
  
  test('should check ARIA roles on interactive elements', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const issues = await checkARIARoles(page);
    
    console.log('\n--- Home Page: ARIA Roles ---');
    if (issues.length === 0) {
      console.log('✓ All elements have appropriate ARIA roles');
    } else {
      console.log(`✗ Found ${issues.length} elements with role issues:`);
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.element.substring(0, 80)}...`);
        console.log(`     Issue: ${issue.issue}`);
      });
    }
  });

  
  test.skip('should check for ARIA violations using axe-core', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    const result = await runAxeAuditEngine(page);
    
    // Filter for ARIA-specific violations
    const ariaViolations = result.violations.filter(v => 
      v.id.includes('aria') || 
      v.id.includes('landmark') ||
      v.id.includes('role')
    );
    
    console.log('\n--- Home Page: ARIA-Specific Violations ---');
    console.log(`Total ARIA violations: ${ariaViolations.length}`);
    
    if (ariaViolations.length > 0) {
      ariaViolations.forEach(v => {
        console.log(`\n  ${v.id} (${v.impact}):`);
        console.log(`    Description: ${v.description}`);
        console.log(`    Help: ${v.help}`);
        console.log(`    Affected elements: ${v.nodes.length}`);
        
        if (v.nodes.length <= 3) {
          v.nodes.forEach((node, i) => {
            console.log(`      ${i + 1}. ${node.target.join(' > ')}`);
          });
        }
      });
    } else {
      console.log('✓ No ARIA violations found');
    }
  });
});

// Helper function to check ARIA state attributes
async function checkARIAStateAttributes(page: any) {
  return await page.evaluate(() => {
    const issues: Array<{ type: string; element: string; issue: string }> = [];
    
    // Check expandable elements for aria-expanded
    const expandableElements = document.querySelectorAll(
      'button[class*="expand"], button[class*="collapse"], button[class*="accordion"], [class*="dropdown"]'
    );
    expandableElements.forEach(el => {
      if (!el.hasAttribute('aria-expanded')) {
        issues.push({
          type: 'Expandable element',
          element: el.outerHTML,
          issue: 'Missing aria-expanded attribute'
        });
      }
    });
    
    // Check toggle buttons for aria-pressed
    const toggleButtons = document.querySelectorAll(
      'button[class*="toggle"], button[role="switch"]'
    );
    toggleButtons.forEach(el => {
      if (!el.hasAttribute('aria-pressed') && !el.hasAttribute('aria-checked')) {
        issues.push({
          type: 'Toggle button',
          element: el.outerHTML,
          issue: 'Missing aria-pressed or aria-checked attribute'
        });
      }
    });

    
    // Check selectable items for aria-selected
    const selectableItems = document.querySelectorAll(
      '[role="tab"], [role="option"], [role="gridcell"][class*="select"]'
    );
    selectableItems.forEach(el => {
      if (!el.hasAttribute('aria-selected')) {
        issues.push({
          type: 'Selectable item',
          element: el.outerHTML,
          issue: 'Missing aria-selected attribute'
        });
      }
    });
    
    // Check elements with aria-controls
    const controlElements = document.querySelectorAll('[aria-controls]');
    controlElements.forEach(el => {
      const controlsId = el.getAttribute('aria-controls');
      if (controlsId && !document.getElementById(controlsId)) {
        issues.push({
          type: 'Element with aria-controls',
          element: el.outerHTML,
          issue: `aria-controls references non-existent ID: ${controlsId}`
        });
      }
    });
    
    return issues;
  });
}

// Helper function to check ARIA roles
async function checkARIARoles(page: any) {
  return await page.evaluate(() => {
    const issues: Array<{ element: string; issue: string }> = [];
    
    // Check for divs/spans with click handlers that should be buttons
    const clickableDivs = document.querySelectorAll('div[onclick], span[onclick]');
    clickableDivs.forEach(el => {
      if (!el.hasAttribute('role') || el.getAttribute('role') !== 'button') {
        issues.push({
          element: el.outerHTML,
          issue: 'Clickable div/span without role="button"'
        });
      }
    });
    
    // Check for elements with role="button" that aren't focusable
    const roleButtons = document.querySelectorAll('[role="button"]');
    roleButtons.forEach(el => {
      const tabindex = el.getAttribute('tabindex');
      if (tabindex === '-1' || (tabindex === null && el.tagName !== 'BUTTON')) {
        issues.push({
          element: el.outerHTML,
          issue: 'Element with role="button" is not keyboard focusable'
        });
      }
    });
    
    // Check for proper dialog roles
    const dialogs = document.querySelectorAll('[class*="modal"], [class*="dialog"]');
    dialogs.forEach(el => {
      const role = el.getAttribute('role');
      if (role !== 'dialog' && role !== 'alertdialog') {
        issues.push({
          element: el.outerHTML,
          issue: 'Modal/dialog element without proper role'
        });
      }
    });
    
    return issues;
  });
}


// Helper function to generate ARIA audit report
async function generateARIAReport(results: Map<string, any>): Promise<string> {
  let report = '# ARIA Implementation Audit Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `**Task:** 10.1 - Run ARIA audit on all pages\n\n`;
  report += `**Requirements:** 4.3 (Landmark Roles), 4.4 (State Attributes), 4.5 (ARIA Correctness)\n\n`;
  
  report += '## Executive Summary\n\n';
  
  let totalPages = 0;
  let totalAriaViolations = 0;
  let pagesWithoutNav = 0;
  let pagesWithoutMain = 0;
  let pagesWithoutFooter = 0;
  let totalStateIssues = 0;
  let totalRoleIssues = 0;
  
  for (const [url, result] of results) {
    if (result.error) continue;
    
    totalPages++;
    
    if (result.axeResult) {
      const ariaViolations = result.axeResult.violations.filter((v: any) => 
        v.id.includes('aria') || v.id.includes('landmark') || v.id.includes('role')
      );
      totalAriaViolations += ariaViolations.length;
    }
    
    if (result.landmarks) {
      if (!result.landmarks.hasNav) pagesWithoutNav++;
      if (!result.landmarks.hasMain) pagesWithoutMain++;
      if (!result.landmarks.hasFooter) pagesWithoutFooter++;
    }
    
    if (result.stateAttributeIssues) {
      totalStateIssues += result.stateAttributeIssues.length;
    }
    
    if (result.roleIssues) {
      totalRoleIssues += result.roleIssues.length;
    }
  }
  
  report += `- **Total Pages Audited:** ${totalPages}\n`;
  report += `- **Total ARIA Violations:** ${totalAriaViolations}\n`;
  report += `- **Pages Missing Navigation Landmark:** ${pagesWithoutNav}\n`;
  report += `- **Pages Missing Main Landmark:** ${pagesWithoutMain}\n`;
  report += `- **Pages Missing Footer Landmark:** ${pagesWithoutFooter}\n`;
  report += `- **Total State Attribute Issues:** ${totalStateIssues}\n`;
  report += `- **Total Role Issues:** ${totalRoleIssues}\n\n`;
  
  report += '## Findings by Page\n\n';
  
  for (const [url, result] of results) {
    const pageName = url.split('/').filter(Boolean).pop() || 'Home';
    report += `### ${pageName} (${url})\n\n`;
    
    if (result.error) {
      report += `**Error:** ${result.error}\n\n`;
      continue;
    }
    
    // Landmark findings
    if (result.landmarks) {
      report += '#### Landmark Roles\n\n';
      report += `- Navigation: ${result.landmarks.hasNav ? '✓' : '✗ Missing'}\n`;
      report += `- Main: ${result.landmarks.hasMain ? '✓' : '✗ Missing'}\n`;
      report += `- Footer: ${result.landmarks.hasFooter ? '✓' : '✗ Missing'}\n`;
      report += `- Complementary: ${result.landmarks.hasAside ? '✓' : 'Not required'}\n\n`;
    }

    
    // State attribute issues
    if (result.stateAttributeIssues && result.stateAttributeIssues.length > 0) {
      report += '#### ARIA State Attribute Issues\n\n';
      result.stateAttributeIssues.forEach((issue: any, i: number) => {
        report += `${i + 1}. **${issue.type}**\n`;
        report += `   - Issue: ${issue.issue}\n`;
        report += `   - Element: \`${issue.element.substring(0, 100)}...\`\n\n`;
      });
    }
    
    // Role issues
    if (result.roleIssues && result.roleIssues.length > 0) {
      report += '#### ARIA Role Issues\n\n';
      result.roleIssues.forEach((issue: any, i: number) => {
        report += `${i + 1}. ${issue.issue}\n`;
        report += `   - Element: \`${issue.element.substring(0, 100)}...\`\n\n`;
      });
    }
    
    // Axe-core ARIA violations
    if (result.axeResult && result.axeResult.violations) {
      const ariaViolations = result.axeResult.violations.filter((v: any) => 
        v.id.includes('aria') || v.id.includes('landmark') || v.id.includes('role')
      );
      
      if (ariaViolations.length > 0) {
        report += '#### Axe-Core ARIA Violations\n\n';
        ariaViolations.forEach((v: any) => {
          report += `- **${v.id}** (${v.impact})\n`;
          report += `  - Description: ${v.description}\n`;
          report += `  - Help: ${v.help}\n`;
          report += `  - Affected elements: ${v.nodes.length}\n`;
          if (v.nodes.length <= 3) {
            v.nodes.forEach((node: any, i: number) => {
              report += `    ${i + 1}. \`${node.target.join(' > ')}\`\n`;
            });
          }
          report += '\n';
        });
      }
    }
    
    report += '---\n\n';
  }
  
  report += '## Recommendations\n\n';
  report += 'Based on the ARIA audit findings:\n\n';
  report += '### Task 10.2: Add Landmark Roles\n\n';
  report += '- Add `<nav>` or `role="navigation"` to navigation areas\n';
  report += '- Add `<main>` or `role="main"` to main content areas\n';
  report += '- Add `<footer>` or `role="contentinfo"` to footer areas\n';
  report += '- Add `<aside>` or `role="complementary"` to sidebar areas\n\n';
  report += '### Task 10.4: Add ARIA State Attributes\n\n';
  report += '- Add `aria-expanded` to expandable/collapsible elements\n';
  report += '- Add `aria-pressed` to toggle buttons\n';
  report += '- Add `aria-selected` to selectable items (tabs, options)\n';
  report += '- Ensure state attributes update dynamically with component state\n\n';
  report += '### General ARIA Fixes\n\n';
  report += '- Fix all axe-core ARIA violations\n';
  report += '- Ensure elements with ARIA roles are keyboard accessible\n';
  report += '- Verify aria-controls references exist\n';
  report += '- Replace clickable divs with proper button elements\n\n';
  
  return report;
}
