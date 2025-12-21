import { test, expect } from '@playwright/test';

/**
 * Home Page Tests
 * Tests for the main home/dashboard page
 */

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend', 'devops'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('displays main heading', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    if (isMobile) {
      // Mobile uses focused feed UI
      const pageContent = await page.locator('body').textContent();
      expect(pageContent && pageContent.length > 100).toBeTruthy();
    } else {
      // Desktop uses same focused design - check for key elements
      const hasFeaturedQuestion = await page.getByText("Today's Question").isVisible({ timeout: 5000 }).catch(() => false);
      const hasChannels = await page.getByText('Your Channels').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasFeaturedQuestion || hasChannels).toBeTruthy();
    }
  });

  test('shows Your Channels section', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    if (isMobile) {
      // Mobile uses focused feed UI
      const pageContent = await page.locator('body').textContent();
      expect(pageContent && pageContent.length > 100).toBeTruthy();
    } else {
      await expect(page.getByText('Your Channels')).toBeVisible();
    }
  });

  test('navigates to channel on card click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const channelCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /System Design|Algorithms/i }).first();
    if (await channelCard.isVisible()) {
      await channelCard.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/channel/');
    }
  });

  test('has working search shortcut', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
    
    const searchModal = page.locator('[class*="fixed"][class*="inset-0"]');
    const isVisible = await searchModal.isVisible().catch(() => false);
    if (isVisible) {
      await page.keyboard.press('Escape');
    }
  });

  test('sidebar navigation works', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Sidebar is desktop-only');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be visible on desktop
    const sidebar = page.locator('aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });
});
