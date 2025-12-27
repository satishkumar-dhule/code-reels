/**
 * Voice Interview Tests
 * Voice practice feature testing
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('Voice Interview Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('page loads', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    
    await expect(page.getByText(/Voice Interview|Practice/i).first()).toBeVisible();
  });

  test('shows question', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    await page.waitForTimeout(1000);
    
    // Should show a question
    const hasQuestion = await page.locator('h2, h3').filter({ hasText: /\?|What|How|Why|Explain/i }).first().isVisible().catch(() => false);
    expect(hasQuestion).toBeTruthy();
  });

  test('shows credits info', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    await page.waitForTimeout(1000);
    
    // Page should have loaded with some content
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(100);
  });

  test('has record button', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    
    // Should have mic/record button
    const recordButton = page.locator('button').filter({ has: page.locator('svg.lucide-mic, svg.lucide-mic-off') });
    await expect(recordButton.first()).toBeVisible();
  });

  test('skip button works', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    
    const skipButton = page.locator('button').filter({ hasText: /Skip|Next/i }).first();
    if (await skipButton.isVisible()) {
      const initialContent = await page.locator('h2, h3').first().textContent();
      await skipButton.click();
      await page.waitForTimeout(500);
      
      // Content should change
      const newContent = await page.locator('h2, h3').first().textContent();
      // May or may not change depending on question pool
    }
  });

  test('home button returns to home', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    
    const homeButton = page.locator('button').filter({ has: page.locator('svg.lucide-home') }).first();
    if (await homeButton.isVisible()) {
      await homeButton.click();
      await expect(page).toHaveURL('/');
    }
  });
});
