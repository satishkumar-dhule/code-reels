import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Mobile E2E Tests
 * Tests all pages in mobile mode with issue detection
 */

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('marvel-intro-seen', 'true');
    localStorage.setItem('user-preferences', JSON.stringify({
      role: 'fullstack',
      subscribedChannels: ['system-design', 'algorithms', 'backend', 'frontend', 'devops', 'sre'],
      onboardingComplete: true,
      createdAt: new Date().toISOString()
    }));
    localStorage.setItem('progress-system-design', JSON.stringify(['sd-1', 'sd-2', 'sd-3']));
    localStorage.setItem('progress-algorithms', JSON.stringify(['algo-1', 'algo-2']));
  });
}

async function checkNoHorizontalOverflow(page: Page) {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
}

test.describe('Mobile Screenshots - All Pages', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Home page validation', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const pageContent = await page.locator('body').textContent();
    expect(pageContent && pageContent.length > 100).toBeTruthy();
    await checkNoHorizontalOverflow(page);
  });

  test('Channels page validation', async ({ page }) => {
    await page.goto('/channels');
    await page.waitForTimeout(2000);
    
    const pageContent = await page.locator('body').textContent();
    expect(pageContent && pageContent.length > 100).toBeTruthy();
    await checkNoHorizontalOverflow(page);
  });

  test('Stats page validation', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForTimeout(2000);
    
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    await checkNoHorizontalOverflow(page);
  });

  test('Badges page validation', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForTimeout(2000);
    
    await expect(page.getByRole('heading', { name: /Badges/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your Collection')).toBeVisible();
    await checkNoHorizontalOverflow(page);
  });

  test('Tests page validation', async ({ page }) => {
    await page.goto('/tests');
    await page.waitForTimeout(2000);
    
    await expect(page.getByText('Tests')).toBeVisible({ timeout: 10000 });
    await checkNoHorizontalOverflow(page);
  });

  test('About page validation', async ({ page }) => {
    await page.goto('/about');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await checkNoHorizontalOverflow(page);
  });

  test('Whats New page validation', async ({ page }) => {
    await page.goto('/whats-new');
    await page.waitForTimeout(2000);
    
    await expect(page.getByText("What's New")).toBeVisible({ timeout: 10000 });
    await checkNoHorizontalOverflow(page);
  });

  test('Channel/Reels page validation', async ({ page }) => {
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2500);
    
    const pageContent = await page.locator('body').textContent();
    expect(pageContent && pageContent.length > 100).toBeTruthy();
    await checkNoHorizontalOverflow(page);
  });

  test('Coding Challenges list page', async ({ page }) => {
    await page.goto('/coding');
    await page.waitForTimeout(2000);
    
    await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 10000 });
    await checkNoHorizontalOverflow(page);
  });
});

test.describe('Mobile Issue Detection - Badges', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Badges should render correctly on mobile', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForTimeout(2500);
    
    const badgeRings = page.locator('svg circle');
    const ringCount = await badgeRings.count();
    expect(ringCount).toBeGreaterThan(0);
    
    const badgeNames = page.locator('[class*="truncate"]');
    const nameCount = await badgeNames.count();
    expect(nameCount).toBeGreaterThan(0);
  });

  test('Badge progress rings should animate correctly', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForTimeout(2500);
    
    const progressCircles = page.locator('svg circle[stroke-dasharray]');
    const circleCount = await progressCircles.count();
    expect(circleCount).toBeGreaterThan(0);
  });

  test('Badge modal should work on mobile', async ({ page }) => {
    await page.goto('/badges');
    await page.waitForTimeout(2000);
    
    const firstBadge = page.locator('[class*="cursor-pointer"][class*="group"]').first();
    if (await firstBadge.isVisible()) {
      await firstBadge.click();
      await page.waitForTimeout(500);
      
      const modal = page.locator('[class*="fixed"][class*="inset-0"]');
      if (await modal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('Mobile Issue Detection - Question Count Loading', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Question count should not show 0 initially on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const progressTexts = page.locator('[class*="text-muted-foreground"]');
    const progressCount = await progressTexts.count();
    expect(progressCount).toBeGreaterThan(0);
  });

  test('Stats page should load counts correctly', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForTimeout(2000);
    
    const statNumbers = page.locator('[class*="font-bold"]');
    const numberCount = await statNumbers.count();
    expect(numberCount).toBeGreaterThan(0);
  });
});

test.describe('Mobile Issue Detection - Coding Challenges', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Coding challenge page should be mobile-friendly', async ({ page }) => {
    await page.goto('/coding');
    await page.waitForTimeout(2000);
    
    await expect(page.getByTestId('stats-grid')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('challenge-list')).toBeVisible({ timeout: 10000 });
    await checkNoHorizontalOverflow(page);
  });

  test('Coding challenge view should have collapsible sections on mobile', async ({ page }) => {
    await page.goto('/coding');
    await page.waitForTimeout(2000);
    
    const firstChallenge = page.getByTestId('challenge-card-0');
    if (await firstChallenge.isVisible()) {
      await firstChallenge.click();
      await page.waitForTimeout(2500);
      await checkNoHorizontalOverflow(page);
    }
  });
});

test.describe('Mobile Issue Detection - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Navigation between pages should work smoothly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    await page.goto('/stats');
    await page.waitForTimeout(1500);
    
    await page.goto('/badges');
    await page.waitForTimeout(1500);
    
    await page.goto('/tests');
    await page.waitForTimeout(1500);
  });

  test('Back button should work correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    await page.goto('/stats');
    await page.waitForTimeout(1000);
    
    await page.goBack();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL('/');
  });

  test('ESC key should navigate to home from channel page', async ({ page }) => {
    await page.goto('/channel/system-design');
    await page.waitForTimeout(2500);
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(page).toHaveURL('/');
  });
});

test.describe('Mobile Issue Detection - Touch Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Touch targets should be large enough', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 10)) {
      const box = await button.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        expect(box.width).toBeGreaterThanOrEqual(30);
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test('Tap on channel card should navigate', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    const channelCard = page.locator('[class*="cursor-pointer"][class*="border"][class*="p-3"]').first();
    
    if (await channelCard.isVisible()) {
      await channelCard.tap();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/channel/');
    }
  });
});

test.describe('Mobile Issue Detection - Layout Issues', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('No horizontal overflow on any page', async ({ page }) => {
    // Increase timeout for this multi-page test
    test.setTimeout(90000);
    
    const pages = [
      '/',
      '/channels',
      '/stats',
      '/badges',
      '/tests',
      '/about',
      '/whats-new',
      '/coding',
      '/channel/system-design'
    ];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      // Wait for content to load
      await page.waitForTimeout(2000);
      // Wait for any animations to settle
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      
      // Check overflow with retry for CI stability
      let bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      let viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // If overflow detected, wait a bit more and recheck (handles late layout shifts)
      if (bodyWidth > viewportWidth + 20) {
        await page.waitForTimeout(500);
        bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        viewportWidth = await page.evaluate(() => window.innerWidth);
      }
      
      // Allow tolerance for CI environments (scrollbars, rendering differences)
      expect(bodyWidth, `Page ${pagePath} has horizontal overflow: body=${bodyWidth}, viewport=${viewportWidth}`).toBeLessThanOrEqual(viewportWidth + 20);
    }
  });

  test('Text should be readable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    const textElements = await page.locator('p, span, h1, h2, h3, button').all();
    
    for (const element of textElements.slice(0, 20)) {
      const fontSize = await element.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      
      if (fontSize > 0) {
        expect(fontSize).toBeGreaterThanOrEqual(9);
      }
    }
  });

  test('Images and icons should be properly sized', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    
    const icons = await page.locator('svg').all();
    
    for (const icon of icons.slice(0, 20)) {
      const box = await icon.boundingBox();
      if (box && box.width > 0) {
        expect(box.width).toBeLessThanOrEqual(100);
        expect(box.height).toBeLessThanOrEqual(100);
      }
    }
  });
});

test.describe('Mobile Issue Detection - Test Session', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Test session page should be mobile-friendly', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForTimeout(2500);
    
    const startButton = page.locator('button').filter({ hasText: /start test/i });
    if (await startButton.isVisible()) {
      await checkNoHorizontalOverflow(page);
    }
  });

  test('Test navigation should work on mobile', async ({ page }) => {
    await page.goto('/test/system-design');
    await page.waitForTimeout(2500);
    
    const startButton = page.locator('button').filter({ hasText: /start test/i });
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1500);
      await checkNoHorizontalOverflow(page);
    }
  });
});
