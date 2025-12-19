import { test, expect } from '@playwright/test';

test.describe('Badges Page', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding and set up user preferences
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend', 'devops'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should load the badges page', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Should show the page title
    await expect(page.locator('h1')).toContainText('Badges');
  });

  test('should display overall progress section', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Should show "Your Collection" section
    await expect(page.getByText('Your Collection')).toBeVisible();
    
    // Should show progress bar
    const progressBar = page.locator('.h-2.bg-muted\\/30.rounded-full.overflow-hidden');
    await expect(progressBar.first()).toBeVisible();
    
    // Should show completion percentage
    await expect(page.getByText(/\d+% Complete/)).toBeVisible();
  });

  test('should display category tabs', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Should show category filter buttons
    await expect(page.getByRole('button', { name: /All/i })).toBeVisible();
    await expect(page.getByText('Consistency')).toBeVisible();
    await expect(page.getByText('Progress')).toBeVisible();
    await expect(page.getByText('Difficulty')).toBeVisible();
    await expect(page.getByText('Explorer')).toBeVisible();
    await expect(page.getByText('Special')).toBeVisible();
  });

  test('should filter badges by category', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on Consistency category
    await page.getByText('Consistency').click();
    await page.waitForTimeout(300);
    
    // Should show only streak badges section
    const sections = page.locator('.border.border-border.p-4.bg-card.rounded-lg');
    const sectionCount = await sections.count();
    
    // When filtered, should show fewer sections
    expect(sectionCount).toBeGreaterThan(0);
    
    // Click All to show all categories again
    await page.getByRole('button', { name: /All/i }).click();
    await page.waitForTimeout(300);
  });

  test('should display badge grid in each category', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Should show badge grids
    const badgeGrids = page.locator('.grid.grid-cols-3');
    await expect(badgeGrids.first()).toBeVisible();
  });

  test('should display Next Up section', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Should show "Next Up" section
    await expect(page.getByText('Next Up')).toBeVisible();
  });

  test('should have back button that navigates away', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click back button
    const backButton = page.locator('button').filter({ hasText: /back/i });
    await backButton.click();
    
    // Should navigate away from badges page
    await page.waitForTimeout(500);
    expect(page.url()).not.toContain('/badges');
  });

  test('should handle keyboard navigation with Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Press Escape to go back
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Should navigate away
    expect(page.url()).not.toContain('/badges');
  });

  test('should show badge count in category tabs', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Category tabs should show count like "(0/5)"
    const categoryButton = page.locator('button').filter({ hasText: /\(\d+\/\d+\)/ });
    await expect(categoryButton.first()).toBeVisible();
  });
});

test.describe('Badges Page - Badge Modal', () => {
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

  test('should open badge detail modal when clicking a badge', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge in the grid
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.click();
    await page.waitForTimeout(300);
    
    // Modal should appear with badge details
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();
  });

  test('should show badge name and description in modal', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.click();
    await page.waitForTimeout(300);
    
    // Should show badge name (h3)
    const badgeName = page.locator('.bg-card.border.border-border.rounded-lg.p-6 h3');
    await expect(badgeName).toBeVisible();
    
    // Should show description
    const description = page.locator('.bg-card.border.border-border.rounded-lg.p-6 p');
    await expect(description.first()).toBeVisible();
  });

  test('should show progress bar in modal', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.click();
    await page.waitForTimeout(300);
    
    // Should show progress section
    await expect(page.getByText('Progress')).toBeVisible();
    
    // Should show progress bar
    const progressBar = page.locator('.h-2.bg-muted\\/30.rounded-full.overflow-hidden').last();
    await expect(progressBar).toBeVisible();
  });

  test('should close modal when clicking outside', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.click();
    await page.waitForTimeout(300);
    
    // Click outside the modal (on backdrop)
    const backdrop = page.locator('.fixed.inset-0.z-50.bg-black\\/80');
    await backdrop.click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(300);
    
    // Modal should be closed
    await expect(backdrop).not.toBeVisible();
  });

  test('should close modal when pressing Escape', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.click();
    await page.waitForTimeout(300);
    
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Modal should be closed
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).not.toBeVisible();
  });

  test('should close modal when clicking X button', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.click();
    await page.waitForTimeout(300);
    
    // Click X button
    const closeButton = page.locator('.absolute.top-3.right-3');
    await closeButton.click();
    await page.waitForTimeout(300);
    
    // Modal should be closed
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Badges Page - With Progress', () => {
  test.beforeEach(async ({ page }) => {
    // Set up user with some progress to unlock badges
    await page.addInitScript(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'frontend', 'devops', 'backend'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
      
      // Add progress for multiple channels
      localStorage.setItem('progress-system-design', JSON.stringify([
        'sd-1', 'sd-2', 'sd-3', 'sd-4', 'sd-5', 'sd-6', 'sd-7', 'sd-8', 'sd-9', 'sd-10',
        'sd-11', 'sd-12', 'sd-13', 'sd-14', 'sd-15'
      ]));
      localStorage.setItem('progress-algorithms', JSON.stringify([
        'algo-1', 'algo-2', 'algo-3', 'algo-4', 'algo-5'
      ]));
      localStorage.setItem('progress-frontend', JSON.stringify([
        'fe-1', 'fe-2', 'fe-3'
      ]));
      
      // Add daily stats for streak calculation
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0];
      
      localStorage.setItem('daily-stats', JSON.stringify([
        { date: today, questionsCompleted: 5 },
        { date: yesterday, questionsCompleted: 3 },
        { date: twoDaysAgo, questionsCompleted: 4 }
      ]));
    });
  });

  test('should show unlocked badges with progress', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Should show some unlocked count > 0
    const collectionText = page.getByText(/\d+\/\d+/).first();
    await expect(collectionText).toBeVisible();
  });

  test('should show badges in Next Up section with progress', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Next Up section should show badges with progress > 0
    const nextUpSection = page.locator('.border.border-border.p-4.bg-card.rounded-lg').last();
    await expect(nextUpSection).toBeVisible();
    
    // Should show progress percentages
    const progressText = page.getByText(/%/).first();
    await expect(progressText).toBeVisible();
  });

  test('should show correct progress in badge modal', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Click on a badge from Next Up section (has progress)
    const nextUpBadge = page.locator('.p-2.bg-muted\\/10.rounded.cursor-pointer').first();
    const hasNextUp = await nextUpBadge.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasNextUp) {
      await nextUpBadge.click();
      await page.waitForTimeout(300);
      
      // Modal should show current/requirement
      const progressText = page.getByText(/\d+\/\d+/);
      await expect(progressText.first()).toBeVisible();
    }
  });
});

test.describe('Badges Page - Mobile', () => {
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
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('should show scrollable category tabs on mobile', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Category tabs should be visible and scrollable
    const tabsContainer = page.locator('.flex.gap-1.mb-4.overflow-x-auto');
    await expect(tabsContainer).toBeVisible();
  });

  test('should open badge modal on tap', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Tap on a badge
    const badgeRing = page.locator('.cursor-pointer').first();
    await badgeRing.tap();
    await page.waitForTimeout(300);
    
    // Modal should appear
    const modal = page.locator('.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();
  });

  test('should have proper touch targets on mobile', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForLoadState('networkidle');
    
    // Check category buttons have minimum touch target size
    const categoryButtons = await page.locator('button').filter({ hasText: /All|Consistency|Progress/ }).all();
    
    for (const button of categoryButtons.slice(0, 3)) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });
});
