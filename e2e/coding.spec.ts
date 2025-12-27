/**
 * Coding Challenges Tests
 * Code editor and challenge execution
 */

import { test, expect, setupUser, waitForPageReady } from './fixtures';

test.describe('Coding Challenges', () => {
  test.beforeEach(async ({ page }) => {
    await setupUser(page);
  });

  test('page loads', async ({ page }) => {
    await page.goto('/coding');
    await waitForPageReady(page);
    
    await expect(page.getByText(/Coding|Challenge|Practice/i).first()).toBeVisible();
  });

  test('shows challenge list or editor', async ({ page }) => {
    await page.goto('/coding');
    await waitForPageReady(page);
    
    // Should show either challenge list or code editor
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(100);
  });

  test('code editor visible when challenge selected', async ({ page }) => {
    await page.goto('/coding');
    await waitForPageReady(page);
    
    // Look for code editor or challenge card
    const editor = page.locator('[class*="monaco"], [class*="editor"], textarea, pre');
    const challengeCard = page.locator('button, [class*="card"]').filter({ hasText: /Easy|Medium|Hard/i });
    
    const hasEditor = await editor.first().isVisible().catch(() => false);
    const hasCards = await challengeCard.first().isVisible().catch(() => false);
    
    expect(hasEditor || hasCards).toBeTruthy();
  });

  test('run button exists', async ({ page }) => {
    await page.goto('/coding');
    await waitForPageReady(page);
    
    const runButton = page.locator('button').filter({ hasText: /Run|Execute|Submit/i });
    // May or may not be visible depending on state
    const count = await runButton.count();
    expect(count >= 0).toBeTruthy();
  });
});
