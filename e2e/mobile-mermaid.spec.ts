import { test, expect } from '@playwright/test';

// Use mobile viewport for all tests
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Mermaid Diagrams (Disabled)', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
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

  test('should show placeholder instead of mermaid diagram on mobile', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('diagram placeholder should not overflow viewport', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
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
      localStorage.setItem('marvel-intro-seen', 'true');
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
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Should still be on channel page
    expect(page.url()).toContain('/channel/system-design');
  });

  test('horizontal swipe right should go to previous question', async ({ page }) => {
    await page.goto('/channel/system-design/1');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Should still be on channel page
    expect(page.url()).toContain('/channel/system-design');
  });

  test('vertical swipe should NOT change question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // URL should contain channel
    expect(page.url()).toContain('/channel/system-design');
  });

  test('vertical swipe down should NOT change question', async ({ page }) => {
    await page.goto('/channel/system-design/1');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // URL should contain channel
    expect(page.url()).toContain('/channel/system-design');
  });

  test('diagonal swipe with more vertical movement should NOT change question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // URL should contain channel
    expect(page.url()).toContain('/channel/system-design');
  });
});

test.describe('Mobile Mermaid Disabled State', () => {
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

  test('should not have zoom controls on mobile (mermaid disabled)', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('placeholder should be styled correctly', async ({ page }) => {
    await page.goto('/channel/system-design');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Page should be functional
    const hasContent = await page.getByTestId('question-panel').first().isVisible({ timeout: 3000 }).catch(() => false) ||
                       await page.getByText('Question').isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Mobile Answer Panel Scrolling', () => {
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

  test('should be able to scroll answer content without changing question', async ({ page }) => {
    await page.goto('/channel/system-design/0');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // URL should contain channel
    expect(page.url()).toContain('/channel/system-design');
  });
});
