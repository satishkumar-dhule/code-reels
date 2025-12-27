#!/usr/bin/env node
/**
 * Screenshot capture script using Playwright
 * Takes screenshots of key pages for README documentation
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5005';
const OUTPUT_DIR = 'docs/screenshots';

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Default user preferences (skip onboarding, set role and channels)
const DEFAULT_USER_PREFS = {
  role: 'fullstack',
  subscribedChannels: ['system-design', 'algorithms', 'frontend', 'backend', 'devops'],
  onboardingComplete: true,
  createdAt: new Date().toISOString(),
};

const DEFAULT_CREDITS = {
  balance: 500,
  totalEarned: 500,
  totalSpent: 0,
  usedCoupons: [],
  initialized: true,
};

const screenshots = [
  // Desktop screenshots (1280x800)
  { name: 'home-desktop.png', url: '/', viewport: { width: 1280, height: 800 }, wait: 2000 },
  { name: 'channels-desktop.png', url: '/channels', viewport: { width: 1280, height: 800 }, wait: 1500 },
  { name: 'reels-desktop.png', url: '/channel/system-design', viewport: { width: 1280, height: 800 }, wait: 2000 },
  { name: 'stats-desktop.png', url: '/stats', viewport: { width: 1280, height: 800 }, wait: 1500 },
  { name: 'coding-desktop.png', url: '/coding', viewport: { width: 1280, height: 800 }, wait: 2000 },
  { name: 'voice-interview-desktop.png', url: '/voice-interview', viewport: { width: 1280, height: 800 }, wait: 2000 },
  { name: 'tests-desktop.png', url: '/tests', viewport: { width: 1280, height: 800 }, wait: 1500 },
  { name: 'profile-desktop.png', url: '/profile', viewport: { width: 1280, height: 800 }, wait: 1500 },
  
  // Mobile screenshots (390x844 - iPhone 14 Pro)
  { name: 'home-mobile.png', url: '/', viewport: { width: 390, height: 844 }, wait: 2000 },
  { name: 'reels-mobile.png', url: '/channel/system-design', viewport: { width: 390, height: 844 }, wait: 2000 },
  
  // Light mode
  { name: 'home-light.png', url: '/?theme=light', viewport: { width: 1280, height: 800 }, wait: 2000, theme: 'light' },
];

async function takeScreenshots() {
  console.log('🎬 Starting screenshot capture...\n');
  
  const browser = await chromium.launch({ headless: true });
  
  for (const shot of screenshots) {
    console.log(`📸 Capturing ${shot.name}...`);
    
    const context = await browser.newContext({
      viewport: shot.viewport,
      colorScheme: shot.theme === 'light' ? 'light' : 'dark',
    });
    
    const page = await context.newPage();
    
    // Set localStorage to skip intro, complete onboarding, and set user preferences
    await page.addInitScript(({ prefs, credits, theme }) => {
      localStorage.setItem('marvel-intro-seen', 'true');
      localStorage.setItem('user-preferences', JSON.stringify(prefs));
      localStorage.setItem('user-credits', JSON.stringify(credits));
      if (theme === 'light') {
        localStorage.setItem('theme', 'light');
      }
    }, { prefs: DEFAULT_USER_PREFS, credits: DEFAULT_CREDITS, theme: shot.theme });
    
    try {
      await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(shot.wait || 1000);
      
      // Take screenshot
      const outputPath = path.join(OUTPUT_DIR, shot.name);
      await page.screenshot({ path: outputPath, fullPage: false });
      console.log(`   ✓ Saved to ${outputPath}`);
    } catch (err) {
      console.error(`   ✗ Failed: ${err.message}`);
    }
    
    await context.close();
  }
  
  await browser.close();
  console.log('\n✅ Screenshot capture complete!');
}

takeScreenshots().catch(console.error);
