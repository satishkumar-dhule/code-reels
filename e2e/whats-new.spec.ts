import { test, expect } from '@playwright/test';

test.describe('What\'s New Page', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding by setting localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should load the whats new page', async ({ page }) => {
    await page.goto('/whats-new');
    await page.waitForLoadState('networkidle');
    
    // Should show the page title
    await expect(page.locator('h1')).toContainText('New');
  });

  test('should display stats summary', async ({ page }) => {
    await page.goto('/whats-new');
    await page.waitForLoadState('networkidle');
    
    // Should show stats cards (check for the numbers which are always visible)
    await expect(page.locator('.border.border-border.rounded-lg.p-4').first()).toBeVisible();
  });

  test('should display changelog entries', async ({ page }) => {
    await page.goto('/whats-new');
    await page.waitForLoadState('networkidle');
    
    // Should show at least one changelog entry
    await expect(page.locator('.border.border-border.rounded-lg.bg-card').first()).toBeVisible();
  });

  test('should have expandable changelog entries', async ({ page }) => {
    await page.goto('/whats-new');
    await page.waitForLoadState('networkidle');
    
    // Find and click on a changelog entry button
    const entryButton = page.locator('button').filter({ has: page.locator('.text-sm.font-bold') }).first();
    await entryButton.click();
    
    // After clicking, some content should be visible
    await page.waitForTimeout(300);
  });

  test('should navigate back with back button', async ({ page }) => {
    await page.goto('/whats-new');
    await page.waitForLoadState('networkidle');
    
    // Click back button
    await page.getByRole('button', { name: /back/i }).click();
    
    // Should navigate away from whats-new
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).not.toContain('/whats-new');
  });
});
