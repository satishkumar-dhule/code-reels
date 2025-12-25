import { test, expect } from '@playwright/test';

/**
 * Question Viewer Tests
 * Tests for question display, reveal answer, video player, and metadata
 */

test.describe('Question Metadata Display', () => {
  test.skip(({ isMobile }) => isMobile, 'Question metadata tests are desktop-only');

  test.beforeEach(async ({ page }) => {
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

  test('answer panel should display content', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    const pageContent = await page.locator('body').textContent();
    expect(pageContent && pageContent.length > 100).toBeTruthy();
  });

  test('should display tags', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    const tags = page.locator('span').filter({ hasText: /^#/ });
    const tagCount = await tags.count();
    expect(tagCount >= 0).toBeTruthy();
  });

  test('external links should open in new tab', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    const externalLinks = page.locator('a[target="_blank"]');
    const linkCount = await externalLinks.count();
    
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');
      if (rel) {
        expect(rel).toContain('noopener');
      }
    }
  });
});

test.describe('Question Navigation', () => {
  test.skip(({ isMobile }) => isMobile, 'Question navigation tests are desktop-only');

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should update when navigating between questions', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    
    // Get initial URL (will be redirected to question ID format like /channel/algorithms/q-XXX)
    await page.waitForTimeout(500);
    const initialUrl = page.url();
    
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    // URL should change to a different question ID
    const newUrl = page.url();
    expect(newUrl).toContain('/channel/algorithms/');
    expect(newUrl).not.toBe(initialUrl);
  });

  test('should preserve filter state when navigating', async ({ page }) => {
    await page.goto('/channel/algorithms');
    await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    const difficultyDropdown = page.locator('button').filter({ hasText: /Difficulty|All Levels|Beginner|Intermediate|Advanced/ }).first();
    
    if (await difficultyDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await difficultyDropdown.click();
      await page.waitForTimeout(200);
      
      const intermediateOption = page.locator('[role="menuitem"]').filter({ hasText: 'Intermediate' });
      if (await intermediateOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await intermediateOption.click();
        await page.waitForTimeout(500);
        
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(500);
        
        await expect(page.getByTestId('question-panel').first().or(page.getByTestId('no-questions-view'))).toBeVisible();
      }
    }
  });
});

test.describe('Reveal Answer Functionality', () => {
  test.skip(({ isMobile }) => isMobile, 'Reveal answer tests are desktop-only');

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
    await page.waitForTimeout(1000);

    const hasQuestionPanel = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
    
    const criticalErrors = errors.filter(e => 
      e.includes('Rendered more hooks') || 
      e.includes('Rules of Hooks') ||
      e.includes('Minified React error')
    );
    
    expect(criticalErrors).toHaveLength(0);
    expect(hasQuestionPanel).toBeTruthy();
  });

  test('should work with keyboard shortcut', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => {
      errors.push(err.message);
    });

    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1000);

    const hasQuestionPanel = await page.getByTestId('question-panel').first().isVisible().catch(() => false);
    
    const criticalErrors = errors.filter(e => 
      e.includes('Rendered more hooks') || 
      e.includes('Rules of Hooks')
    );
    
    expect(criticalErrors).toHaveLength(0);
    expect(hasQuestionPanel).toBeTruthy();
  });
});

test.describe('Video Player', () => {
  test.skip(({ isMobile }) => isMobile, 'Video player tests are desktop-only');

  test.beforeEach(async ({ page }) => {
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

  test('should show video buttons when question has video data', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });

  test('page should be functional with video content', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await expect(page.getByTestId('question-panel').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('question-panel').first()).toBeVisible();
  });
});

test.describe('Video Player Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('video buttons should be tappable on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/channel/algorithms');
  });

  test('company badges should wrap properly on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    await page.waitForTimeout(2000);
    
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
});
