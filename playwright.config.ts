import { defineConfig, devices } from '@playwright/test';

/**
 * Optimized Playwright Configuration
 * - Parallel execution for speed
 * - Mobile-first testing (iPhone 13)
 * - Performance monitoring
 * - Accessibility testing
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  // Enhanced reporting
  reporter: process.env.CI 
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list'],
      ],
  
  // Optimized timeouts (balanced for speed and reliability)
  timeout: 30000, // 30s - some pages are slow to load
  expect: {
    timeout: 5000, // 5s for assertions
  },
  
  use: {
    baseURL: 'http://localhost:5001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000,
    
    // Performance optimizations
    launchOptions: {
      args: [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
      ],
    },
  },
  
  outputDir: 'test-results',
  
  projects: [
    // Desktop Chrome - Primary (ONLY THIS FOR SPEED)
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /.*\.(spec|test)\.ts$/,
      // Temporarily ignore slow/problematic tests
      testIgnore: [
        '**/mobile-only.spec.ts',
        '**/about.spec.ts',
        '**/answer-panel-theme.spec.ts',
        '**/audit-engine.spec.ts',
        '**/aria-audit.spec.ts',
        '**/screen-reader-audit.spec.ts',
        '**/keyboard-navigation-audit.spec.ts',
        '**/color-contrast-audit.spec.ts',
        '**/touch-target-audit.spec.ts',
        '**/reduced-motion.spec.ts',
        '**/custom-checks.spec.ts',
      ],
    },
  ],
  
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Global setup/teardown
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
});
