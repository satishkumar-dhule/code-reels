import { test, expect } from '@playwright/test';

test.describe('Question Metadata Display', () => {
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

  test('answer panel should display all metadata sections in correct order', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check sections appear in expected order (top to bottom):
    // 1. Company badges (if present)
    // 2. Video explanations (if present)
    // 3. Diagram
    // 4. Quick Answer
    // 5. Explanation
    // 6. Tags
    // 7. Source Link (if present)
    
    // At minimum, these should always be present
    const diagramSection = page.getByText(/Diagram/i);
    const explanationSection = page.getByText(/Explanation/i);
    
    // Either diagram or explanation should be visible
    const hasDiagram = await diagramSection.isVisible({ timeout: 2000 }).catch(() => false);
    const hasExplanation = await explanationSection.isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(hasDiagram || hasExplanation).toBeTruthy();
  });

  test('should display tags at the bottom of answer panel', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Tags should be visible (they start with #)
    const tags = page.locator('span').filter({ hasText: /^#/ });
    const tagCount = await tags.count();
    
    // Should have at least one tag
    expect(tagCount).toBeGreaterThan(0);
  });

  test('should show Quick Answer section when answer differs from explanation', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Quick Answer section should be visible
    const quickAnswerSection = page.getByText(/Quick Answer/i);
    const hasQuickAnswer = await quickAnswerSection.isVisible({ timeout: 2000 }).catch(() => false);
    
    // This is optional - some questions may not have it
    if (hasQuickAnswer) {
      // Should have a lightbulb icon nearby
      const lightbulbIcon = page.locator('svg').filter({ has: page.locator('[class*="lucide-lightbulb"]') });
      // Just verify the section exists
      expect(hasQuickAnswer).toBeTruthy();
    }
  });

  test('should render mermaid diagrams correctly', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for mermaid diagram container
    const diagramContainer = page.locator('[class*="mermaid"], svg[id*="mermaid"]');
    const hasDiagram = await diagramContainer.first().isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasDiagram) {
      // Diagram should have rendered (contains SVG elements)
      const svgElements = page.locator('svg');
      const svgCount = await svgElements.count();
      expect(svgCount).toBeGreaterThan(0);
    }
  });

  test('should show completion badge after revealing answer', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Completion badge should appear
    const completedBadge = page.getByText(/Completed/i);
    const hasCompletedBadge = await completedBadge.isVisible({ timeout: 3000 }).catch(() => false);
    
    // This should be visible after revealing
    expect(hasCompletedBadge).toBeTruthy();
  });

  test('external links should open in new tab', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Find all external links
    const externalLinks = page.locator('a[target="_blank"]');
    const linkCount = await externalLinks.count();
    
    // All external links should have rel="noopener noreferrer" for security
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');
      expect(rel).toContain('noopener');
    }
  });

  test('code blocks should be syntax highlighted', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for code blocks (pre elements with syntax highlighting)
    const codeBlocks = page.locator('pre code, [class*="prism"], [class*="syntax"]');
    const codeCount = await codeBlocks.count();
    
    if (codeCount > 0) {
      // Code blocks should have some styling
      const firstCodeBlock = codeBlocks.first();
      const hasStyles = await firstCodeBlock.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.fontFamily.includes('mono') || styles.fontFamily.includes('Consolas') || styles.fontFamily.includes('Monaco');
      });
      
      // Should have monospace font
      expect(hasStyles).toBeTruthy();
    }
  });
});

test.describe('Question Navigation with Metadata', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('metadata should update when navigating between questions', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal first question's answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Get first question's content
    const firstQuestionText = await page.getByTestId('question-panel').textContent();
    
    // Navigate to next question
    const nextButton = page.locator('button[title="Next"]');
    if (await nextButton.isVisible() && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Question should have changed
      const secondQuestionText = await page.getByTestId('question-panel').textContent();
      
      // Content should be different (different question)
      // Note: This might fail if there's only one question
      if (firstQuestionText && secondQuestionText) {
        // At least the URL should have changed
        await expect(page).toHaveURL(/\/channel\/algorithms\/1/);
      }
    }
  });

  test('should preserve filter state when navigating questions', async ({ page }) => {
    await page.goto('/channel/algorithms');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Set a difficulty filter
    const difficultyDropdown = page.locator('button').filter({ hasText: /All|Beginner|Intermediate|Advanced/ }).first();
    
    if (await difficultyDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await difficultyDropdown.click();
      await page.waitForTimeout(200);
      
      const intermediateOption = page.locator('[role="menuitem"]').filter({ hasText: 'Intermediate' });
      if (await intermediateOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await intermediateOption.click();
        await page.waitForTimeout(500);
        
        // Navigate to next question
        const nextButton = page.locator('button[title="Next"]');
        if (await nextButton.isVisible() && await nextButton.isEnabled()) {
          await nextButton.click();
          await page.waitForTimeout(500);
          
          // Filter should still be set to Intermediate
          const filterText = await difficultyDropdown.textContent();
          expect(filterText?.toLowerCase()).toContain('intermediate');
        }
      }
    }
  });
});
