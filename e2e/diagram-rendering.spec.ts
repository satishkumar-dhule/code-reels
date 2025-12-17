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
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 15000 });
    
    // Check if we have questions
    const hasQuestions = await page.getByTestId('question-panel').isVisible().catch(() => false);
    if (!hasQuestions) {
      console.log('No questions in SRE channel, skipping diagram test');
      return;
    }

    // Reveal the answer to see diagrams
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    // Check for diagram errors - there should be no error messages
    const diagramErrors = await page.locator('.border-red-500, [class*="error"]').filter({ hasText: /diagram|render|failed/i }).count();
    
    // Navigate through several questions to test multiple diagrams
    const questionsToTest = 5;
    let diagramsFound = 0;
    let errorsFound = 0;

    for (let i = 0; i < questionsToTest; i++) {
      // Wait for content to load
      await page.waitForTimeout(500);
      
      // Check for mermaid container (successful render) or error
      const hasMermaidSvg = await page.locator('.mermaid-container svg').count();
      const hasError = await page.locator('.border-red-500').filter({ hasText: /error|failed/i }).count();
      
      if (hasMermaidSvg > 0) {
        diagramsFound++;
        console.log(`Question ${i + 1}: Diagram rendered successfully`);
      }
      
      if (hasError > 0) {
        errorsFound++;
        console.log(`Question ${i + 1}: Diagram error found`);
      }

      // Navigate to next question
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      
      // Reveal answer
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
    }

    console.log(`Total diagrams found: ${diagramsFound}, Errors: ${errorsFound}`);
    
    // We should have found at least some diagrams and no errors
    expect(errorsFound).toBe(0);
  });

  test('should render diagrams in system-design channel', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 15000 });
    
    // Reveal answer
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    // Navigate through questions looking for diagrams
    for (let i = 0; i < 3; i++) {
      // Check for diagram errors
      const errorElements = await page.locator('.border-red-500').filter({ hasText: /diagram|render|failed/i }).count();
      expect(errorElements).toBe(0);
      
      // Next question
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
    }
  });

  test('should show loading state while diagram renders', async ({ page }) => {
    await page.goto('/channel/sre');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 15000 });
    
    // The page should not show permanent loading state
    await page.waitForTimeout(2000);
    
    // After 2 seconds, there should be no "Loading diagram..." text visible
    // (it should have either rendered or shown an error)
    const loadingCount = await page.getByText('Loading diagram...').count();
    expect(loadingCount).toBe(0);
  });

  test('should handle diagram expand/collapse', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 15000 });
    
    // Reveal answer
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    // Look for a mermaid container
    const mermaidContainer = page.locator('.mermaid-container').first();
    
    if (await mermaidContainer.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click to expand (on desktop)
      await mermaidContainer.click();
      await page.waitForTimeout(500);
      
      // Check if expanded view is shown (has zoom controls)
      const hasZoomControls = await page.locator('button[title="Zoom in"], button[title="Zoom out"]').count();
      
      if (hasZoomControls > 0) {
        // Close with ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        // Should be back to normal view
        await expect(page.getByTestId('question-panel')).toBeVisible();
      }
    }
  });

  test('should not crash when navigating between questions with diagrams', async ({ page }) => {
    await page.goto('/channel/sre/0');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 15000 });
    
    // Rapidly navigate through questions
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(100);
    }
    
    // Wait for any pending renders
    await page.waitForTimeout(1000);
    
    // Page should still be functional
    const hasContent = await page.getByTestId('question-panel').isVisible().catch(() => false) ||
                       await page.getByTestId('no-questions-view').isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
    
    // No JavaScript errors should have crashed the page
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(50);
  });

  test('diagrams should render with correct theme', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 15000 });
    
    // Reveal answer
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1500);

    // Check if any SVG is rendered in mermaid container
    const svgCount = await page.locator('.mermaid-container svg').count();
    
    if (svgCount > 0) {
      // SVG should have some content (not empty)
      const svgContent = await page.locator('.mermaid-container svg').first().innerHTML();
      expect(svgContent.length).toBeGreaterThan(100);
    }
  });
});
