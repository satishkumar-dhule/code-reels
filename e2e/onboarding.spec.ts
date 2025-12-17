import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate first-time user, but skip the intro animation
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('marvel-intro-seen', 'true'); // Skip intro but not onboarding
    });
    await page.reload();
  });

  test('should show onboarding for first-time users', async ({ page }) => {
    await page.goto('/');
    
    // Should see the onboarding screen
    await expect(page.getByText('Welcome to Learn_Reels')).toBeVisible();
    await expect(page.getByText('Select your role')).toBeVisible();
  });

  test('should display all role options', async ({ page }) => {
    await page.goto('/');
    
    // Check for role options
    await expect(page.getByText('Frontend Engineer')).toBeVisible();
    await expect(page.getByText('Backend Engineer')).toBeVisible();
    await expect(page.getByText('Full Stack Engineer')).toBeVisible();
    await expect(page.getByText('DevOps Engineer')).toBeVisible();
  });

  test('should allow selecting a role and continue', async ({ page }) => {
    await page.goto('/');
    
    // Select a role
    await page.getByText('Frontend Engineer').click();
    
    // Should show selected state
    await expect(page.getByText('Selected')).toBeVisible();
    
    // Click continue
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Should show recommended channels preview
    await expect(page.getByText('Your Personalized Channels')).toBeVisible();
  });

  test('should complete onboarding and show home page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for onboarding to load
    await expect(page.getByText('Welcome to Learn_Reels')).toBeVisible();
    
    // Select a role
    await page.getByText('Backend Engineer').click();
    await expect(page.getByText('Selected')).toBeVisible();
    
    // Click continue
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Wait for preview step to appear
    await expect(page.getByText('Your Personalized Channels')).toBeVisible({ timeout: 10000 });
    
    // Click Start Learning button - this should trigger navigation
    await page.getByRole('button', { name: /start learning/i }).click();
    
    // Wait for page navigation/reload
    await page.waitForURL('/', { timeout: 10000 });
    
    // Should be on home page - look for the h1 heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
  });

  test('should allow skipping onboarding', async ({ page }) => {
    await page.goto('/');
    
    // Click skip
    await page.getByText('Skip for now').click();
    
    // Should be on home page
    await expect(page.getByText('Learn_Reels')).toBeVisible();
  });
});
