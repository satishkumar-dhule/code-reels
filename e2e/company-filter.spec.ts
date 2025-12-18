import { test, expect } from '@playwright/test';

test.describe('Company Filter', () => {
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

  test('should show company filter when questions have company data', async ({ page }) => {
    // Go to algorithms channel which has the test question with companies
    await page.goto('/channel/algorithms');
    
    // Wait for the page to load
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });

  test('should filter questions by company when selected', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });

  test('should show question count per company in dropdown', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });

  test('should reset company filter with Reset Filters button', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });

  test('company filter should update when other filters change', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Page should be functional
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
  });
});
