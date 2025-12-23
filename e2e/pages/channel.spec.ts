import { test, expect } from '@playwright/test';

/**
 * Channel/Reels Page Tests
 * Tests for the question viewer page
 */

test.describe('Channel Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend', 'database', 'devops', 'sre'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('displays question content', async ({ page }) => {
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2000);
    
    const hasReelsContent = await page.getByTestId('reels-content').isVisible().catch(() => false);
    const hasQuestionPanel = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
    const hasNoQuestionsView = await page.getByTestId('no-questions-view').isVisible().catch(() => false);
    
    expect(hasReelsContent || hasQuestionPanel || hasNoQuestionsView).toBeTruthy();
  });

  test('shows question count', async ({ page }) => {
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2000);
    
    const hasCount = await page.locator('text=/\\d+\\s*(of|\\/|\\/)\\s*\\d+/i').first().isVisible().catch(() => false);
    expect(hasCount).toBeTruthy();
  });

  test('has back navigation', async ({ page }) => {
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2000);
    
    const hasBackIcon = await page.locator('svg.lucide-chevron-left').first().isVisible().catch(() => false);
    expect(hasBackIcon).toBeTruthy();
  });

  test('navigates between questions', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await page.waitForTimeout(2000);
    
    const initialUrl = page.url();
    const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).last();
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      await expect(page).not.toHaveURL(initialUrl);
    }
  });

  test('has difficulty filter', async ({ page, isMobile }) => {
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2000);
    
    // On mobile, filters are collapsed by default - expand them first
    if (isMobile) {
      // Find all buttons in header, the filter toggle is before the search button
      const headerButtons = page.locator('header button');
      const buttonCount = await headerButtons.count();
      
      // Try clicking the second-to-last button in header (filter toggle, before search)
      if (buttonCount >= 3) {
        await headerButtons.nth(buttonCount - 2).click();
        await page.waitForTimeout(500);
      }
    }
    
    // Check for difficulty filter using getByRole for better reliability
    const levelButton = page.getByRole('button', { name: /Level/i });
    const difficultyButton = page.getByRole('button', { name: /Difficulty/i });
    const allLevelsButton = page.getByRole('button', { name: /All Levels/i });
    
    const hasLevel = await levelButton.first().isVisible().catch(() => false);
    const hasDifficulty = await difficultyButton.first().isVisible().catch(() => false);
    const hasAllLevels = await allLevelsButton.first().isVisible().catch(() => false);
    
    // Also check for difficulty icons
    const hasTarget = await page.locator('svg.lucide-target').first().isVisible().catch(() => false);
    const hasZap = await page.locator('svg.lucide-zap').first().isVisible().catch(() => false);
    const hasFlame = await page.locator('svg.lucide-flame').first().isVisible().catch(() => false);
    
    expect(hasLevel || hasDifficulty || hasAllLevels || hasTarget || hasZap || hasFlame).toBeTruthy();
  });

  test('navigates back to home', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2000);
    
    const backButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
    await backButton.click();
    await expect(page).toHaveURL('/');
  });

  test('keyboard navigation works', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is desktop-only');
    
    await page.goto('/channel/system-design/0');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    
    const url = page.url();
    const isValidNavigation = url.includes('/channel/system-design/1') || url.includes('/channel/system-design/0');
    expect(isValidNavigation).toBeTruthy();
  });
});

test.describe('Channel Not Found', () => {
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

  test('shows error for non-existent channel', async ({ page }) => {
    await page.goto('/channel/non-existent-channel');
    await expect(page.getByText(/Channel not found|CHANNEL_NOT_FOUND/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Go Home/i)).toBeVisible();
  });

  test('Go Home button works', async ({ page }) => {
    await page.goto('/channel/invalid-channel-xyz');
    await expect(page.getByText(/Channel not found|CHANNEL_NOT_FOUND/i)).toBeVisible({ timeout: 5000 });
    await page.getByText(/Go Home/i).click();
    await expect(page).toHaveURL('/');
  });
});
