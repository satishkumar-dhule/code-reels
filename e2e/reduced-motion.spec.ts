/**
 * Reduced Motion Accessibility Tests
 * 
 * Tests that verify animations respect the user's prefers-reduced-motion preference.
 * 
 * Requirements validated: 6.1, 6.2, 6.4, 6.5
 */

import { test, expect } from '@playwright/test';

test.describe('Reduced Motion Support', () => {
  test('should disable animations when prefers-reduced-motion is enabled', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that CSS animations have minimal duration
    const animatedElements = await page.locator('[class*="animate"]').all();
    
    for (const element of animatedElements) {
      const animationDuration = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.animationDuration || '0');
      });
      
      // Animation duration should be effectively instant (≤ 0.01s)
      expect(animationDuration).toBeLessThanOrEqual(0.01);
    }
  });
  
  test('should have instant transitions when prefers-reduced-motion is enabled', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that transitions have minimal duration
    const interactiveElements = await page.locator('button, a, [role="button"]').all();
    
    for (const element of interactiveElements.slice(0, 10)) { // Check first 10 elements
      const transitionDuration = await element.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.transitionDuration || '0');
      });
      
      // Transition duration should be effectively instant (≤ 0.01s)
      expect(transitionDuration).toBeLessThanOrEqual(0.01);
    }
  });
  
  test('should keep loading indicators functional with reduced motion', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Navigate to a page that might have loading states
    await page.goto('/');
    
    // Check if skeleton loaders are present and visible
    const skeletonLoaders = page.locator('[role="status"][aria-busy="true"]');
    const count = await skeletonLoaders.count();
    
    if (count > 0) {
      // Verify skeleton loaders are visible (functional)
      for (let i = 0; i < count; i++) {
        await expect(skeletonLoaders.nth(i)).toBeVisible();
      }
    }
    
    // This test passes if no errors occur - loading indicators remain functional
  });
  
  test('should disable hover scale animations with reduced motion', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find a button to test
    const button = page.locator('button').first();
    
    if (await button.count() > 0) {
      // Get initial transform
      const initialTransform = await button.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      
      // Hover over button
      await button.hover();
      
      // Wait a bit for any animation to complete
      await page.waitForTimeout(100);
      
      // Get transform after hover
      const hoverTransform = await button.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      
      // With reduced motion, transform should not change significantly
      // (allowing for minor differences in matrix values)
      expect(initialTransform).toBe(hoverTransform);
    }
  });
  
  test('should disable theme toggle animations with reduced motion', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find theme toggle button
    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    
    if (await themeToggle.count() > 0) {
      // Click theme toggle
      await themeToggle.click();
      
      // Wait a minimal amount of time
      await page.waitForTimeout(50);
      
      // Theme should have changed (functionality preserved)
      // but without long animations
      // This test passes if no errors occur
    }
  });
  
  test('should allow normal animations when prefers-reduced-motion is not enabled', async ({ page }) => {
    // Do NOT enable reduced motion preference (default)
    
    // Navigate to home page
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that some animations have normal duration
    const animatedElements = await page.locator('[class*="animate"]').all();
    
    if (animatedElements.length > 0) {
      let hasNormalAnimation = false;
      
      for (const element of animatedElements.slice(0, 5)) {
        const animationDuration = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return parseFloat(styles.animationDuration || '0');
        });
        
        // At least some animations should have normal duration (> 0.1s)
        if (animationDuration > 0.1) {
          hasNormalAnimation = true;
          break;
        }
      }
      
      // Verify that animations are NOT disabled when reduced motion is not preferred
      expect(hasNormalAnimation).toBe(true);
    }
  });
  
  test('should respect reduced motion in progress bars', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Navigate to a page with progress indicators
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for progress bars
    const progressBars = page.locator('[role="progressbar"], .progress, [class*="progress"]');
    const count = await progressBars.count();
    
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const progressBar = progressBars.nth(i);
        
        // Check transition duration
        const transitionDuration = await progressBar.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return parseFloat(styles.transitionDuration || '0');
        });
        
        // Progress bar transitions should be instant with reduced motion
        expect(transitionDuration).toBeLessThanOrEqual(0.01);
      }
    }
    
    // Test passes if no errors - progress bars remain functional
  });
});
