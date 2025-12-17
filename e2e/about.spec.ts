import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
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

  test('should load the about page', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Should show the page title (using partial match)
    await expect(page.locator('h1')).toContainText('Code');
  });

  test('should display features tab content', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Should show feature cards (use heading role to be specific)
    await expect(page.getByRole('heading', { name: 'AI-Powered' })).toBeVisible();
  });

  test('should switch to tech tab', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Click tech tab
    await page.locator('button').filter({ hasText: /^tech$/i }).click();
    
    // Should show tech stack
    await expect(page.getByText('Tech Stack')).toBeVisible();
  });

  test('should switch to community tab', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Click community tab
    await page.locator('button').filter({ hasText: /^community$/i }).click();
    
    // Should show community section
    await expect(page.getByText('Open Source')).toBeVisible();
  });

  test('should switch to developer tab', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Click developer tab
    await page.locator('button').filter({ hasText: /^developer$/i }).click();
    
    // Should show developer section
    await expect(page.getByText('About the Developer')).toBeVisible();
  });

  test('should have portfolio link in developer tab', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Click developer tab
    await page.locator('button').filter({ hasText: /^developer$/i }).click();
    
    // Should have portfolio link
    await expect(page.locator('a[href="https://satishkumar-dhule.github.io/"]').first()).toBeVisible();
  });

  test('should navigate back with back button', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Click back button
    await page.getByRole('button', { name: /back/i }).click();
    
    // Should navigate (either to home or previous page)
    await page.waitForTimeout(500);
    // Just verify navigation happened
    const url = page.url();
    expect(url).not.toContain('/about');
  });
});
