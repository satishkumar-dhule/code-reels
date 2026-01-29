/**
 * Helper Utilities Verification Test
 * 
 * Task 5 Checkpoint - Verify all helper utilities work correctly
 * Tests viewport, safe area, and touch target helpers on a controlled test page
 */

import { test, expect } from '@playwright/test';
import {
  IPHONE13_STANDARDS,
  isInSafeArea,
  checkSafeAreaViolations,
  getTouchTargetSize,
  checkTouchTargets,
} from './helpers/iphone13-helpers';
import {
  isElementInViewport,
  getElementBounds,
  isElementClipped,
  checkHorizontalOverflow,
  getVisibleAreaPercentage,
} from './helpers/viewport-helpers';

test.describe('Helper Utilities Verification - Task 5 Checkpoint', () => {
  test.use({
    viewport: IPHONE13_STANDARDS.viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  test('Viewport helpers work correctly', async ({ page }) => {
    // Create a controlled test page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .in-viewport { 
              position: absolute; 
              top: 100px; 
              left: 50px; 
              width: 200px; 
              height: 100px; 
              background: blue; 
            }
            .clipped-right { 
              position: absolute; 
              top: 200px; 
              left: 350px; 
              width: 100px; 
              height: 50px; 
              background: red; 
            }
            .clipped-bottom { 
              position: absolute; 
              top: 800px; 
              left: 50px; 
              width: 200px; 
              height: 100px; 
              background: green; 
            }
            .overflow-element {
              position: absolute;
              top: 300px;
              left: 0;
              width: 500px;
              height: 50px;
              background: yellow;
            }
          </style>
        </head>
        <body>
          <div class="in-viewport" id="in-viewport">In Viewport</div>
          <div class="clipped-right" id="clipped-right">Clipped Right</div>
          <div class="clipped-bottom" id="clipped-bottom">Clipped Bottom</div>
          <div class="overflow-element" id="overflow">Overflow</div>
        </body>
      </html>
    `);

    // Test isElementInViewport
    const inViewport = await isElementInViewport(page, '#in-viewport');
    expect(inViewport).toBe(true);

    const clippedRight = await isElementInViewport(page, '#clipped-right');
    expect(clippedRight).toBe(false);

    const clippedBottom = await isElementInViewport(page, '#clipped-bottom');
    expect(clippedBottom).toBe(false);

    // Test getElementBounds
    const bounds = await getElementBounds(page, '#in-viewport');
    expect(bounds).not.toBeNull();
    expect(Math.round(bounds?.x || 0)).toBe(50);
    expect(Math.round(bounds?.y || 0)).toBe(100);
    expect(Math.round(bounds?.width || 0)).toBe(200);
    expect(Math.round(bounds?.height || 0)).toBe(100);

    // Test isElementClipped
    const isClipped = await isElementClipped(page, '#clipped-right', IPHONE13_STANDARDS.viewport);
    expect(isClipped).toBe(true);

    const notClipped = await isElementClipped(page, '#in-viewport', IPHONE13_STANDARDS.viewport);
    expect(notClipped).toBe(false);

    // Test checkHorizontalOverflow
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow.hasOverflow).toBe(true);
    expect(overflow.elements.length).toBeGreaterThan(0);

    // Test getVisibleAreaPercentage
    const visiblePercentage = await getVisibleAreaPercentage(page, '#in-viewport');
    expect(visiblePercentage).toBe(100);

    const partiallyVisible = await getVisibleAreaPercentage(page, '#clipped-bottom');
    expect(partiallyVisible).toBeLessThan(100);
    expect(partiallyVisible).toBeGreaterThan(0);

    console.log('✅ All viewport helpers working correctly');
  });

  test('Safe area helpers work correctly', async ({ page }) => {
    // Create a test page with elements in different zones
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .in-notch { 
              position: absolute; 
              top: 10px; 
              left: 50px; 
              width: 200px; 
              height: 30px; 
              background: red; 
            }
            .in-safe-area { 
              position: absolute; 
              top: 100px; 
              left: 50px; 
              width: 200px; 
              height: 100px; 
              background: green; 
            }
            .in-home-indicator { 
              position: absolute; 
              top: 820px; 
              left: 50px; 
              width: 200px; 
              height: 30px; 
              background: red; 
            }
          </style>
        </head>
        <body>
          <button class="in-notch" id="in-notch">In Notch Area</button>
          <button class="in-safe-area" id="in-safe">In Safe Area</button>
          <button class="in-home-indicator" id="in-home">In Home Indicator</button>
        </body>
      </html>
    `);

    // Test isInSafeArea
    const notchElement = await isInSafeArea(page, '#in-notch');
    expect(notchElement).toBe(false);

    const safeElement = await isInSafeArea(page, '#in-safe');
    expect(safeElement).toBe(true);

    const homeElement = await isInSafeArea(page, '#in-home');
    expect(homeElement).toBe(false);

    // Test checkSafeAreaViolations
    const violations = await checkSafeAreaViolations(page);
    expect(violations.length).toBeGreaterThanOrEqual(2); // At least notch and home indicator violations

    const notchViolations = violations.filter(v => v.description.includes('notch'));
    expect(notchViolations.length).toBeGreaterThanOrEqual(1);

    const homeViolations = violations.filter(v => v.description.includes('home indicator'));
    expect(homeViolations.length).toBeGreaterThanOrEqual(1);

    console.log('✅ All safe area helpers working correctly');
  });

  test('Touch target helpers work correctly', async ({ page }) => {
    // Create a test page with various button sizes
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .tiny { width: 20px; height: 20px; }
            .small { width: 35px; height: 35px; }
            .good { width: 50px; height: 50px; }
            .perfect { width: 44px; height: 44px; }
          </style>
        </head>
        <body>
          <button class="tiny" id="tiny">Tiny</button>
          <button class="small" id="small">Small</button>
          <button class="good" id="good">Good</button>
          <button class="perfect" id="perfect">Perfect</button>
        </body>
      </html>
    `);

    // Test getTouchTargetSize
    const tinySize = await getTouchTargetSize(page, '#tiny');
    expect(tinySize).not.toBeNull();
    expect(Math.round(tinySize?.width || 0)).toBe(20);
    expect(Math.round(tinySize?.height || 0)).toBe(20);

    const goodSize = await getTouchTargetSize(page, '#good');
    expect(goodSize).not.toBeNull();
    expect(Math.round(goodSize?.width || 0)).toBe(50);
    expect(Math.round(goodSize?.height || 0)).toBe(50);

    // Test checkTouchTargets
    const issues = await checkTouchTargets(page, IPHONE13_STANDARDS.minTouchTarget);
    
    // Should find 2 issues: tiny (20x20) and small (35x35)
    expect(issues.length).toBe(2);

    // Verify severity levels
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    expect(criticalIssues.length).toBe(1); // Tiny button < 30px

    const highIssues = issues.filter(i => i.severity === 'high');
    expect(highIssues.length).toBe(1); // Small button < 44px

    // Verify measurements are included
    for (const issue of issues) {
      expect(issue.measurements.expected).toBe(44);
      expect(issue.measurements.actual).toBeDefined();
      expect(issue.measurements.bounds).toBeDefined();
    }

    console.log('✅ All touch target helpers working correctly');
  });

  test('All helpers work together on a realistic page', async ({ page }) => {
    // Create a more realistic test page
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: system-ui;
            }
            .header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 60px;
              background: #333;
              color: white;
              display: flex;
              align-items: center;
              padding: 0 20px;
              z-index: 100;
            }
            .content {
              margin-top: 60px;
              padding: 20px;
            }
            .button-good {
              width: 150px;
              height: 48px;
              margin: 10px 0;
              background: blue;
              color: white;
              border: none;
              border-radius: 8px;
            }
            .button-small {
              width: 80px;
              height: 32px;
              margin: 10px 0;
              background: red;
              color: white;
              border: none;
              border-radius: 4px;
            }
            .footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 70px;
              background: #333;
              display: flex;
              justify-content: space-around;
              align-items: center;
            }
            .footer button {
              width: 60px;
              height: 60px;
              background: #555;
              border: none;
              border-radius: 8px;
              color: white;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="font-size: 18px; margin: 0;">Test App</h1>
          </div>
          <div class="content">
            <h2>Welcome</h2>
            <p>This is a test page to verify all helpers work correctly.</p>
            <button class="button-good">Good Button</button>
            <button class="button-small">Small</button>
          </div>
          <div class="footer">
            <button>Home</button>
            <button>Search</button>
            <button>Profile</button>
          </div>
        </body>
      </html>
    `);

    await page.waitForTimeout(100);

    // Test viewport compliance (check that visible elements are in viewport)
    // Note: Content may extend beyond viewport due to scrolling, which is normal
    const headerBounds = await getElementBounds(page, '.header');
    expect(headerBounds).not.toBeNull();
    expect(headerBounds?.y).toBe(0); // Header should be at top

    // Test safe area (header should be in notch area, footer in home indicator area)
    const safeAreaViolations = await checkSafeAreaViolations(page);
    console.log(`Found ${safeAreaViolations.length} safe area violations`);
    
    // Header and footer buttons should violate safe area
    const headerViolations = safeAreaViolations.filter(v => v.description.includes('notch'));
    const footerViolations = safeAreaViolations.filter(v => v.description.includes('home indicator'));
    
    expect(headerViolations.length).toBeGreaterThan(0);
    expect(footerViolations.length).toBeGreaterThan(0);

    // Test touch targets
    const touchIssues = await checkTouchTargets(page);
    console.log(`Found ${touchIssues.length} touch target issues`);
    
    // Small button should be flagged
    const smallButtonIssues = touchIssues.filter(i => i.element.includes('button-small'));
    expect(smallButtonIssues.length).toBeGreaterThan(0);

    // Test horizontal overflow (may have some overflow due to fixed positioning)
    const overflow = await checkHorizontalOverflow(page);
    console.log(`Overflow detected: ${overflow.hasOverflow}, elements: ${overflow.elements.length}`);

    console.log('✅ All helpers work together correctly on realistic page');
  });

  test('Helpers handle edge cases gracefully', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 20px; }
            .hidden { display: none; }
          </style>
        </head>
        <body>
          <button class="hidden" id="hidden">Hidden</button>
          <button id="normal">Normal</button>
        </body>
      </html>
    `);

    // Test with non-existent element
    const nonExistent = await isElementInViewport(page, '#does-not-exist');
    expect(nonExistent).toBe(true); // Should return true (skip check)

    const nonExistentBounds = await getElementBounds(page, '#does-not-exist');
    expect(nonExistentBounds).toBeNull();

    const nonExistentSize = await getTouchTargetSize(page, '#does-not-exist');
    expect(nonExistentSize).toBeNull();

    // Test with hidden element
    const hiddenBounds = await getElementBounds(page, '#hidden');
    expect(hiddenBounds).toBeNull(); // Hidden elements have no bounding box

    console.log('✅ All helpers handle edge cases gracefully');
  });
});
