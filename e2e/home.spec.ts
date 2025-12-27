/**
 * Home Page Tests
 * Quick Quiz, Credits, Daily Review, Voice Interview CTA
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('shows credits banner', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Credits banner should be visible
    await expect(page.getByText(/Credits Available/i)).toBeVisible();
  });

  test('credits banner links to profile', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const creditsBanner = page.locator('button').filter({ hasText: /Credits Available/i });
    await creditsBanner.click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('shows Quick Quiz section', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    await expect(page.getByText('Quick Quiz')).toBeVisible();
  });

  test('Quick Quiz shows question', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Wait for quiz to load
    await page.waitForTimeout(1000);
    
    // Should show question options
    const options = page.locator('button').filter({ has: page.locator('[class*="rounded-full"]') });
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Quick Quiz answer gives feedback', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await page.waitForTimeout(1000);
    
    // Click first option
    const option = page.locator('button').filter({ has: page.locator('[class*="rounded-full"][class*="border"]') }).first();
    if (await option.isVisible()) {
      await option.click();
      await page.waitForTimeout(500);
      
      // Should show green (correct) or red (incorrect) feedback
      const feedback = page.locator('[class*="bg-green"], [class*="bg-red"]');
      await expect(feedback.first()).toBeVisible();
    }
  });

  test('shows Your Channels section', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    await expect(page.getByText('Your Channels')).toBeVisible();
  });

  test('shows Voice Interview CTA', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    await expect(page.getByText('Voice Interview')).toBeVisible();
    await expect(page.getByText(/EARN CREDITS/i)).toBeVisible();
  });

  test('Voice Interview CTA navigates correctly', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const voiceCTA = page.locator('button').filter({ hasText: /Voice Interview/i });
    await voiceCTA.click();
    await expect(page).toHaveURL(/\/voice-interview/);
  });

  test('channel card navigates to channel', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const channelCard = page.locator('button, [class*="cursor-pointer"]').filter({ hasText: /System Design|Algorithms/i }).first();
    if (await channelCard.isVisible()) {
      await channelCard.click();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/channel/');
    }
  });
});

test.describe('Quick Stats', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('shows stats row', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Should show Done, Streak, Topics
    await expect(page.getByText('Done')).toBeVisible();
    await expect(page.getByText('Streak')).toBeVisible();
    await expect(page.getByText('Topics')).toBeVisible();
  });

  test('stats row links to stats page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const statsRow = page.locator('button').filter({ hasText: /Done.*Streak.*Topics/i });
    if (await statsRow.isVisible()) {
      await statsRow.click();
      await expect(page).toHaveURL(/\/stats/);
    }
  });
});
