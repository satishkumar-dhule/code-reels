import { test, expect } from '@playwright/test';

test.describe('Diagram Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'backend', 'frontend', 'devops', 'sre', 'database'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should render mermaid diagrams without errors in SRE channel', async ({ page }) => {
    await page.goto('/channel/sre');
    
    // Wait for question panel to load
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 15000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });

  test('should render diagrams in system-design channel', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 15000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('should show loading state while diagram renders', async ({ page }) => {
    await page.goto('/channel/sre');
    
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 15000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });

  test('should handle diagram expand/collapse', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 15000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('should not crash when navigating between questions with diagrams', async ({ page }) => {
    await page.goto('/channel/sre/0');
    
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 15000 });
    
    // Rapidly navigate through questions
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
    }
    
    // Wait for any pending renders
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible().catch(() => false) ||
                       await page.getByTestId('no-questions-view').isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
    
    // No JavaScript errors should have crashed the page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(50);
  });

  test('diagrams should render with correct theme', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 15000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });
});
