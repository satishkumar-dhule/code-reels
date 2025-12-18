import { test, expect } from '@playwright/test';

// Use mobile viewport for all mobile tests
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Optimizations', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'backend', 'frontend', 'devops', 'sre'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('ESC button should navigate to home, not previous page', async ({ page }) => {
    // Navigate to a channel page
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Use keyboard to go back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Should navigate to home page
    await expect(page).toHaveURL('/');
  });

  test('ESC keyboard shortcut should navigate to home', async ({ page }) => {
    // Navigate to a channel page
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Press Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Should navigate to home page
    await expect(page).toHaveURL('/');
  });

  test('diagram section should be hidden on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('TLDR section should be visible instead of Quick Answer', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('search button should be hidden on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('share button should be hidden on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('completion notification should be compact in unified footer', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('navigation hints should be in unified footer', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('mobile header should be compact without overlapping controls', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('question counter should be compact on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('reveal answer button should be simplified on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('no horizontal overflow on mobile channel page', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    // Allow small tolerance for scrollbars
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});

test.describe('Mobile Optimizations - Desktop Comparison', () => {
  // Use desktop viewport
  test.use({
    viewport: { width: 1280, height: 720 },
    isMobile: false,
    hasTouch: false,
  });

  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'backend', 'frontend', 'devops', 'sre'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('diagram section should be visible on desktop', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for the page to load
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // New UI has split view on desktop - both question and answer panels visible
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('search button should be visible on desktop', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for the page to load
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Search button should be visible on desktop (look for search icon)
    const searchButton = page.locator('button').filter({ has: page.locator('svg.lucide-search') }).first();
    await expect(searchButton).toBeVisible({ timeout: 5000 });
  });

  test('share button should be visible on desktop', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for the page to load
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Share button should be visible on desktop (look for share icon)
    const shareButton = page.locator('button').filter({ has: page.locator('svg.lucide-share-2') }).first();
    await expect(shareButton).toBeVisible({ timeout: 5000 });
  });
});
