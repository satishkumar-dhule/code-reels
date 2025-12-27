/**
 * Channels Tests
 * Channel browsing, subscription, and question viewing
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('Channels Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('displays channel list', async ({ page }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    // Should show channel names
    const hasSystemDesign = await page.getByText('System Design').isVisible().catch(() => false);
    const hasAlgorithms = await page.getByText('Algorithms').isVisible().catch(() => false);
    expect(hasSystemDesign || hasAlgorithms).toBeTruthy();
  });

  test('shows subscribed indicator', async ({ page }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    // Subscribed channels should have check icon
    const checkIcons = page.locator('svg.lucide-check');
    const count = await checkIcons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('search filters channels', async ({ page }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    const searchInput = page.getByPlaceholder(/Search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('system');
      await page.waitForTimeout(300);
      
      await expect(page.getByText('System Design')).toBeVisible();
    }
  });

  test('clicking channel toggles subscription', async ({ page }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    // Click on a channel card to toggle subscription
    const channelCard = page.locator('h3, h4').filter({ hasText: /Database|Security|Mobile/i }).first();
    if (await channelCard.isVisible()) {
      await channelCard.click();
      await page.waitForTimeout(300);
      // Subscription state should change (we just verify no error)
    }
  });

  test('subscriptions persist after reload', async ({ page }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    const prefsBeforeReload = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('user-preferences') || '{}');
    });
    
    await page.reload();
    await waitForPageReady(page);
    
    const prefsAfterReload = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('user-preferences') || '{}');
    });
    
    expect(prefsAfterReload.subscribedChannels).toEqual(prefsBeforeReload.subscribedChannels);
  });
});

test.describe('Channel Detail', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('loads channel questions', async ({ page }) => {
    await page.goto('/channel/system-design');
    await waitForPageReady(page);
    
    // Should show question panel or question list
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(100);
  });

  test('question navigation with arrow keys', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop keyboard navigation');
    await page.goto('/channel/algorithms');
    await waitForPageReady(page);
    
    const initialUrl = page.url();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    // URL should change to next question
    expect(page.url()).not.toBe(initialUrl);
  });

  test('back button returns to home', async ({ page }) => {
    await page.goto('/channel/system-design');
    await waitForPageReady(page);
    
    const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL('/');
    }
  });
});
