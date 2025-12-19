/**
 * Screenshot automation script for README
 * Takes beautiful screenshots of the app
 */

import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE_URL = 'http://localhost:3333';
const SCREENSHOT_DIR = './docs/screenshots';

async function setupAndSkipIntros(page, theme = 'dark') {
  // Wait for page to load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  
  // Check if intro is showing and skip it
  const skipButton = page.locator('button:has-text("Skip")');
  try {
    await skipButton.waitFor({ state: 'visible', timeout: 2000 });
    await skipButton.click();
    await page.waitForTimeout(800);
  } catch {
    // Intro not showing
  }
  
  // Set up localStorage with correct structure
  await page.evaluate((theme) => {
    // User preferences (the main one that controls onboarding)
    const userPrefs = {
      role: 'fullstack',
      subscribedChannels: ['system-design', 'algorithms', 'frontend', 'devops', 'generative-ai', 'machine-learning'],
      onboardingComplete: true,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('user-preferences', JSON.stringify(userPrefs));
    
    // Marvel intro seen
    localStorage.setItem('marvel-intro-seen', 'true');
    
    // Theme
    localStorage.setItem('theme', theme);
    
    // Progress data
    localStorage.setItem('progress-system-design', JSON.stringify(['sd-1', 'sd-2', 'sd-3', 'sd-4', 'sd-5', 'sd-6', 'sd-7', 'sd-8', 'sd-9', 'sd-10']));
    localStorage.setItem('progress-algorithms', JSON.stringify(['algo-1', 'algo-2', 'algo-3', 'algo-4', 'algo-5']));
    localStorage.setItem('progress-frontend', JSON.stringify(['fe-1', 'fe-2', 'fe-3', 'fe-4']));
    localStorage.setItem('progress-devops', JSON.stringify(['devops-1', 'devops-2', 'devops-3']));
    localStorage.setItem('progress-generative-ai', JSON.stringify(['genai-1', 'genai-2']));
  }, theme);
}

async function takeScreenshots() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  
  console.log('📸 Taking screenshots...\n');

  // ============ DESKTOP DARK MODE ============
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark'
  });
  const desktopPage = await desktopContext.newPage();

  // Initial setup - go to page, skip intros, set localStorage
  await desktopPage.goto(BASE_URL);
  await setupAndSkipIntros(desktopPage, 'dark');

  // 1. HOME PAGE - reload to apply localStorage
  console.log('1. Home page (desktop dark)...');
  await desktopPage.reload({ waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2500);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'home-desktop.png'),
    animations: 'disabled'
  });

  // 2. CHANNELS PAGE
  console.log('2. All channels page...');
  await desktopPage.goto(BASE_URL + '/channels', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'channels-desktop.png'),
    animations: 'disabled'
  });

  // 3. QUESTION REELS - System Design
  console.log('3. Question reels page (System Design)...');
  await desktopPage.goto(BASE_URL + '/channel/system-design/0', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'reels-desktop.png'),
    animations: 'disabled'
  });

  // 4. Different channel - Algorithms
  console.log('4. Question reels (Algorithms)...');
  await desktopPage.goto(BASE_URL + '/channel/algorithms/2', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'answer-desktop.png'),
    animations: 'disabled'
  });

  // 5. STATS PAGE
  console.log('5. Stats page...');
  await desktopPage.goto(BASE_URL + '/stats', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'stats-desktop.png'),
    animations: 'disabled'
  });

  // 6. BADGES PAGE
  console.log('6. Badges page...');
  await desktopPage.goto(BASE_URL + '/badges', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'badges-desktop.png'),
    animations: 'disabled'
  });

  // 7. TESTS PAGE
  console.log('7. Tests page...');
  await desktopPage.goto(BASE_URL + '/tests', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'tests-desktop.png'),
    animations: 'disabled'
  });

  // ============ DESKTOP LIGHT MODE ============
  console.log('8. Light mode home...');
  const lightContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'light'
  });
  const lightPage = await lightContext.newPage();
  
  await lightPage.goto(BASE_URL);
  await setupAndSkipIntros(lightPage, 'light');
  await lightPage.reload({ waitUntil: 'networkidle' });
  await lightPage.waitForTimeout(2500);
  await lightPage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'home-light.png'),
    animations: 'disabled'
  });

  // ============ MOBILE ============
  console.log('9. Mobile home...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    colorScheme: 'dark',
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(BASE_URL);
  await setupAndSkipIntros(mobilePage, 'dark');
  await mobilePage.reload({ waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2500);
  await mobilePage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'home-mobile.png'),
    animations: 'disabled'
  });

  // 10. Mobile reels
  console.log('10. Mobile reels...');
  await mobilePage.goto(BASE_URL + '/channel/system-design/0', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(3000);
  await mobilePage.screenshot({ 
    path: path.join(SCREENSHOT_DIR, 'reels-mobile.png'),
    animations: 'disabled'
  });

  await browser.close();
  
  console.log('\n✅ Screenshots saved to', SCREENSHOT_DIR);
}

takeScreenshots().catch(console.error);
