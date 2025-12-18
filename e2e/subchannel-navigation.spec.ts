import { test, expect } from '@playwright/test';

test.describe('Subchannel Navigation', () => {
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

  test('should not show blank page when changing subchannel', async ({ page }) => {
    // Go to a channel with questions
    await page.goto('/channel/system-design');
    
    // Wait for the page to load with a question panel
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Find and click the subchannel dropdown (contains "All Topics" or "Topic" text)
    const subchannelDropdown = page.locator('button').filter({ hasText: /All Topics|Topic/i }).first();
    
    if (await subchannelDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subchannelDropdown.click();
      
      // Wait for dropdown menu to appear
      await page.waitForTimeout(300);
      
      // Click on a different subchannel option (not "All Topics")
      const subchannelOptions = page.locator('[role="menuitem"]');
      const optionCount = await subchannelOptions.count();
      
      if (optionCount > 1) {
        // Click the second option (first non-"All" option)
        await subchannelOptions.nth(1).click();
        
        // Wait for content to update
        await page.waitForTimeout(500);
        
        // Page should NOT be blank - should show either a question panel or "NO_DATA_FOUND" message
        const hasQuestionPanel = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
        const hasNoDataView = await page.getByTestId('no-questions-view').isVisible().catch(() => false);
        const hasNoDataMessage = await page.getByText(/NO_DATA_FOUND|No questions/i).isVisible().catch(() => false);
        
        // At least one of these should be visible - page should never be completely blank
        expect(hasQuestionPanel || hasNoDataView || hasNoDataMessage).toBeTruthy();
      }
    }
  });

  test('should show appropriate message when subchannel has no questions', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for page load
    await page.waitForTimeout(1000);
    
    // The page should always show something meaningful
    const pageContent = await page.locator('body').textContent();
    
    // Should not be empty or just whitespace
    expect(pageContent?.trim().length).toBeGreaterThan(10);
    
    // Should have navigation elements (new UI uses back chevron)
    const backButton = page.locator('button').filter({ hasText: /ESC|Home/ }).first()
      .or(page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first());
    await expect(backButton).toBeVisible();
  });

  test('should handle difficulty filter changes without blank page', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for initial load
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Find difficulty dropdown (look for the one with difficulty icons/text)
    const difficultyDropdown = page.locator('button').filter({ hasText: /Difficulty|All Levels|Beginner|Intermediate|Advanced/ }).first();
    
    if (await difficultyDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await difficultyDropdown.click();
      await page.waitForTimeout(200);
      
      // Select "Advanced" difficulty
      const advancedOption = page.locator('[role="menuitem"]').filter({ hasText: 'Advanced' });
      if (await advancedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await advancedOption.click();
        await page.waitForTimeout(500);
        
        // Page should not be blank - either show questions or no-data message
        const hasContent = await page.getByTestId('question-panel').first().isVisible().catch(() => false) ||
                          await page.getByTestId('no-questions-view').isVisible().catch(() => false);
        expect(hasContent).toBeTruthy();
      }
    }
  });

  test('should display reset filters button when no questions available', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Try to trigger no-questions state by selecting a very specific filter combination
    // First check if we can access the difficulty dropdown
    const difficultyDropdown = page.locator('button').filter({ hasText: /Difficulty|All Levels|Beginner|Intermediate|Advanced/ }).first();
    
    if (await difficultyDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Select advanced difficulty which might have fewer questions
      await difficultyDropdown.click();
      await page.waitForTimeout(200);
      
      const advancedOption = page.locator('[role="menuitem"]').filter({ hasText: 'Advanced' });
      if (await advancedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await advancedOption.click();
        await page.waitForTimeout(500);
      }
    }
    
    // If no-questions view is shown, verify reset button exists
    const noQuestionsView = page.getByTestId('no-questions-view');
    if (await noQuestionsView.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(page.getByRole('button', { name: /Reset Filters/i })).toBeVisible();
    }
  });

  test('should navigate between questions without errors', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for question panel
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Use keyboard navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    
    // Should still have question panel visible
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
    
    // Navigate back
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(300);
    
    // Should still have question panel visible
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });
});
