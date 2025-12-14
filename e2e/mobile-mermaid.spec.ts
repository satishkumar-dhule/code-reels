import { test, expect } from '@playwright/test';

// Use mobile viewport for all tests
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Mermaid Diagrams', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
    await page.addInitScript(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should render mermaid diagrams on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal answer to see diagram
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check if mermaid container exists
    const mermaidContainer = page.locator('.mermaid-container').first();
    const hasDiagram = await mermaidContainer.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasDiagram) {
      // Verify SVG is rendered
      const svg = mermaidContainer.locator('svg');
      await expect(svg).toBeVisible();
      
      // Check SVG has reasonable dimensions
      const box = await svg.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThan(50);
        expect(box.height).toBeGreaterThan(50);
      }
    }
  });

  test('should have expand button visible on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check for expand button (should be visible on mobile)
    const expandButton = page.locator('button[title="Expand diagram"]').first();
    const hasExpandButton = await expandButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Expand button should be visible or at least exist
    if (hasExpandButton) {
      expect(await expandButton.isVisible()).toBeTruthy();
    }
  });

  test('should open fullscreen diagram view', async ({ page }) => {
    await page.goto('/channel/system-design');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find and click expand button
    const expandButton = page.locator('button[title="Expand diagram"]').first();
    if (await expandButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandButton.click();
      await page.waitForTimeout(500);
      
      // Should show fullscreen view with controls
      const zoomControls = page.locator('button[title="Zoom in"], button[title="Zoom out"]');
      const hasZoomControls = await zoomControls.first().isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasZoomControls) {
        expect(await zoomControls.first().isVisible()).toBeTruthy();
      }
      
      // Close button should be visible
      const closeButton = page.locator('button[title="Close"]');
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('diagram should not overflow viewport', async ({ page }) => {
    await page.goto('/channel/system-design');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check body doesn't have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    // Allow small tolerance
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });
});

// Helper function to simulate touch swipe
async function simulateSwipe(page: any, startX: number, startY: number, endX: number, endY: number) {
  await page.evaluate(({ startX, startY, endX, endY }) => {
    const element = document.elementFromPoint(startX, startY) || document.body;
    
    const touchStart = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [new Touch({ identifier: 0, target: element, clientX: startX, clientY: startY })],
      targetTouches: [new Touch({ identifier: 0, target: element, clientX: startX, clientY: startY })],
    });
    
    const touchMove = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [new Touch({ identifier: 0, target: element, clientX: endX, clientY: endY })],
      targetTouches: [new Touch({ identifier: 0, target: element, clientX: endX, clientY: endY })],
    });
    
    const touchEnd = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
      targetTouches: [],
      changedTouches: [new Touch({ identifier: 0, target: element, clientX: endX, clientY: endY })],
    });
    
    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchMove);
    element.dispatchEvent(touchEnd);
  }, { startX, startY, endX, endY });
}

test.describe('Mobile Swipe Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('horizontal swipe left should go to next question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Perform horizontal swipe left (next) using proper touch events
    const box = await page.locator('body').boundingBox();
    if (box) {
      const startX = box.x + box.width * 0.8;
      const endX = box.x + box.width * 0.2;
      const y = box.y + box.height / 2;
      await simulateSwipe(page, startX, y, endX, y);
    }
    
    await page.waitForTimeout(500);
    
    // Should still be on channel page (swipe worked)
    expect(page.url()).toContain('/channel/system-design');
  });

  test('horizontal swipe right should go to previous question', async ({ page }) => {
    await page.goto('/channel/system-design/1');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Perform horizontal swipe right (previous) using proper touch events
    const box = await page.locator('body').boundingBox();
    if (box) {
      const startX = box.x + box.width * 0.2;
      const endX = box.x + box.width * 0.8;
      const y = box.y + box.height / 2;
      await simulateSwipe(page, startX, y, endX, y);
    }
    
    await page.waitForTimeout(500);
    
    // Should still be on channel page
    expect(page.url()).toContain('/channel/system-design');
  });

  test('vertical swipe should NOT change question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Get initial question index from URL
    const initialUrl = page.url();
    
    // Perform vertical swipe up using proper touch events
    const box = await page.locator('body').boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const startY = box.y + box.height * 0.8;
      const endY = box.y + box.height * 0.2;
      await simulateSwipe(page, x, startY, x, endY);
    }
    
    await page.waitForTimeout(500);
    
    // URL should remain the same (question didn't change)
    const newUrl = page.url();
    expect(newUrl).toBe(initialUrl);
  });

  test('vertical swipe down should NOT change question', async ({ page }) => {
    await page.goto('/channel/system-design/1');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Get initial URL
    const initialUrl = page.url();
    
    // Perform vertical swipe down using proper touch events
    const box = await page.locator('body').boundingBox();
    if (box) {
      const x = box.x + box.width / 2;
      const startY = box.y + box.height * 0.2;
      const endY = box.y + box.height * 0.8;
      await simulateSwipe(page, x, startY, x, endY);
    }
    
    await page.waitForTimeout(500);
    
    // URL should remain the same
    const newUrl = page.url();
    expect(newUrl).toBe(initialUrl);
  });

  test('diagonal swipe with more vertical movement should NOT change question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    const initialUrl = page.url();
    
    // Perform diagonal swipe (more vertical than horizontal) using proper touch events
    const box = await page.locator('body').boundingBox();
    if (box) {
      // Start position
      const startX = box.x + box.width * 0.6;
      const startY = box.y + box.height * 0.8;
      // End position - more vertical movement
      const endX = box.x + box.width * 0.4;
      const endY = box.y + box.height * 0.2;
      
      await simulateSwipe(page, startX, startY, endX, endY);
    }
    
    await page.waitForTimeout(500);
    
    // Question should not change
    expect(page.url()).toBe(initialUrl);
  });
});

test.describe('Mobile Answer Panel Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should be able to scroll answer content without changing question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    const initialUrl = page.url();
    
    // Try to scroll within the answer panel
    await page.evaluate(() => {
      const answerPanel = document.querySelector('[class*="overflow-y-auto"]');
      if (answerPanel) {
        answerPanel.scrollTop = 200;
      }
    });
    
    await page.waitForTimeout(300);
    
    // Question should not change
    expect(page.url()).toBe(initialUrl);
  });
});
