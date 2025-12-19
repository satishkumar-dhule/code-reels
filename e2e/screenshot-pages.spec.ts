import { test, expect } from '@playwright/test';

/**
 * Tests for pages used in screenshot automation
 * Ensures all pages render correctly for documentation screenshots
 */

test.describe('Screenshot Pages - Desktop', () => {
  test.beforeEach(async ({ page }) => {
    // Set up complete user state for screenshots
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend', 'devops', 'generative-ai', 'machine-learning'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
      
      // Add progress data for realistic screenshots
      localStorage.setItem('progress-system-design', JSON.stringify([
        'sd-1', 'sd-2', 'sd-3', 'sd-4', 'sd-5', 'sd-6', 'sd-7', 'sd-8', 'sd-9', 'sd-10'
      ]));
      localStorage.setItem('progress-algorithms', JSON.stringify([
        'algo-1', 'algo-2', 'algo-3', 'algo-4', 'algo-5'
      ]));
      localStorage.setItem('progress-frontend', JSON.stringify([
        'fe-1', 'fe-2', 'fe-3', 'fe-4'
      ]));
      localStorage.setItem('progress-devops', JSON.stringify([
        'devops-1', 'devops-2', 'devops-3'
      ]));
    });
  });

  test('home page renders correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Main heading should be visible
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Channel cards should be visible
    await expect(page.getByText('Your Channels')).toBeVisible();
  });

  test('channels page renders correctly', async ({ page }) => {
    await page.goto('/channels');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Should show channels
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('question reels page renders correctly', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show question panel or content
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('stats page renders correctly', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Should show stats content
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('badges page renders correctly', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Should show badges content - use heading role to avoid duplicate matches
    await expect(page.getByRole('heading', { name: /Badges/i })).toBeVisible();
    await expect(page.getByText('Your Collection')).toBeVisible();
  });

  test('tests page renders correctly', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Should show tests content
    await expect(page.getByText('Tests')).toBeVisible();
  });
});

test.describe('Screenshot Pages - Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

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

  test('home page renders correctly on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Main content visible
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('reels page renders correctly on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('badges page renders correctly on mobile', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Content visible - use heading role to avoid duplicate matches
    await expect(page.getByRole('heading', { name: /Badges/i })).toBeVisible();
  });

  test('tests page renders correctly on mobile', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Content visible
    await expect(page.getByText('Tests')).toBeVisible();
  });
});

test.describe('Screenshot Pages - Theme Support', () => {
  test.beforeEach(async ({ page }) => {
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

  test('home page supports dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should load without errors
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('home page supports light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should load without errors
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('badges page supports both themes', async ({ page }) => {
    // Test dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Badges/i })).toBeVisible();
    
    // Test light theme
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Badges/i })).toBeVisible();
  });

  test('tests page supports both themes', async ({ page }) => {
    // Test dark theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/tests');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Tests')).toBeVisible();
    
    // Test light theme
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Tests')).toBeVisible();
  });
});
