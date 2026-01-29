/**
 * Test Touch Target Helper Functions
 * 
 * Verification test for task 4.1 - Touch target helper functions
 * Tests getTouchTargetSize() and checkTouchTargets() implementations
 */

import { test, expect } from '@playwright/test';
import { getTouchTargetSize, checkTouchTargets, IPHONE13_STANDARDS } from './helpers/iphone13-helpers';

test.describe('Touch Target Helper Functions', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  test('getTouchTargetSize() should measure button dimensions correctly', async ({ page }) => {
    // Create a test page with buttons of known sizes
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .large-button { width: 100px; height: 60px; }
            .small-button { width: 30px; height: 30px; }
            .standard-button { width: 44px; height: 44px; }
          </style>
        </head>
        <body>
          <button class="large-button" id="large">Large Button</button>
          <button class="small-button" id="small">Small</button>
          <button class="standard-button" id="standard">Standard</button>
        </body>
      </html>
    `);

    // Test large button
    const largeSize = await getTouchTargetSize(page, '#large');
    expect(largeSize).not.toBeNull();
    expect(Math.round(largeSize?.width || 0)).toBe(100);
    expect(Math.round(largeSize?.height || 0)).toBe(60);

    // Test small button
    const smallSize = await getTouchTargetSize(page, '#small');
    expect(smallSize).not.toBeNull();
    expect(Math.round(smallSize?.width || 0)).toBe(30);
    expect(Math.round(smallSize?.height || 0)).toBe(30);

    // Test standard button
    const standardSize = await getTouchTargetSize(page, '#standard');
    expect(standardSize).not.toBeNull();
    expect(Math.round(standardSize?.width || 0)).toBe(44);
    expect(Math.round(standardSize?.height || 0)).toBe(44);
  });

  test('getTouchTargetSize() should return null for non-existent elements', async ({ page }) => {
    await page.setContent('<html><body></body></html>');
    
    const size = await getTouchTargetSize(page, '#does-not-exist');
    expect(size).toBeNull();
  });

  test('checkTouchTargets() should identify undersized interactive elements', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .tiny-button { width: 20px; height: 20px; }
            .small-button { width: 35px; height: 35px; }
            .good-button { width: 50px; height: 50px; }
          </style>
        </head>
        <body>
          <button class="tiny-button">Tiny</button>
          <button class="small-button">Small</button>
          <button class="good-button">Good</button>
          <a href="#" style="display: inline-block; width: 30px; height: 30px;">Link</a>
        </body>
      </html>
    `);

    const issues = await checkTouchTargets(page, IPHONE13_STANDARDS.minTouchTarget);

    // Should find 3 issues: tiny button (20x20), small button (35x35), and small link (30x30)
    expect(issues.length).toBeGreaterThanOrEqual(3);

    // Check that all issues are touch-target type
    for (const issue of issues) {
      expect(issue.type).toBe('touch-target');
    }

    // Verify severity levels
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    // Tiny button (20x20) should be critical (< 30px)
    expect(criticalIssues.length).toBeGreaterThanOrEqual(1);

    // Small button (35x35) and link (30x30) should be high (< 44px)
    expect(highIssues.length).toBeGreaterThanOrEqual(2);
  });

  test('checkTouchTargets() should not flag elements meeting minimum size', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            button { width: 50px; height: 50px; margin: 10px; }
            a { display: inline-block; width: 48px; height: 48px; }
          </style>
        </head>
        <body>
          <button>Button 1</button>
          <button>Button 2</button>
          <a href="#">Link</a>
        </body>
      </html>
    `);

    const issues = await checkTouchTargets(page, IPHONE13_STANDARDS.minTouchTarget);

    // Should find no issues since all elements meet minimum size (50x50 and 48x48 are both >= 44)
    expect(issues.length).toBe(0);
  });

  test('checkTouchTargets() should identify various interactive element types', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .small { width: 30px; height: 30px; }
          </style>
        </head>
        <body>
          <button class="small">Button</button>
          <a href="#" class="small" style="display: inline-block;">Link</a>
          <input type="text" class="small" />
          <select class="small"><option>Option</option></select>
          <textarea class="small"></textarea>
          <div role="button" class="small">Role Button</div>
          <div onclick="alert('click')" class="small">Onclick</div>
        </body>
      </html>
    `);

    const issues = await checkTouchTargets(page, IPHONE13_STANDARDS.minTouchTarget);

    // Should find issues for all 7 interactive elements
    expect(issues.length).toBeGreaterThanOrEqual(7);

    // Verify different element types are detected
    const elementTypes = issues.map(i => i.element);
    expect(elementTypes.some(e => e.includes('<button'))).toBe(true);
    expect(elementTypes.some(e => e.includes('<a'))).toBe(true);
    expect(elementTypes.some(e => e.includes('<input'))).toBe(true);
    expect(elementTypes.some(e => e.includes('<select'))).toBe(true);
    expect(elementTypes.some(e => e.includes('<textarea'))).toBe(true);
    expect(elementTypes.some(e => e.includes('role="button"'))).toBe(true);
    expect(elementTypes.some(e => e.includes('onclick'))).toBe(true);
  });

  test('checkTouchTargets() should include proper measurements in issues', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .test-button { width: 32px; height: 28px; }
          </style>
        </head>
        <body>
          <button class="test-button">Test</button>
        </body>
      </html>
    `);

    const issues = await checkTouchTargets(page, 44);

    expect(issues.length).toBeGreaterThanOrEqual(1);

    const issue = issues[0];
    expect(issue.measurements.expected).toBe(44);
    expect(Math.round(issue.measurements.actual || 0)).toBe(28); // Minimum of width (32) and height (28)
    expect(issue.measurements.bounds).toBeDefined();
    expect(Math.round(issue.measurements.bounds?.width || 0)).toBe(32);
    expect(Math.round(issue.measurements.bounds?.height || 0)).toBe(28);
  });

  test('checkTouchTargets() should handle custom minimum size', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .button-40 { width: 40px; height: 40px; }
            .button-50 { width: 50px; height: 50px; }
          </style>
        </head>
        <body>
          <button class="button-40">40px</button>
          <button class="button-50">50px</button>
        </body>
      </html>
    `);

    // Test with custom minimum of 48px
    const issues = await checkTouchTargets(page, 48);

    // Should find 1 issue (40px button), but not the 50px button
    expect(issues.length).toBe(1);
    expect(issues[0].description).toContain('40x40px');
    expect(issues[0].description).toContain('minimum: 48x48px');
  });
});
