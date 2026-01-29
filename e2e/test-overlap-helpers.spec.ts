/**
 * Test suite for overlap detection helper functions
 * 
 * This test verifies that the overlap detection utilities correctly identify
 * fixed elements that obscure interactive content and properly calculate
 * z-index stacking contexts.
 */

import { test, expect } from '@playwright/test';
import { checkFixedElementOverlap, getZIndexStack, IPHONE13_STANDARDS } from './helpers/iphone13-helpers';

test.describe('Overlap Detection Helpers', () => {
  test.use({
    viewport: IPHONE13_STANDARDS.viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  test('checkFixedElementOverlap - detects fixed header overlapping button', async ({ page }) => {
    // Create a test page with a fixed header overlapping a button
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; height: 2000px; }
            .fixed-header {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 60px;
              background: red;
              z-index: 100;
            }
            .button-under-header {
              position: absolute;
              top: 30px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
            .button-below-header {
              position: absolute;
              top: 100px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
          </style>
        </head>
        <body>
          <div class="fixed-header"></div>
          <button class="button-under-header">Overlapped</button>
          <button class="button-below-header">Not Overlapped</button>
        </body>
      </html>
    `);

    const issues = await checkFixedElementOverlap(page);

    // Should detect the overlapped button
    expect(issues.length).toBeGreaterThan(0);
    
    const overlapIssue = issues.find(issue => 
      issue.description.includes('overlaps') && 
      issue.element.includes('button-under-header')
    );
    
    expect(overlapIssue).toBeDefined();
    expect(overlapIssue?.type).toBe('overlap');
    expect(overlapIssue?.severity).toMatch(/critical|high/);
  });

  test('checkFixedElementOverlap - no false positives for non-overlapping elements', async ({ page }) => {
    // Create a test page with fixed header but no overlaps
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; height: 2000px; }
            .fixed-header {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 60px;
              background: blue;
              z-index: 100;
            }
            .button-safe {
              position: absolute;
              top: 100px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
          </style>
        </head>
        <body>
          <div class="fixed-header"></div>
          <button class="button-safe">Safe Button</button>
        </body>
      </html>
    `);

    const issues = await checkFixedElementOverlap(page);

    // Should not detect any overlaps
    const buttonOverlaps = issues.filter(issue => 
      issue.element.includes('button-safe')
    );
    
    expect(buttonOverlaps.length).toBe(0);
  });

  test('checkFixedElementOverlap - detects fixed footer overlapping content', async ({ page }) => {
    // Create a test page with fixed footer overlapping a link
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; height: 2000px; }
            .fixed-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              width: 100%;
              height: 80px;
              background: green;
              z-index: 50;
            }
            .link-under-footer {
              position: absolute;
              bottom: 40px;
              left: 20px;
              width: 150px;
              height: 44px;
            }
          </style>
        </head>
        <body>
          <a href="#" class="link-under-footer">Overlapped Link</a>
          <div class="fixed-footer"></div>
        </body>
      </html>
    `);

    // Scroll to bottom to see the overlap
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);

    const issues = await checkFixedElementOverlap(page);

    // Should detect the overlapped link
    const overlapIssue = issues.find(issue => 
      issue.description.includes('overlaps') &&
      issue.element.includes('link-under-footer')
    );
    
    expect(overlapIssue).toBeDefined();
    expect(overlapIssue?.type).toBe('overlap');
  });

  test('checkFixedElementOverlap - distinguishes critical vs non-critical overlaps', async ({ page }) => {
    // Create a test page with overlaps of different criticality
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; height: 2000px; }
            .fixed-overlay {
              position: fixed;
              top: 100px;
              left: 0;
              width: 100%;
              height: 200px;
              background: rgba(0,0,0,0.5);
              z-index: 100;
            }
            .critical-button {
              position: absolute;
              top: 150px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
            .decorative-div {
              position: absolute;
              top: 180px;
              left: 200px;
              width: 100px;
              height: 50px;
            }
          </style>
        </head>
        <body>
          <div class="fixed-overlay"></div>
          <button class="critical-button">Critical Action</button>
          <div class="decorative-div">Decorative</div>
        </body>
      </html>
    `);

    const issues = await checkFixedElementOverlap(page);

    // Should detect overlap with critical button
    const criticalIssue = issues.find(issue => 
      issue.element.includes('critical-button')
    );
    
    expect(criticalIssue).toBeDefined();
    expect(criticalIssue?.severity).toMatch(/critical|high/);
    
    // Decorative element overlap should be lower severity or not reported
    const decorativeIssue = issues.find(issue => 
      issue.element.includes('decorative-div')
    );
    
    if (decorativeIssue) {
      expect(decorativeIssue.severity).toMatch(/low|medium/);
    }
  });

  test('checkFixedElementOverlap - calculates overlap percentage', async ({ page }) => {
    // Create a test page with partial overlap
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .fixed-bar {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 50px;
              background: purple;
              z-index: 100;
            }
            .partially-overlapped {
              position: absolute;
              top: 40px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
          </style>
        </head>
        <body>
          <div class="fixed-bar"></div>
          <button class="partially-overlapped">Partial</button>
        </body>
      </html>
    `);

    const issues = await checkFixedElementOverlap(page);

    const overlapIssue = issues.find(issue => 
      issue.element.includes('partially-overlapped')
    );
    
    expect(overlapIssue).toBeDefined();
    expect(overlapIssue?.measurements.actual).toBeDefined();
    expect(overlapIssue?.measurements.actual).toBeGreaterThan(0);
    expect(overlapIssue?.measurements.actual).toBeLessThan(100);
  });

  test('getZIndexStack - returns correct z-index for element', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .low-z { position: relative; z-index: 10; }
            .high-z { position: relative; z-index: 100; }
            .no-z { position: relative; }
          </style>
        </head>
        <body>
          <div class="low-z" id="low">Low Z-Index</div>
          <div class="high-z" id="high">High Z-Index</div>
          <div class="no-z" id="none">No Z-Index</div>
        </body>
      </html>
    `);

    const lowZ = await getZIndexStack(page, '#low');
    const highZ = await getZIndexStack(page, '#high');
    const noZ = await getZIndexStack(page, '#none');

    expect(lowZ).toBe(10);
    expect(highZ).toBe(100);
    expect(noZ).toBe(0);
  });

  test('getZIndexStack - handles stacking context from parent', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .parent { position: relative; z-index: 50; }
            .child { position: relative; z-index: 10; }
          </style>
        </head>
        <body>
          <div class="parent">
            <div class="child" id="child">Child Element</div>
          </div>
        </body>
      </html>
    `);

    const childZ = await getZIndexStack(page, '#child');

    // Child creates its own stacking context, so should return its own z-index
    expect(childZ).toBe(10);
  });

  test('getZIndexStack - handles auto z-index', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            .auto-z { position: relative; z-index: auto; }
          </style>
        </head>
        <body>
          <div class="auto-z" id="auto">Auto Z-Index</div>
        </body>
      </html>
    `);

    const autoZ = await getZIndexStack(page, '#auto');

    expect(autoZ).toBe(0);
  });

  test('checkFixedElementOverlap - ignores invisible fixed elements', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .hidden-fixed {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 60px;
              display: none;
            }
            .button {
              position: absolute;
              top: 30px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
          </style>
        </head>
        <body>
          <div class="hidden-fixed"></div>
          <button class="button">Button</button>
        </body>
      </html>
    `);

    const issues = await checkFixedElementOverlap(page);

    // Should not detect overlaps from hidden elements
    expect(issues.length).toBe(0);
  });

  test('checkFixedElementOverlap - ignores minor overlaps (<10%)', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; }
            .fixed-bar {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 50px;
              background: orange;
              z-index: 100;
            }
            .barely-overlapped {
              position: absolute;
              top: 48px;
              left: 20px;
              width: 100px;
              height: 44px;
            }
          </style>
        </head>
        <body>
          <div class="fixed-bar"></div>
          <button class="barely-overlapped">Barely Overlapped</button>
        </body>
      </html>
    `);

    const issues = await checkFixedElementOverlap(page);

    // Should not report minor overlaps
    const minorOverlap = issues.find(issue => 
      issue.element.includes('barely-overlapped')
    );
    
    expect(minorOverlap).toBeUndefined();
  });
});
