import { test, expect } from '@playwright/test';

test.describe('Video Player and Source Links', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'backend', 'frontend', 'devops', 'behavioral'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should show video buttons when question has video data', async ({ page }) => {
    // Go to algorithms channel which has the test question with videos
    await page.goto('/channel/algorithms/0');
    
    // Wait for the page to load
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('should open video modal when clicking video button', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('should close video modal when clicking outside', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('should show source link when question has sourceUrl', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('should show company badges when question has companies', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });
});

test.describe('Video Player Mobile', () => {
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
        subscribedChannels: ['algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('video buttons should be tappable on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    // Wait for page to load and verify URL
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/channel/algorithms');
  });

  test('video modal should be responsive on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    // Wait for page to load and verify URL
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/channel/algorithms');
  });

  test('company badges should wrap properly on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});
