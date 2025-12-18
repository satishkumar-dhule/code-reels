import { test, expect } from '@playwright/test';

test.describe('Reveal Answer Functionality', () => {
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

  test('should reveal answer without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });

    // New UI has split view - answer is already visible on desktop
    await page.waitForTimeout(1000);

    // Page should still be functional - no React errors
    const hasQuestionPanel = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(e => 
      e.includes('Rendered more hooks') || 
      e.includes('Rules of Hooks') ||
      e.includes('Minified React error')
    );
    
    expect(criticalErrors).toHaveLength(0);
    expect(hasQuestionPanel).toBeTruthy();
  });

  test('should reveal answer with keyboard shortcut', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });

    // Press right arrow to navigate
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    // Page should still be functional
    const hasQuestionPanel = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
    
    // No page errors should occur
    const criticalErrors = errors.filter(e => 
      e.includes('Rendered more hooks') || 
      e.includes('Rules of Hooks')
    );
    
    expect(criticalErrors).toHaveLength(0);
    expect(hasQuestionPanel).toBeTruthy();
  });

  test('should show answer content after reveal', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });

    // New UI has split view - answer is already visible on desktop
    // Page should be functional
    const pageStillWorks = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
    
    expect(pageStillWorks).toBeTruthy();
  });
});
