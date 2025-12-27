/**
 * Mobile-Specific Tests
 * Touch interactions, mobile navigation, responsive behavior
 */

import { test, expect, setupUser, waitForPageReady, checkNoOverflow } from './fixtures';

// Force mobile viewport for all tests in this file
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('bottom nav is visible', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Mobile nav is inside nav element with lg:hidden class
    const mobileNav = page.locator('nav.fixed.bottom-0');
    await expect(mobileNav).toBeVisible({ timeout: 10000 });
    
    // Check for Home button inside nav
    const homeButton = mobileNav.locator('button').filter({ hasText: 'Home' });
    await expect(homeButton).toBeVisible({ timeout: 10000 });
  });

  test('bottom nav tabs work', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Get the mobile nav
    const mobileNav = page.locator('nav.fixed.bottom-0');
    
    // Tap Learn tab
    await mobileNav.locator('button').filter({ hasText: 'Learn' }).tap();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/channels/);
    
    // Tap Home tab
    await mobileNav.locator('button').filter({ hasText: 'Home' }).tap();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL('/');
  });

  test('practice tab shows submenu', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Get the mobile nav
    const mobileNav = page.locator('nav.fixed.bottom-0');
    
    // Tap Practice tab - should show submenu
    await mobileNav.locator('button').filter({ hasText: 'Practice' }).tap();
    await page.waitForTimeout(500);
    
    // Should show Voice Interview option in submenu (appears above the nav)
    const voiceOption = page.getByText('Voice Interview');
    await expect(voiceOption).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Mobile Touch Targets', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('buttons are large enough', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 10)) {
      const box = await button.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        // Minimum touch target: 44x44 recommended, 30x30 minimum
        expect(box.width).toBeGreaterThanOrEqual(30);
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test('channel cards are tappable', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const channelCard = page.locator('button, [class*="cursor-pointer"]').filter({ hasText: /System Design|Algorithms/i }).first();
    if (await channelCard.isVisible()) {
      await channelCard.tap();
      await page.waitForTimeout(500);
      expect(page.url()).toContain('/channel/');
    }
  });
});

test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('home page no overflow', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });

  test('channels page no overflow', async ({ page }) => {
    await page.goto('/channels');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });

  test('profile page no overflow', async ({ page }) => {
    await page.goto('/profile');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });

  test('voice interview no overflow', async ({ page }) => {
    await page.goto('/voice-interview');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });

  test('coding page no overflow', async ({ page }) => {
    await page.goto('/coding');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });

  test('stats page no overflow', async ({ page }) => {
    await page.goto('/stats');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });
});

test.describe('Mobile Quick Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('quiz options are tappable', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await page.waitForTimeout(1000);
    
    const option = page.locator('button').filter({ has: page.locator('[class*="rounded-full"]') }).first();
    if (await option.isVisible()) {
      const box = await option.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(40);
      
      await option.tap();
      await page.waitForTimeout(500);
      
      // Should show feedback
      const feedback = page.locator('[class*="bg-green"], [class*="bg-red"]');
      await expect(feedback.first()).toBeVisible();
    }
  });

  test('refresh button works', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const refreshButton = page.locator('button').filter({ has: page.locator('svg.lucide-refresh-cw') }).first();
    if (await refreshButton.isVisible()) {
      await refreshButton.tap();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Mobile Voice Interview', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('CTA card is prominent', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const voiceCTA = page.locator('button').filter({ hasText: /Voice Interview/i });
    await expect(voiceCTA).toBeVisible();
    
    const box = await voiceCTA.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(80); // Should be prominent
  });

  test('tapping CTA navigates to voice page', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    const voiceCTA = page.locator('button').filter({ hasText: /Voice Interview/i });
    await voiceCTA.tap();
    await expect(page).toHaveURL(/\/voice-interview/);
  });
});
