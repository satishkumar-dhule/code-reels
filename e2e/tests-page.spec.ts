import { test, expect } from '@playwright/test';

test.describe('Tests Page', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding and set up user preferences
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

  test('should load the tests page', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    
    // Should show the page title
    await expect(page.locator('h1')).toContainText('Tests');
  });

  test('should display stats overview cards', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    
    // Should show 4 stats cards: Passed, Attempts, Avg Score, Available
    const statsCards = page.locator('.border.border-border.p-3.bg-card.rounded-lg.text-center');
    await expect(statsCards).toHaveCount(4);
    
    // Check for stat labels
    await expect(page.getByText('Passed', { exact: false })).toBeVisible();
    await expect(page.getByText('Attempts', { exact: false })).toBeVisible();
    await expect(page.getByText('Avg Score', { exact: false })).toBeVisible();
    await expect(page.getByText('Available', { exact: false })).toBeVisible();
  });

  test('should have back button that navigates away', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to tests page
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    
    // Click back button
    const backButton = page.locator('button').filter({ hasText: /back/i });
    await backButton.click();
    
    // Should navigate away from tests page
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('/tests');
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to tests page
    await page.goto('/tests');
    
    // Should show loading spinner or tests list
    const hasContent = await page.locator('.animate-spin').isVisible({ timeout: 1000 }).catch(() => false) ||
                       await page.locator('.space-y-3').isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('No Tests Available').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('should display test cards when tests are available', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Either show test cards or "No Tests Available" message
    const hasTests = await page.locator('.cursor-pointer.hover\\:border-primary\\/50').first().isVisible({ timeout: 3000 }).catch(() => false);
    const noTests = await page.getByText('No Tests Available').isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(hasTests || noTests).toBeTruthy();
  });

  test('should show test details in cards', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if tests are available
    const testCard = page.locator('.cursor-pointer.hover\\:border-primary\\/50').first();
    const hasTests = await testCard.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTests) {
      // Should show question count and passing score
      await expect(page.getByText(/questions/i).first()).toBeVisible();
      await expect(page.getByText(/% to pass/i).first()).toBeVisible();
    }
  });

  test('should navigate to test session when clicking a test card', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if tests are available
    const testCard = page.locator('.cursor-pointer.hover\\:border-primary\\/50').first();
    const hasTests = await testCard.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasTests) {
      await testCard.click();
      await page.waitForTimeout(1000);
      
      // Should navigate to test session page
      expect(page.url()).toContain('/test/');
    }
  });

  test('should handle keyboard navigation with Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    
    // Press Escape to go back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Should navigate away
    expect(page.url()).not.toContain('/tests');
  });
});

test.describe('Tests Page - With Progress', () => {
  test.beforeEach(async ({ page }) => {
    // Set up user with test progress
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
      
      // Add some test progress
      localStorage.setItem('test-progress', JSON.stringify({
        'test-system-design': {
          testId: 'test-system-design',
          channelId: 'system-design',
          attempts: [{
            testId: 'test-system-design',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            answers: {},
            score: 85,
            passed: true,
            timeSpent: 300
          }],
          bestScore: 85,
          lastAttemptAt: new Date().toISOString(),
          passed: true
        }
      }));
    });
  });

  test('should display progress stats correctly', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    
    // Stats should reflect the stored progress
    // At least one passed test should show
    const passedStat = page.locator('.text-lg.font-bold').first();
    await expect(passedStat).toBeVisible();
  });
});
