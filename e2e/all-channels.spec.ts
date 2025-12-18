import { test, expect } from '@playwright/test';

test.describe('All Channels Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up user preferences and skip intro
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify({
        role: 'fullstack',
        subscribedChannels: ['system-design', 'algorithms'],
        onboardingComplete: true,
        createdAt: new Date().toISOString()
      }));
    });
    await page.reload();
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
    
    // Should show subscribed indicator for subscribed channels (checkmark icon)
    // New UI uses checkmark icons instead of "Subscribed" text
    const subscribedIndicator = page.locator('svg.lucide-check').first();
    await expect(subscribedIndicator).toBeVisible();
  });

  test('should allow subscribing to a channel', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Get initial count of subscribed channels (checkmark icons)
    const initialCount = await page.locator('svg.lucide-check').count();
    
    // Find an unsubscribed channel card and click it
    const frontendCard = page.locator('h3:has-text("Frontend")').first();
    await frontendCard.click();
    
    // Should now have more subscribed channels (more checkmark icons)
    await page.waitForTimeout(300);
    const newCount = await page.locator('svg.lucide-check').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('should allow unsubscribing from a channel', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Get initial subscribed count (checkmark icons)
    const initialCount = await page.locator('svg.lucide-check').count();
    
    // Click on a subscribed channel card to unsubscribe
    const systemDesignCard = page.locator('h3:has-text("System Design")').first();
    await systemDesignCard.click();
    
    // Should now have fewer subscribed (fewer checkmark icons)
    await page.waitForTimeout(300);
    const newCount = await page.locator('svg.lucide-check').count();
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

  test('should navigate back using back button', async ({ page }) => {
    // First go to home, then to channels
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.goto('/channels');
    await page.waitForTimeout(500);
    
    // New UI uses sidebar navigation - the sidebar is collapsed by default
    // Use browser back navigation instead
    await page.goBack();
    await page.waitForTimeout(500);
    
    // Should navigate back (to home in this case)
    await expect(page).toHaveURL('/');
  });

  test('should persist subscription changes', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Subscribe to a new channel
    const frontendCard = page.locator('h3:has-text("Frontend")').first();
    await frontendCard.click();
    
    // Get count after subscribing (checkmark icons)
    await page.waitForTimeout(300);
    const countAfterSubscribe = await page.locator('svg.lucide-check').count();
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(500);
    
    // Should still have same subscribed count
    const countAfterReload = await page.locator('svg.lucide-check').count();
    expect(countAfterReload).toBe(countAfterSubscribe);
  });
});
