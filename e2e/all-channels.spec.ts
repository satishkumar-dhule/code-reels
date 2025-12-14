import { test, expect } from '@playwright/test';

test.describe('All Channels Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up user preferences
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
  });

  test('should display all available channels', async ({ page }) => {
    await page.goto('/channels');
    
    // Should show page title (with > prefix)
    await expect(page.locator('h1:has-text("All Channels")')).toBeVisible();
    
    // Should show channels
    await expect(page.locator('h3:has-text("System Design")')).toBeVisible();
    await expect(page.locator('h3:has-text("Algorithms")')).toBeVisible();
  });

  test('should show subscribed status', async ({ page }) => {
    await page.goto('/channels');
    
    // Should show subscribed indicator for subscribed channels
    await expect(page.getByText('Subscribed').first()).toBeVisible();
  });

  test('should allow subscribing to a channel', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Find an unsubscribed channel card and click it
    const frontendCard = page.locator('h3:has-text("Frontend")').first();
    await frontendCard.click();
    
    // Should now have more subscribed channels
    const subscribedCount = await page.locator('text=Subscribed').count();
    expect(subscribedCount).toBeGreaterThanOrEqual(3);
  });

  test('should allow unsubscribing from a channel', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Get initial subscribed count
    const initialCount = await page.locator('text=Subscribed').count();
    
    // Click on a subscribed channel card to unsubscribe
    const systemDesignCard = page.locator('h3:has-text("System Design")').first();
    await systemDesignCard.click();
    
    // Should now have fewer subscribed
    const newCount = await page.locator('text=Subscribed').count();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/channels');
    
    // Find search input
    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
    
    // Type in search
    await searchInput.fill('system');
    
    // Should filter results
    await expect(page.getByText('System Design')).toBeVisible();
  });

  test('should have category filters', async ({ page }) => {
    await page.goto('/channels');
    
    // Should have category buttons
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Engineering' })).toBeVisible();
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/channels');
    
    // Click on a category (Cloud & DevOps)
    await page.getByRole('button', { name: /Cloud/i }).click();
    
    // Should show cloud/devops channels
    await expect(page.locator('h3:has-text("DevOps")')).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/channels');
    
    // Click back button
    await page.getByText('Back to Home').click();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should persist subscription changes', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Subscribe to a new channel
    const frontendCard = page.locator('h3:has-text("Frontend")').first();
    await frontendCard.click();
    
    // Get count after subscribing
    const countAfterSubscribe = await page.locator('text=Subscribed').count();
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(500);
    
    // Should still have same subscribed count
    const countAfterReload = await page.locator('text=Subscribed').count();
    expect(countAfterReload).toBe(countAfterSubscribe);
  });
});
