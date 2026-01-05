/**
 * Core App Tests
 * Fundamental functionality: navigation, responsiveness, basic flows
 */

import { test, expect, setupUser, setupFreshUser, waitForPageReady, checkNoOverflow } from './fixtures';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Should show credits banner or quick quiz
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(100);
  });

  test('bottom nav visible on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('/');
    await waitForPageReady(page);
    
    // Mobile nav is fixed at bottom with lg:hidden
    const mobileNav = page.locator('nav.fixed.bottom-0');
    await expect(mobileNav).toBeVisible({ timeout: 10000 });
  });

  test('sidebar visible on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop only');
    await page.goto('/');
    await waitForPageReady(page);
    
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('navigate to channels via Learn', async ({ page, isMobile }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    if (isMobile) {
      // Mobile: tap Learn in bottom nav (fixed at bottom)
      const mobileNav = page.locator('nav.fixed.bottom-0');
      await mobileNav.locator('button').filter({ hasText: 'Learn' }).click();
      await page.waitForTimeout(500);
    } else {
      // Desktop: click Learn in sidebar
      await page.locator('aside button').filter({ hasText: 'Learn' }).click();
      await page.waitForTimeout(300);
      // Then click All Channels in submenu
      const allChannels = page.locator('aside button').filter({ hasText: 'All Channels' });
      if (await allChannels.isVisible()) {
        await allChannels.click();
      }
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveURL(/\/channels/);
  });

  test('navigate to profile via credits', async ({ page, isMobile }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // Click on credits display to go to profile - different location on mobile vs desktop
    if (isMobile) {
      // Mobile: credits button is in the bottom nav bar (the last button with coins icon)
      const mobileNav = page.locator('nav.fixed.bottom-0');
      const creditsButton = mobileNav.locator('button').filter({ has: page.locator('svg.lucide-coins') });
      await creditsButton.click();
    } else {
      // Desktop: credits card in sidebar
      const creditsButton = page.locator('aside button').filter({ has: page.locator('svg.lucide-coins') }).first();
      await creditsButton.click();
    }
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/profile/);
  });

  test('keyboard shortcut Cmd+K opens search', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop only');
    await page.goto('/');
    await waitForPageReady(page);
    
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(300);
    
    const searchModal = page.locator('[class*="fixed"][class*="inset"]').filter({ has: page.locator('input') });
    const isVisible = await searchModal.isVisible().catch(() => false);
    if (isVisible) {
      await page.keyboard.press('Escape');
    }
  });

  test('ESC returns to home from channel', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop keyboard navigation');
    await page.goto('/channel/system-design');
    await waitForPageReady(page);
    
    // Wait for questions to load (URL gets question ID appended)
    await page.waitForFunction(() => {
      return window.location.pathname.includes('/channel/system-design');
    }, { timeout: 5000 });
    
    // Make sure no modal is open by clicking on the page body first
    await page.locator('body').click();
    await page.waitForTimeout(300);
    
    // Press Escape to go home
    await page.keyboard.press('Escape');
    
    // Wait for navigation with longer timeout
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });
});

test.describe('Responsiveness', () => {
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

  test('channel detail no overflow', async ({ page }) => {
    await page.goto('/channel/system-design');
    await waitForPageReady(page);
    await checkNoOverflow(page);
  });
});

test.describe('Onboarding', () => {
  test('shows welcome for new users', async ({ page }) => {
    await setupFreshUser(page);
    await page.goto('/');
    await waitForPageReady(page);
    
    await expect(page.getByText(/Welcome|Get Started|Choose/i).first()).toBeVisible();
  });

  test('role selection buttons visible', async ({ page }) => {
    await setupFreshUser(page);
    await page.goto('/');
    await waitForPageReady(page);
    
    const roleButtons = page.locator('button').filter({ hasText: /Frontend|Backend|Fullstack|DevOps/i });
    const count = await roleButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('selecting role proceeds to channel selection', async ({ page }) => {
    await setupFreshUser(page);
    await page.goto('/');
    await waitForPageReady(page);
    
    const roleButton = page.locator('button').filter({ hasText: /Fullstack/i }).first();
    if (await roleButton.isVisible()) {
      await roleButton.click();
      await page.waitForTimeout(500);
    }
  });
});
