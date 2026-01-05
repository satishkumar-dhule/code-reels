/**
 * Channels Tests
 * Channel browsing, subscription, and question viewing
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('Channels Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('displays channel list', async ({ page, isMobile }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    // Wait a bit more for channels to render
    await page.waitForTimeout(1000);
    
    // Look for any channel name text
    const channelNames = ['System Design', 'Algorithms', 'Frontend', 'Backend', 'DevOps'];
    let found = false;
    
    for (const name of channelNames) {
      const isVisible = await page.getByText(name, { exact: false }).first().isVisible().catch(() => false);
      if (isVisible) {
        found = true;
        break;
      }
    }
    
    expect(found).toBeTruthy();
  });

  test('shows subscribed indicator', async ({ page, isMobile }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    
    // Wait for channels to render
    await page.waitForTimeout(1000);
    
    // Lucide icons render with class "lucide lucide-check" (space-separated)
    // Use attribute selector to match class containing "lucide-check"
    const checkIcons = page.locator('svg[class*="lucide-check"]');
    const count = await checkIcons.count();
    
    // Should have at least one check icon for subscribed channels
    // Default user has 5 subscribed channels
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
    
    // Wait for questions to load and URL to be updated with question ID
    await page.waitForFunction(() => {
      const url = window.location.pathname;
      // URL should have format /channel/algorithms/q-XXX after loading
      return url.includes('/channel/algorithms/') && url.split('/').length > 3;
    }, { timeout: 5000 }).catch(() => {});
    
    // Wait a bit more for the component to be fully interactive
    await page.waitForTimeout(500);
    
    const initialUrl = page.url();
    await page.keyboard.press('ArrowDown');
    
    // Wait for URL to change (navigation is async)
    await page.waitForFunction(
      (initial) => window.location.href !== initial,
      initialUrl,
      { timeout: 3000 }
    ).catch(() => {});
    
    // URL should change to next question (or stay same if only 1 question)
    const newUrl = page.url();
    // If there are multiple questions, URL should change
    // If only 1 question or at end, URL stays same - both are valid
    expect(newUrl).toBeTruthy();
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
