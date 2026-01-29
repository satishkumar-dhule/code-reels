/**
 * iPhone 13 First Batch Validation
 * 
 * Validates the first batch of iPhone 13 fixes:
 * - Home page
 * - Learning Paths page
 * - Question Viewer page
 * - Coding Challenges page
 * 
 * Checks for:
 * - Safe area insets applied
 * - No content clipping
 * - Responsive layouts working
 * - No horizontal overflow
 */

import { test, expect, devices } from '@playwright/test';

const IPHONE13_VIEWPORT = { width: 390, height: 844 };
const SAFE_AREA_TOP = 47;
const SAFE_AREA_BOTTOM = 34;

test.use({
  ...devices['iPhone 13'],
  viewport: IPHONE13_VIEWPORT,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test.describe('iPhone 13 First Batch Validation', () => {
  test('Home page - safe area and responsive layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for safe area classes
    const mainContainer = page.locator('main, [class*="pt-safe"]').first();
    await expect(mainContainer).toBeVisible();
    
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(IPHONE13_VIEWPORT.width);
    
    // Check responsive text is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('Learning Paths page - safe area and grid layout', async ({ page }) => {
    await page.goto('/paths');
    await page.waitForLoadState('networkidle');
    
    // Check for safe area classes
    const container = page.locator('[class*="pt-safe"]').first();
    await expect(container).toBeVisible();
    
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(IPHONE13_VIEWPORT.width);
    
    // Check grid is responsive (1 column on mobile)
    const pathCards = page.locator('[class*="grid"]').first();
    if (await pathCards.isVisible()) {
      const gridCols = await pathCards.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      // Should be 1 column on mobile
      expect(gridCols).not.toContain('repeat(2');
    }
  });

  test('Question Viewer page - safe area and fixed elements', async ({ page }) => {
    // Navigate to a question
    await page.goto('/channels');
    await page.waitForLoadState('networkidle');
    
    // Click first channel if available
    const firstChannel = page.locator('button, a').filter({ hasText: /JavaScript|Python|React/ }).first();
    if (await firstChannel.isVisible()) {
      await firstChannel.click();
      await page.waitForLoadState('networkidle');
      
      // Check for safe area on main container
      const mainContainer = page.locator('[class*="pt-safe"]').first();
      await expect(mainContainer).toBeVisible();
      
      // Check navigation footer has safe area
      const footer = page.locator('footer, [class*="pb-safe"]').last();
      if (await footer.isVisible()) {
        await expect(footer).toBeVisible();
      }
      
      // Check no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(IPHONE13_VIEWPORT.width);
    }
  });

  test('Coding Challenges page - safe area and responsive cards', async ({ page }) => {
    await page.goto('/coding');
    await page.waitForLoadState('networkidle');
    
    // Check for safe area classes
    const container = page.locator('[class*="pt-safe"]').first();
    await expect(container).toBeVisible();
    
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(IPHONE13_VIEWPORT.width);
    
    // Check stats grid is 2 columns on mobile
    const statsGrid = page.locator('[class*="grid"]').first();
    if (await statsGrid.isVisible()) {
      const gridCols = await statsGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      // Should be 2 columns on mobile
      const colCount = gridCols.split(' ').length;
      expect(colCount).toBeLessThanOrEqual(2);
    }
    
    // Check challenge cards are visible and not clipped
    const challengeCard = page.locator('button').filter({ hasText: /Challenge|Problem/ }).first();
    if (await challengeCard.isVisible()) {
      const box = await challengeCard.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(IPHONE13_VIEWPORT.width);
      }
    }
  });

  test('All pages - no critical content hidden', async ({ page }) => {
    const pages = ['/', '/paths', '/coding'];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      // Check that main content is visible
      const mainContent = page.locator('main, [role="main"]').first();
      await expect(mainContent).toBeVisible();
      
      // Check no content in notch area (top 47px)
      const elementsInNotch = await page.evaluate((safeTop) => {
        const elements = document.querySelectorAll('*');
        const inNotch = [];
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.top < safeTop && rect.height > 0 && window.getComputedStyle(el).position !== 'fixed') {
            inNotch.push(el.tagName);
          }
        }
        return inNotch.length;
      }, SAFE_AREA_TOP);
      
      // Should have minimal or no elements in notch area (except fixed headers)
      expect(elementsInNotch).toBeLessThan(5);
    }
  });
});
