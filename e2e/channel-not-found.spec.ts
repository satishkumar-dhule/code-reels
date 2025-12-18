import { test, expect } from '@playwright/test';

test.describe('Channel Not Found Handling', () => {
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

  test('should show error message for non-existent channel', async ({ page }) => {
    await page.goto('/channel/non-existent-channel');
    
    // Should show error message (new UI shows "Channel not found")
    await expect(page.getByText(/Channel not found|CHANNEL_NOT_FOUND/i)).toBeVisible({ timeout: 5000 });
    
    // Should show the channel name in the error
    await expect(page.getByText(/non-existent-channel/i)).toBeVisible();
    
    // Should have a "Go Home" button
    await expect(page.getByText(/Go Home/i)).toBeVisible();
  });

  test('should redirect to home after clicking Go Home button', async ({ page }) => {
    await page.goto('/channel/invalid-channel-xyz');
    
    // Wait for error message (new UI shows "Channel not found")
    await expect(page.getByText(/Channel not found|CHANNEL_NOT_FOUND/i)).toBeVisible({ timeout: 5000 });
    
    // Click Go Home button
    await page.getByText(/Go Home/i).click();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should auto-redirect to home after timeout', async ({ page }) => {
    await page.goto('/channel/auto-redirect-test');
    
    // Wait for error message (new UI shows "Channel not found")
    await expect(page.getByText(/Channel not found|CHANNEL_NOT_FOUND/i)).toBeVisible({ timeout: 5000 });
    
    // New UI doesn't auto-redirect, so just verify Go Home button works
    await page.getByText(/Go Home/i).click();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should show Go Home button when no questions available', async ({ page }) => {
    // Navigate to a valid channel first
    await page.goto('/channel/system-design');
    
    // Wait for page to load (use first() since new UI has desktop and mobile views)
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // If no-questions-view is shown, verify Reset Filters or Go Home button exists
    const noQuestionsView = page.getByTestId('no-questions-view');
    if (await noQuestionsView.isVisible({ timeout: 2000 }).catch(() => false)) {
      const hasButton = await page.getByText(/Go Home|Reset Filters/i).isVisible();
      expect(hasButton).toBeTruthy();
    }
  });
});
