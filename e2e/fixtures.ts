/**
 * Shared Test Fixtures
 * Common setup, utilities, and test data
 */

import { test as base, expect, Page } from '@playwright/test';

// Default user preferences for authenticated state
export const DEFAULT_USER = {
  role: 'fullstack',
  subscribedChannels: ['system-design', 'algorithms', 'frontend', 'backend', 'devops'],
  onboardingComplete: true,
  createdAt: new Date().toISOString(),
};

// Default credits state
export const DEFAULT_CREDITS = {
  balance: 500,
  totalEarned: 500,
  totalSpent: 0,
  usedCoupons: [],
  initialized: true,
};

// Setup authenticated user state
export async function setupUser(page: Page, options?: Partial<typeof DEFAULT_USER>) {
  const prefs = { ...DEFAULT_USER, ...options };
  await page.addInitScript((prefs) => {
    localStorage.setItem('marvel-intro-seen', 'true');
    localStorage.setItem('user-preferences', JSON.stringify(prefs));
    localStorage.setItem('user-credits', JSON.stringify({
      balance: 500,
      totalEarned: 500,
      totalSpent: 0,
      usedCoupons: [],
      initialized: true,
    }));
  }, prefs);
}

// Setup fresh user (no onboarding)
export async function setupFreshUser(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('user-preferences');
    localStorage.removeItem('user-credits');
    localStorage.setItem('marvel-intro-seen', 'true');
  });
}

// Wait for page to be ready
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

// Check for no horizontal overflow
export async function checkNoOverflow(page: Page) {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
}

// Check for console errors
export function setupErrorCapture(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  return errors;
}

// Extended test with isMobile fixture based on viewport
export const test = base.extend<{
  authenticatedPage: Page;
  isMobile: boolean;
}>({
  authenticatedPage: async ({ page }, use) => {
    await setupUser(page);
    await use(page);
  },
  // Determine isMobile based on project name or viewport - use testInfo
  isMobile: [async ({}, use, testInfo) => {
    // Check if running in mobile project
    const isMobile = testInfo.project.name === 'mobile-chrome' || 
                     testInfo.project.name.includes('mobile') ||
                     (testInfo.project.use?.viewport?.width ?? 1280) < 1024;
    await use(isMobile);
  }, { scope: 'test' }],
});

export { expect };
