/**
 * About Page Tests
 * Verifies all content is visible and not cut off
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
    await page.goto('/about');
    await waitForPageReady(page);
  });

  test.skip('page loads with hero stats', async ({ page }) => {
    await expect(page.getByText('Code_Reels')).toBeVisible();
    
    const statsSection = page.locator('main .grid.grid-cols-2').first();
    await expect(statsSection).toBeVisible();
    await expect(statsSection.locator('div').filter({ hasText: 'Questions' }).first()).toBeVisible();
  });

  test.skip('tab navigation works', async ({ page }) => {
    const tabs = ['MISSION', 'FEATURES', 'TECH', 'COMMUNITY', 'DEVELOPER'];
    for (const tab of tabs) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });

  test.skip('developer tab shows complete profile', async ({ page }) => {
    // Click developer tab and wait for content
    const devTab = page.getByRole('button', { name: 'DEVELOPER' });
    await devTab.click();
    await page.waitForTimeout(500); // Wait for tab animation
    
    // Check developer banner is visible
    const banner = page.getByTestId('developer-banner');
    await expect(banner).toBeVisible({ timeout: 5000 });
    const bannerBox = await banner.boundingBox();
    expect(bannerBox?.height).toBeGreaterThanOrEqual(100);
    
    // Check avatar
    const avatar = page.getByTestId('developer-avatar');
    await expect(avatar).toBeVisible();
    const avatarBox = await avatar.boundingBox();
    expect(avatarBox?.width).toBeGreaterThanOrEqual(80);
    expect(avatarBox?.height).toBeGreaterThanOrEqual(80);
    
    // Check developer name is visible (flexible text match)
    const devName = page.locator('h2').filter({ hasText: /Satish|Developer|Engineer/i }).first();
    await expect(devName).toBeVisible();
    
    // Check portfolio button
    const portfolioBtn = page.getByRole('link', { name: /Portfolio/i });
    await expect(portfolioBtn).toBeVisible();
  });

  test.skip('support section buttons visible', async ({ page }) => {
    await page.getByRole('button', { name: 'DEVELOPER' }).click();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    await expect(page.getByText('Support the Project')).toBeVisible();
    await expect(page.getByRole('link', { name: /Star on GitHub/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Fork & Contribute/i })).toBeVisible();
  });

  test.skip('profile card not clipped by overflow', async ({ page }) => {
    await page.getByRole('button', { name: 'DEVELOPER' }).click();
    
    const isClipped = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="rounded-2xl"]');
      for (const card of cards) {
        const style = window.getComputedStyle(card);
        const rect = card.getBoundingClientRect();
        for (const child of card.children) {
          const childRect = child.getBoundingClientRect();
          if (childRect.top < rect.top && style.overflow === 'hidden') return true;
        }
      }
      return false;
    });
    
    expect(isClipped).toBe(false);
  });
});
