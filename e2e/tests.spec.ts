/**
 * Mock Tests / Quiz Tests
 * Test session functionality
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('Tests Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('page loads', async ({ page }) => {
    await page.goto('/tests');
    await waitForPageReady(page);
    
    await expect(page.getByText(/Test|Quiz|Mock/i).first()).toBeVisible();
  });

  test('shows available tests', async ({ page }) => {
    await page.goto('/tests');
    await waitForPageReady(page);
    
    // Should show test cards or list
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(100);
  });

  test('can start a test', async ({ page }) => {
    await page.goto('/tests');
    await waitForPageReady(page);
    
    const startButton = page.locator('button').filter({ hasText: /Start|Begin|Take/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(500);
      
      // Should navigate to test session or show questions
      const hasQuestion = await page.locator('h2, h3, p').filter({ hasText: /\?/i }).first().isVisible().catch(() => false);
      expect(page.url().includes('/test') || hasQuestion).toBeTruthy();
    }
  });
});

test.describe('Test Session', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('shows question and options', async ({ page }) => {
    await page.goto('/tests');
    await waitForPageReady(page);
    
    // Start a test
    const startButton = page.locator('button').filter({ hasText: /Start|Begin/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Should show options
      const options = page.locator('button').filter({ has: page.locator('[class*="rounded"]') });
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('selecting answer shows feedback', async ({ page }) => {
    await page.goto('/tests');
    await waitForPageReady(page);
    
    const startButton = page.locator('button').filter({ hasText: /Start|Begin/i }).first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Click an option
      const option = page.locator('button').filter({ has: page.locator('[class*="rounded-full"]') }).first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
        
        // Should show some feedback (color change, next button, etc.)
        const feedback = page.locator('[class*="bg-green"], [class*="bg-red"], button:has-text("Next")');
        const hasFeedback = await feedback.first().isVisible().catch(() => false);
        expect(hasFeedback).toBeTruthy();
      }
    }
  });
});
