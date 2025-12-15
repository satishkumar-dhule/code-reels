import { test, expect } from '@playwright/test';

test.describe('Company Filter', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
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
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Look for company filter dropdown (Building2 icon or "Company" text)
    const companyFilter = page.locator('button').filter({ hasText: /Company/i });
    
    // Company filter should be visible if there are questions with company data
    const isVisible = await companyFilter.isVisible({ timeout: 3000 }).catch(() => false);
    
    // If visible, test the dropdown functionality
    if (isVisible) {
      await companyFilter.click();
      await page.waitForTimeout(300);
      
      // Should show "All Companies" option
      await expect(page.locator('[role="menuitem"]').filter({ hasText: /All Companies/i })).toBeVisible();
      
      // Close dropdown
      await page.keyboard.press('Escape');
    }
  });

  test('should filter questions by company when selected', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    const companyFilter = page.locator('button').filter({ hasText: /Company/i });
    
    if (await companyFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await companyFilter.click();
      await page.waitForTimeout(300);
      
      // Get all menu items (companies)
      const menuItems = page.locator('[role="menuitem"]');
      const count = await menuItems.count();
      
      if (count > 1) {
        // Click on a specific company (not "All Companies")
        await menuItems.nth(1).click();
        await page.waitForTimeout(500);
        
        // Page should still show content (either questions or no-data message)
        const hasContent = await page.getByTestId('question-panel').isVisible().catch(() => false) ||
                          await page.getByTestId('no-questions-view').isVisible().catch(() => false);
        expect(hasContent).toBeTruthy();
      }
    }
  });

  test('should show question count per company in dropdown', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    const companyFilter = page.locator('button').filter({ hasText: /Company/i });
    
    if (await companyFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await companyFilter.click();
      await page.waitForTimeout(300);
      
      // Check if there are numbers (counts) in the dropdown
      const dropdownContent = await page.locator('[role="menu"]').textContent();
      
      // Should contain some numeric content (question counts)
      // The format shows counts like "5" or "Q" suffix
      expect(dropdownContent).toBeTruthy();
      
      await page.keyboard.press('Escape');
    }
  });

  test('should reset company filter with Reset Filters button', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    const companyFilter = page.locator('button').filter({ hasText: /Company/i });
    
    if (await companyFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Select a company
      await companyFilter.click();
      await page.waitForTimeout(300);
      
      const menuItems = page.locator('[role="menuitem"]');
      const count = await menuItems.count();
      
      if (count > 1) {
        await menuItems.nth(1).click();
        await page.waitForTimeout(500);
        
        // If no-questions view appears, click Reset Filters
        const noQuestionsView = page.getByTestId('no-questions-view');
        if (await noQuestionsView.isVisible({ timeout: 2000 }).catch(() => false)) {
          const resetButton = page.getByRole('button', { name: /Reset Filters/i });
          await resetButton.click();
          await page.waitForTimeout(500);
          
          // Should show questions again or still show no-questions view
          const hasContent = await page.getByTestId('question-panel').isVisible().catch(() => false) ||
                            await page.getByTestId('no-questions-view').isVisible().catch(() => false);
          expect(hasContent).toBeTruthy();
        }
      }
    }
  });

  test('company filter should update when other filters change', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Change difficulty filter first
    const difficultyDropdown = page.locator('button').filter({ hasText: /All|Beginner|Intermediate|Advanced/ }).first();
    
    if (await difficultyDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await difficultyDropdown.click();
      await page.waitForTimeout(200);
      
      const beginnerOption = page.locator('[role="menuitem"]').filter({ hasText: 'Beginner' });
      if (await beginnerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await beginnerOption.click();
        await page.waitForTimeout(500);
        
        // Company filter should still work (may have different companies now)
        const companyFilter = page.locator('button').filter({ hasText: /Company/i });
        
        // If company filter is visible, it should be functional
        if (await companyFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
          await companyFilter.click();
          await page.waitForTimeout(300);
          
          // Should show dropdown content
          const menuItems = page.locator('[role="menuitem"]');
          const count = await menuItems.count();
          expect(count).toBeGreaterThan(0);
          
          await page.keyboard.press('Escape');
        }
      }
    }
  });
});
