import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up user preferences to skip onboarding
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend', 'database', 'devops', 'sre'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
    await page.reload();
  });

  test('should display subscribed channels', async ({ page }) => {
    await page.goto('/');
    
    // Should show channel cards (names without dots)
    await expect(page.getByText('System Design')).toBeVisible();
    await expect(page.getByText('Algorithms')).toBeVisible();
    await expect(page.getByText('Frontend')).toBeVisible();
  });

  test('should show progress for each channel', async ({ page }) => {
    await page.goto('/');
    
    // Should show progress indicators
    await expect(page.getByText(/Progress/i).first()).toBeVisible();
    await expect(page.getByText(/0%/).first()).toBeVisible();
  });

  test('should navigate to channel when clicked', async ({ page }) => {
    await page.goto('/');
    
    // Click on a channel card (use the heading text)
    await page.locator('h2:has-text("System Design")').first().click();
    
    // Should navigate to channel page
    await expect(page).toHaveURL(/\/channel\/system-design/);
  });

  test('should have browse channels button', async ({ page }) => {
    await page.goto('/');
    
    // Should have browse channels card
    await expect(page.getByText('Browse Channels')).toBeVisible();
  });

  test('should navigate to all channels page', async ({ page }) => {
    await page.goto('/');
    
    // Click browse channels
    await page.getByText('Browse Channels').click();
    
    // Should navigate to channels page
    await expect(page).toHaveURL('/channels');
  });

  test('should have theme toggle', async ({ page }) => {
    await page.goto('/');
    
    // Should have theme button
    const themeButton = page.getByTitle(/Switch Theme/i);
    await expect(themeButton).toBeVisible();
  });

  test('should have stats link', async ({ page }) => {
    await page.goto('/');
    
    // Should have stats button
    const statsButton = page.getByTitle(/View Stats/i);
    await expect(statsButton).toBeVisible();
    
    // Click and navigate
    await statsButton.click();
    await expect(page).toHaveURL('/stats');
  });
});
