/**
 * Audit Engine Test
 * 
 * Tests for the accessibility audit engine methods.
 * Validates Requirements 10.1 and 12.1.
 */

import { test, expect } from '@playwright/test';
import {
  runAxeAuditEngine,
  runCustomChecks,
  auditAllPages,
  generateAuditSummary
} from './helpers/accessibility-helpers';

test.describe('Accessibility Audit Engine', () => {
  test.skip('runAxeAuditEngine should return structured audit results', async ({ page }) => {
    await page.goto('/');
    
    const result = await runAxeAuditEngine(page);
    
    // Verify structure
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('passes');
    expect(result).toHaveProperty('incomplete');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('viewport');
    expect(result).toHaveProperty('theme');
    
    // Verify types
    expect(Array.isArray(result.violations)).toBe(true);
    expect(Array.isArray(result.passes)).toBe(true);
    expect(Array.isArray(result.incomplete)).toBe(true);
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.url).toBe('string');
    expect(result.theme).toMatch(/^(light|dark)$/);
    
    // Verify viewport
    expect(result.viewport).toHaveProperty('width');
    expect(result.viewport).toHaveProperty('height');
    expect(typeof result.viewport.width).toBe('number');
    expect(typeof result.viewport.height).toBe('number');
    
    console.log(`Audit completed: ${result.violations.length} violations, ${result.passes.length} passes`);
  });
  
  test('runAxeAuditEngine should detect violations', async ({ page }) => {
    // Create a page with known accessibility issues
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <button>Button without accessible name</button>
          <img src="test.jpg" />
          <div onclick="alert('click')">Clickable div</div>
        </body>
      </html>
    `);
    
    const result = await runAxeAuditEngine(page);
    
    // Should have some violations
    expect(result.violations.length).toBeGreaterThan(0);
    
    // Each violation should have required properties
    for (const violation of result.violations) {
      expect(violation).toHaveProperty('id');
      expect(violation).toHaveProperty('impact');
      expect(violation).toHaveProperty('description');
      expect(violation).toHaveProperty('help');
      expect(violation).toHaveProperty('helpUrl');
      expect(violation).toHaveProperty('nodes');
      expect(Array.isArray(violation.nodes)).toBe(true);
      
      // Verify impact is valid
      expect(['critical', 'serious', 'moderate', 'minor']).toContain(violation.impact);
    }
  });
  
  test.skip('runCustomChecks should execute all custom checks', async ({ page }) => {
    await page.goto('/');
    
    const results = await runCustomChecks(page);
    
    // Should have all 4 custom checks
    expect(results.length).toBe(4);
    
    // Verify check IDs
    const checkIds = results.map(r => r.id);
    expect(checkIds).toContain('touch-target-size');
    expect(checkIds).toContain('keyboard-navigation');
    expect(checkIds).toContain('focus-visible');
    expect(checkIds).toContain('reduced-motion');
    
    // Each check should have required properties
    for (const check of results) {
      expect(check).toHaveProperty('id');
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('passed');
      expect(typeof check.passed).toBe('boolean');
    }
    
    console.log('Custom checks results:');
    for (const check of results) {
      console.log(`  ${check.name}: ${check.passed ? 'PASS' : 'FAIL'}`);
    }
  });
  
  test.skip('auditAllPages should audit multiple pages', async ({ page }) => {
    const urls = ['/', '/about'];
    
    const results = await auditAllPages(page, urls);
    
    // Should have results for all URLs
    expect(results.size).toBe(urls.length);
    
    // Each result should be a valid AuditResult
    for (const [url, result] of results) {
      // URL in result will be full URL (http://localhost:5001/), not relative
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('passes');
      expect(result).toHaveProperty('timestamp');
      // Just check that URL contains the path we requested
      const matchesPath = urls.some(requestedUrl => result.url.endsWith(requestedUrl));
      expect(matchesPath).toBe(true);
    }
  });
  
  test('generateAuditSummary should aggregate results correctly', async ({ page }) => {
    const urls = ['/'];
    const results = await auditAllPages(page, urls);
    
    const summary = generateAuditSummary(results);
    
    // Verify summary structure
    expect(summary).toHaveProperty('totalPages');
    expect(summary).toHaveProperty('totalViolations');
    expect(summary).toHaveProperty('critical');
    expect(summary).toHaveProperty('serious');
    expect(summary).toHaveProperty('moderate');
    expect(summary).toHaveProperty('minor');
    expect(summary).toHaveProperty('pageResults');
    
    // Verify counts
    expect(summary.totalPages).toBe(urls.length);
    expect(typeof summary.totalViolations).toBe('number');
    expect(typeof summary.critical).toBe('number');
    expect(typeof summary.serious).toBe('number');
    expect(typeof summary.moderate).toBe('number');
    expect(typeof summary.minor).toBe('number');
    
    // Verify severity counts add up
    const severityTotal = summary.critical + summary.serious + summary.moderate + summary.minor;
    expect(severityTotal).toBe(summary.totalViolations);
    
    console.log('Audit Summary:');
    console.log(`  Total Pages: ${summary.totalPages}`);
    console.log(`  Total Violations: ${summary.totalViolations}`);
    console.log(`  Critical: ${summary.critical}`);
    console.log(`  Serious: ${summary.serious}`);
    console.log(`  Moderate: ${summary.moderate}`);
    console.log(`  Minor: ${summary.minor}`);
  });
  
  test.skip('audit engine should handle errors gracefully', async ({ page }) => {
    // Test with an invalid URL that will cause a navigation error
    // For a static site, non-existent pages might just show 404 content
    // So let's test the error handling by checking that the audit still completes
    const testPath = '/non-existent-page-12345';
    const results = await auditAllPages(page, [testPath]);
    
    expect(results.size).toBe(1);
    
    // Get the result - the key will be the full URL
    const result = Array.from(results.values())[0];
    expect(result).toBeDefined();
    
    // The audit should complete even if the page doesn't exist
    // It might have an error, or it might just audit the 404 page
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('passes');
    expect(result).toHaveProperty('timestamp');
    
    console.log(`Audit result for non-existent page: ${result.error || 'No error - audited 404 page'}`);
  });
});
