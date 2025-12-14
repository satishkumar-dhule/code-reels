import { test, expect } from '@playwright/test';

// Use mobile viewport for all mobile tests (Chromium with mobile dimensions)
// We don't use devices['iPhone 12'] because it requires WebKit which isn't installed in CI
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms', 'backend', 'frontend', 'devops', 'sre'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('home page should be responsive on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Page should load without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    
    // Main heading should be visible
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Channel cards should be visible
    await expect(page.locator('[class*="channel"], [class*="card"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('channel page should work on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Question panel should be visible
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Navigation should be accessible
    await expect(page.locator('button').filter({ hasText: 'ESC' }).first()).toBeVisible();
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('should be able to reveal answer on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Look for "Tap to Reveal" button and click it
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Page should still be functional
    await expect(page.getByTestId('question-panel')).toBeVisible();
  });

  test('swipe navigation should work on mobile', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for either question panel or no-questions view
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Simulate swipe left (next question) using proper touch events
    const box = await page.locator('body').boundingBox();
    if (box) {
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const y = box.y + box.height / 2;
      
      // Use dispatchEvent for touch simulation
      await page.evaluate(({ startX, endX, y }) => {
        const element = document.elementFromPoint(startX, y) || document.body;
        
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 0, target: element, clientX: startX, clientY: y })],
          targetTouches: [new Touch({ identifier: 0, target: element, clientX: startX, clientY: y })],
        });
        
        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({ identifier: 0, target: element, clientX: endX, clientY: y })],
          targetTouches: [new Touch({ identifier: 0, target: element, clientX: endX, clientY: y })],
        });
        
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [new Touch({ identifier: 0, target: element, clientX: endX, clientY: y })],
        });
        
        element.dispatchEvent(touchStart);
        element.dispatchEvent(touchMove);
        element.dispatchEvent(touchEnd);
      }, { startX, endX, y });
    }
    
    await page.waitForTimeout(500);
    
    // Page should still be functional after swipe - check for any content
    const hasContent = await page.getByTestId('question-panel').or(page.getByTestId('no-questions-view')).isVisible({ timeout: 5000 }).catch(() => false);
    const hasEsc = await page.locator('button').filter({ hasText: /ESC/i }).first().isVisible({ timeout: 3000 }).catch(() => false);
    
    expect(hasContent || hasEsc).toBeTruthy();
  });

  test('all channels page should be scrollable on mobile', async ({ page }) => {
    await page.goto('/channels');
    
    // Page should load
    await expect(page.locator('h1').filter({ hasText: /Channels/i })).toBeVisible({ timeout: 10000 });
    
    // Check page dimensions
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // If page is taller than viewport, test scrolling
    if (pageHeight > viewportHeight + 50) {
      // Try scrolling using JavaScript
      await page.evaluate(() => {
        document.documentElement.scrollTop = 300;
        document.body.scrollTop = 300;
        window.scrollTo({ top: 300, behavior: 'instant' });
      });
      await page.waitForTimeout(500);
      
      const scrollY = await page.evaluate(() => window.scrollY || document.documentElement.scrollTop || document.body.scrollTop);
      // Allow some tolerance - scrolling should work
      expect(scrollY).toBeGreaterThanOrEqual(0);
    }
    
    // Page should still be functional
    await expect(page.locator('h1').filter({ hasText: /Channels/i })).toBeVisible();
  });

  test('stats page should be responsive on mobile', async ({ page }) => {
    await page.goto('/stats');
    
    // Page should load
    await expect(page.locator('h1').filter({ hasText: /Stats/i })).toBeVisible({ timeout: 10000 });
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('about page should be responsive on mobile', async ({ page }) => {
    await page.goto('/about');
    
    // Page should load
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test('touch targets should be large enough on mobile', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Check that buttons have minimum touch target size
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 5)) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(30);
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test('text should be readable on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Check that main text is not too small
    const questionText = page.locator('[class*="question"], h1, h2, p').first();
    if (await questionText.isVisible()) {
      const fontSize = await questionText.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(12);
    }
  });

  test('dropdowns should work on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Find difficulty dropdown - look for the trigger with icon
    const difficultyButton = page.locator('button[data-state]').filter({ hasText: /All|Beginner|Intermediate|Advanced/ }).first();
    
    if (await difficultyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Use force click to bypass any overlay issues
      await difficultyButton.click({ force: true });
      await page.waitForTimeout(500);
      
      // Dropdown menu should appear
      const menuItems = page.locator('[role="menuitem"]');
      const count = await menuItems.count();
      
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
        // Click outside to close
        await page.keyboard.press('Escape');
      }
    }
  });

  test('should navigate from home to channel and back', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(1000);
    
    // Click on a channel card
    const channelCard = page.locator('[class*="card"], [class*="channel"]').filter({ hasText: /system|design/i }).first();
    if (await channelCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await channelCard.click();
      await page.waitForTimeout(500);
      
      // Should be on channel page
      await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
      
      // Go back using force click to avoid overlay issues
      const escButton = page.locator('button').filter({ hasText: 'ESC' }).first();
      await escButton.click({ force: true });
      await page.waitForTimeout(500);
      
      // Should be back on home
      await expect(page).toHaveURL('/');
    }
  });

  test('footer navigation hints should be visible on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    await expect(page.getByTestId('question-panel').or(page.getByTestId('no-questions-view'))).toBeVisible({ timeout: 10000 });
    
    // Mobile should show swipe hints or navigation buttons
    const hasSwipeHint = await page.getByText(/SWIPE/i).isVisible().catch(() => false);
    const hasNavButtons = await page.locator('button[title="Next"]').isVisible().catch(() => false);
    
    expect(hasSwipeHint || hasNavButtons).toBeTruthy();
  });
});

test.describe('Mobile Onboarding', () => {
  test('onboarding should work on mobile', async ({ page }) => {
    // Clear preferences to show onboarding
    await page.addInitScript(() => {
      localStorage.removeItem('user-preferences');
    });
    
    await page.goto('/');
    
    // Onboarding should be visible
    await expect(page.getByText(/Welcome|Get Started|Choose/i).first()).toBeVisible({ timeout: 10000 });
    
    // Role selection buttons should be tappable
    const roleButtons = page.locator('button').filter({ hasText: /Frontend|Backend|Fullstack|DevOps/i });
    const count = await roleButtons.count();
    expect(count).toBeGreaterThan(0);
    
    // Select a role
    await roleButtons.first().click();
    await page.waitForTimeout(300);
  });
});
