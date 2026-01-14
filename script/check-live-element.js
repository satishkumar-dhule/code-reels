#!/usr/bin/env node

/**
 * Check specific element on live site: https://open-interview.github.io/
 * XPath: /html/body/div/div[1]/div[2]/main/div/div/div/div[1]/section[2]/div[2]/div[6]/div[3]/div[2]
 */

import { chromium } from 'playwright';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkLiveElement() {
  log('\n🔍 Checking Element on Live Site', 'cyan');
  log('═'.repeat(80), 'cyan');
  log('URL: https://open-interview.github.io/', 'blue');
  log('XPath: /html/body/div/div[1]/div[2]/main/div/div/div/div[1]/section[2]/div[2]/div[6]/div[3]/div[2]', 'blue');
  log('═'.repeat(80), 'cyan');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();
  
  try {
    log('\n📡 Loading page...', 'yellow');
    await page.goto('https://open-interview.github.io/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    await page.waitForTimeout(2000);
    
    log('✅ Page loaded', 'green');
    
    // Check the specific XPath
    const xpath = '/html/body/div/div[1]/div[2]/main/div/div/div/div[1]/section[2]/div[2]/div[6]/div[3]/div[2]';
    
    log(`\n📍 Checking XPath element...`, 'blue');
    
    const element = page.locator(`xpath=${xpath}`);
    const count = await element.count();
    
    log(`Found ${count} element(s)`, count > 0 ? 'green' : 'red');
    
    if (count > 0) {
      // Get element details
      const details = await element.first().evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        
        // Get parent chain
        const parents = [];
        let current = el.parentElement;
        let depth = 0;
        while (current && depth < 5) {
          const parentRect = current.getBoundingClientRect();
          const parentStyles = window.getComputedStyle(current);
          parents.push({
            tagName: current.tagName,
            className: current.className,
            overflow: parentStyles.overflow,
            overflowX: parentStyles.overflowX,
            overflowY: parentStyles.overflowY,
            display: parentStyles.display,
            visibility: parentStyles.visibility,
            rect: {
              x: parentRect.x,
              y: parentRect.y,
              width: parentRect.width,
              height: parentRect.height,
            }
          });
          current = current.parentElement;
          depth++;
        }
        
        return {
          element: {
            tagName: el.tagName,
            className: el.className,
            innerHTML: el.innerHTML.substring(0, 200),
            textContent: el.textContent?.substring(0, 100),
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left,
              bottom: rect.bottom,
              right: rect.right,
            },
            styles: {
              width: styles.width,
              height: styles.height,
              padding: styles.padding,
              margin: styles.margin,
              overflow: styles.overflow,
              overflowX: styles.overflowX,
              overflowY: styles.overflowY,
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
              transform: styles.transform,
              position: styles.position,
              zIndex: styles.zIndex,
              background: styles.background,
              border: styles.border,
            },
            computed: {
              isVisible: rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0,
              isInViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
              hasSize: rect.width > 0 && rect.height > 0,
            }
          },
          parents: parents,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
          }
        };
      });
      
      log('\n📊 Element Details:', 'yellow');
      log(`  Tag: ${details.element.tagName}`, 'reset');
      log(`  Classes: ${details.element.className || '(none)'}`, 'reset');
      log(`  Text: ${details.element.textContent || '(empty)'}`, 'reset');
      log(`  Position: (${details.element.rect.x.toFixed(1)}, ${details.element.rect.y.toFixed(1)})`, 'reset');
      log(`  Size: ${details.element.rect.width.toFixed(1)}x${details.element.rect.height.toFixed(1)}px`, 'reset');
      
      log('\n🎨 Styles:', 'yellow');
      log(`  Display: ${details.element.styles.display}`, 'reset');
      log(`  Visibility: ${details.element.styles.visibility}`, 'reset');
      log(`  Opacity: ${details.element.styles.opacity}`, 'reset');
      log(`  Overflow: ${details.element.styles.overflow}`, 'reset');
      log(`  Position: ${details.element.styles.position}`, 'reset');
      log(`  Z-Index: ${details.element.styles.zIndex}`, 'reset');
      log(`  Transform: ${details.element.styles.transform}`, 'reset');
      
      log('\n🔍 Computed State:', 'yellow');
      log(`  Has Size: ${details.element.computed.hasSize ? '✅' : '❌'}`, details.element.computed.hasSize ? 'green' : 'red');
      log(`  Is Visible: ${details.element.computed.isVisible ? '✅' : '❌'}`, details.element.computed.isVisible ? 'green' : 'red');
      log(`  In Viewport: ${details.element.computed.isInViewport ? '✅' : '❌'}`, details.element.computed.isInViewport ? 'green' : 'red');
      
      // Check if element is actually visible
      if (!details.element.computed.isVisible) {
        log('\n❌ VISIBILITY ISSUE DETECTED:', 'red');
        if (!details.element.computed.hasSize) {
          log('  - Element has no size (width or height is 0)', 'red');
        }
        if (details.element.styles.visibility === 'hidden') {
          log('  - visibility: hidden', 'red');
        }
        if (parseFloat(details.element.styles.opacity) === 0) {
          log('  - opacity: 0', 'red');
        }
        if (details.element.styles.display === 'none') {
          log('  - display: none', 'red');
        }
      }
      
      if (!details.element.computed.isInViewport) {
        log('\n⚠️  Element is outside viewport:', 'yellow');
        log(`  Viewport: ${details.viewport.width}x${details.viewport.height}`, 'reset');
        log(`  Element position: (${details.element.rect.x.toFixed(1)}, ${details.element.rect.y.toFixed(1)})`, 'reset');
        
        if (details.element.rect.top < 0) log('  - Above viewport', 'yellow');
        if (details.element.rect.bottom > details.viewport.height) log('  - Below viewport', 'yellow');
        if (details.element.rect.left < 0) log('  - Left of viewport', 'yellow');
        if (details.element.rect.right > details.viewport.width) log('  - Right of viewport', 'yellow');
      }
      
      log('\n👪 Parent Chain:', 'yellow');
      details.parents.forEach((parent, i) => {
        log(`  ${i + 1}. ${parent.tagName} ${parent.className ? `(${parent.className})` : ''}`, 'reset');
        log(`     Overflow: ${parent.overflow}, Display: ${parent.display}, Visibility: ${parent.visibility}`, 'reset');
        if (parent.overflow !== 'visible' && parent.overflow !== 'clip') {
          log(`     ⚠️  Parent has overflow: ${parent.overflow}`, 'yellow');
        }
      });
      
      // Take screenshot
      log('\n📸 Taking screenshots...', 'blue');
      await page.screenshot({ path: 'test-results/live-site-full.png', fullPage: true });
      log('✅ Full page screenshot: test-results/live-site-full.png', 'green');
      
      try {
        await element.first().screenshot({ path: 'test-results/live-site-element.png' });
        log('✅ Element screenshot: test-results/live-site-element.png', 'green');
      } catch (e) {
        log('⚠️  Could not screenshot element (might be invisible)', 'yellow');
      }
      
      // Highlight element
      await element.first().evaluate((el) => {
        el.style.outline = '3px solid red';
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      });
      
      log('\n✅ Element highlighted in red', 'green');
      
    } else {
      log('\n❌ Element not found at specified XPath!', 'red');
      
      // Try to understand the page structure
      log('\n🔍 Analyzing page structure...', 'blue');
      
      const structure = await page.evaluate(() => {
        const body = document.body;
        const mainDiv = body.querySelector('div');
        const secondDiv = mainDiv?.children[0];
        const thirdDiv = secondDiv?.children[1];
        
        return {
          bodyChildren: body.children.length,
          mainDivChildren: mainDiv?.children.length,
          secondDivChildren: secondDiv?.children.length,
          thirdDivChildren: thirdDiv?.children.length,
          thirdDivTag: thirdDiv?.tagName,
        };
      });
      
      log(`  Body children: ${structure.bodyChildren}`, 'reset');
      log(`  Main div children: ${structure.mainDivChildren}`, 'reset');
      log(`  Second div children: ${structure.secondDivChildren}`, 'reset');
      log(`  Third div (should be main): ${structure.thirdDivTag}, children: ${structure.thirdDivChildren}`, 'reset');
      
      // Try alternative selectors
      log('\n🔍 Trying alternative selectors...', 'blue');
      
      const alternatives = [
        'section:nth-child(2) div:nth-child(2) div:nth-child(6) div:nth-child(3) div:nth-child(2)',
        'main section:nth-of-type(2)',
        'main section',
      ];
      
      for (const selector of alternatives) {
        const count = await page.locator(selector).count();
        log(`  ${selector}: ${count} found`, count > 0 ? 'green' : 'reset');
      }
    }
    
    log('\n═'.repeat(80), 'cyan');
    log('✅ Analysis complete', 'green');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await browser.close();
  }
}

checkLiveElement().catch(console.error);
