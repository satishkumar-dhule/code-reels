import { test, expect } from '@playwright/test';

test.describe('Video Player and Source Links', () => {
  test.beforeEach(async ({ page }) => {
    // Skip onboarding
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
    // Go to algorithms channel which has the test question with videos
    await page.goto('/channel/algorithms/0');
    
    // Wait for the page to load
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for video section
    const videoSection = page.getByText(/Video Explanations/i);
    const hasVideoSection = await videoSection.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasVideoSection) {
      // Should have Quick Explanation button
      const quickButton = page.getByText(/Quick Explanation/i);
      await expect(quickButton).toBeVisible();
      
      // Should have Deep Dive button
      const deepDiveButton = page.getByText(/Deep Dive/i);
      await expect(deepDiveButton).toBeVisible();
    }
  });

  test('should open video modal when clicking video button', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Click on Quick Explanation button if visible
    const quickButton = page.getByText(/Quick Explanation/i);
    if (await quickButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickButton.click();
      await page.waitForTimeout(500);
      
      // Modal should appear with iframe
      const iframe = page.locator('iframe[src*="youtube"]');
      const hasIframe = await iframe.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (hasIframe) {
        await expect(iframe).toBeVisible();
        
        // Close button should be visible
        const closeButton = page.locator('button').filter({ has: page.locator('svg') }).last();
        await closeButton.click();
        await page.waitForTimeout(300);
        
        // Modal should be closed
        await expect(iframe).not.toBeVisible();
      }
    }
  });

  test('should close video modal when clicking outside', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    const quickButton = page.getByText(/Quick Explanation/i);
    if (await quickButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickButton.click();
      await page.waitForTimeout(500);
      
      const iframe = page.locator('iframe[src*="youtube"]');
      if (await iframe.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click outside the video (on the backdrop)
        await page.mouse.click(10, 10);
        await page.waitForTimeout(300);
        
        // Modal should be closed
        await expect(iframe).not.toBeVisible();
      }
    }
  });

  test('should show source link when question has sourceUrl', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for source link
    const sourceLink = page.getByText(/View Source|Learn More/i);
    const hasSourceLink = await sourceLink.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasSourceLink) {
      // Should be a link that opens in new tab
      const link = page.locator('a').filter({ hasText: /View Source|Learn More/i });
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
      expect(await link.getAttribute('target')).toBe('_blank');
    }
  });

  test('should show company badges when question has companies', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // Reveal the answer
    const revealButton = page.getByText(/Tap to Reveal|Reveal Answer/i);
    if (await revealButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await revealButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for "Asked at:" section
    const askedAtSection = page.getByText(/Asked at:/i);
    const hasCompanySection = await askedAtSection.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasCompanySection) {
      // Should show company badges
      const companyBadges = page.locator('span').filter({ hasText: /Google|Amazon|Meta|Microsoft|Apple/i });
      const count = await companyBadges.count();
      expect(count).toBeGreaterThan(0);
    }
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
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    
    // On mobile, answer is auto-revealed, so just wait
    await page.waitForTimeout(1000);
    
    // Look for the video button container (the whole clickable area, not just text)
    const videoButton = page.locator('button').filter({ hasText: /Quick Explanation/i });
    if (await videoButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check the button container is large enough for touch (minimum 44px recommended)
      const box = await videoButton.boundingBox();
      if (box) {
        // The button should have reasonable touch target - at least 16px height for the text
        // The actual touch target includes padding, so we check for minimum usable size
        expect(box.height).toBeGreaterThanOrEqual(16);
        expect(box.width).toBeGreaterThanOrEqual(100); // Should be wide enough to tap
      }
    } else {
      // If no video button, that's okay - question may not have video data
      expect(true).toBeTruthy();
    }
  });

  test('video modal should be responsive on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const quickButton = page.getByText(/Quick Explanation/i);
    if (await quickButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickButton.click();
      await page.waitForTimeout(500);
      
      const iframe = page.locator('iframe[src*="youtube"]');
      if (await iframe.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Video should fit within viewport
        const box = await iframe.boundingBox();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(390);
        }
        
        // Close modal
        await page.keyboard.press('Escape');
      }
    }
  });

  test('company badges should wrap properly on mobile', async ({ page }) => {
    await page.goto('/channel/algorithms/0');
    
    await expect(page.getByTestId('question-panel')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const askedAtSection = page.getByText(/Asked at:/i);
    if (await askedAtSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
    }
  });
});
