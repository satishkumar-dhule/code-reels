import { test, expect } from '@playwright/test';

test.describe('Test Session Page', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should load test session page for a channel', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should show either the ready state or loading/no test message
    const hasReadyState = await page.getByText('Start Test').isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoTest = await page.getByText('No test available').isVisible({ timeout: 1000 }).catch(() => false) ||
                      await page.getByText('Go back home').isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(hasReadyState || hasNoTest).toBeTruthy();
  });

  test('should display test info in ready state', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const hasReadyState = await page.getByText('Start Test').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      // Should show test details
      await expect(page.getByText('Questions')).toBeVisible();
      await expect(page.getByText('Passing Score')).toBeVisible();
      await expect(page.getByText('Question Types')).toBeVisible();
    }
  });

  test('should have back to channel button', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const hasReadyState = await page.getByText('Start Test').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      const backButton = page.getByText('Back to Channel');
      await expect(backButton).toBeVisible();
      
      await backButton.click();
      await page.waitForTimeout(500);
      
      expect(page.url()).toContain('/channel/system-design');
    }
  });

  test('should start test when clicking Start Test button', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Should show in-progress state with question
      const hasQuestion = await page.locator('h2').first().isVisible({ timeout: 3000 }).catch(() => false);
      const hasProgress = await page.getByText(/\d+ \/ \d+/).isVisible({ timeout: 1000 }).catch(() => false);
      
      expect(hasQuestion || hasProgress).toBeTruthy();
    }
  });

  test('should display timer during test', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1500);
      
      // Should show timer (format: M:SS)
      const timer = page.locator('.font-mono').filter({ hasText: /\d+:\d{2}/ });
      await expect(timer.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show question type badges', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Should show question type badge (single choice or multiple)
      const singleChoice = page.getByText('Single choice');
      const multipleChoice = page.getByText('Select all that apply');
      
      const hasBadge = await singleChoice.isVisible({ timeout: 2000 }).catch(() => false) ||
                       await multipleChoice.isVisible({ timeout: 1000 }).catch(() => false);
      expect(hasBadge).toBeTruthy();
    }
  });

  test('should allow selecting answer options', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Click on first option
      const options = page.locator('button.w-full.p-4.text-left.border.rounded-lg');
      const optionCount = await options.count();
      
      if (optionCount > 0) {
        await options.first().click();
        await page.waitForTimeout(300);
        
        // Option should be selected (has primary border)
        await expect(options.first()).toHaveClass(/border-primary/);
      }
    }
  });

  test('should navigate between questions', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Should show "1 / X" initially
      await expect(page.getByText(/1 \/ \d+/)).toBeVisible();
      
      // Click Next button
      const nextButton = page.getByText('Next');
      if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Should show "2 / X"
        await expect(page.getByText(/2 \/ \d+/)).toBeVisible();
        
        // Click Previous button
        const prevButton = page.getByText('Previous');
        await prevButton.click();
        await page.waitForTimeout(500);
        
        // Should show "1 / X" again
        await expect(page.getByText(/1 \/ \d+/)).toBeVisible();
      }
    }
  });

  test('should show question dots for navigation', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Should show question dots
      const dots = page.locator('button.w-2.h-2.rounded-full');
      const dotCount = await dots.count();
      
      expect(dotCount).toBeGreaterThan(0);
    }
  });

  test('should show Submit Test button on last question', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Navigate to last question using dots
      const dots = page.locator('button.w-2.h-2.rounded-full');
      const dotCount = await dots.count();
      
      if (dotCount > 0) {
        // Click last dot
        await dots.last().click();
        await page.waitForTimeout(500);
        
        // Should show Submit Test button
        await expect(page.getByText('Submit Test')).toBeVisible();
      }
    }
  });
});

test.describe('Test Session - Completion', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should show results after submitting test', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Answer all questions quickly (just click through)
      const dots = page.locator('button.w-2.h-2.rounded-full');
      const dotCount = await dots.count();
      
      for (let i = 0; i < dotCount; i++) {
        // Select first option for each question
        const options = page.locator('button.w-full.p-4.text-left.border.rounded-lg');
        if (await options.first().isVisible({ timeout: 1000 }).catch(() => false)) {
          await options.first().click();
        }
        
        // Go to next question or submit
        if (i < dotCount - 1) {
          const nextButton = page.getByText('Next');
          if (await nextButton.isVisible({ timeout: 500 }).catch(() => false)) {
            await nextButton.click();
            await page.waitForTimeout(300);
          }
        }
      }
      
      // Submit test
      const submitButton = page.getByText('Submit Test');
      if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show results
        const hasResults = await page.getByText('Congratulations!').isVisible({ timeout: 3000 }).catch(() => false) ||
                          await page.getByText('Keep Practicing!').isVisible({ timeout: 1000 }).catch(() => false);
        expect(hasResults).toBeTruthy();
      }
    }
  });

  test('should show score and stats after completion', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Quick submit (navigate to last and submit)
      const dots = page.locator('button.w-2.h-2.rounded-full');
      await dots.last().click();
      await page.waitForTimeout(500);
      
      const submitButton = page.getByText('Submit Test');
      if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show stats
        await expect(page.getByText('Time Spent')).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('Correct Answers')).toBeVisible();
        await expect(page.getByText('Incorrect')).toBeVisible();
      }
    }
  });

  test('should have share buttons after completion', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Quick submit
      const dots = page.locator('button.w-2.h-2.rounded-full');
      await dots.last().click();
      await page.waitForTimeout(500);
      
      const submitButton = page.getByText('Submit Test');
      if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show share buttons
        await expect(page.getByText('Share on X')).toBeVisible({ timeout: 3000 });
        await expect(page.getByText('LinkedIn')).toBeVisible();
      }
    }
  });

  test('should have Try Again button after completion', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const startButton = page.getByText('Start Test');
    const hasReadyState = await startButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasReadyState) {
      await startButton.click();
      await page.waitForTimeout(1000);
      
      // Quick submit
      const dots = page.locator('button.w-2.h-2.rounded-full');
      await dots.last().click();
      await page.waitForTimeout(500);
      
      const submitButton = page.getByText('Submit Test');
      if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForTimeout(1000);
        
        // Should show Try Again button
        const tryAgainButton = page.getByText('Try Again');
        await expect(tryAgainButton).toBeVisible({ timeout: 3000 });
        
        // Click Try Again should restart test
        await tryAgainButton.click();
        await page.waitForTimeout(1000);
        
        // Should be back in test (showing question)
        await expect(page.getByText(/1 \/ \d+/)).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
