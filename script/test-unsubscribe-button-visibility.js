#!/usr/bin/env node

/**
 * Test that the unsubscribe button is visible on channel cards
 */

import { chromium } from 'playwright';

async function testUnsubscribeButton() {
  console.log('\n🔍 Testing Unsubscribe Button Visibility\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5001', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    await page.waitForTimeout(2000);
    
    console.log('✅ Page loaded\n');
    
    // Check for channel cards
    const channelCards = await page.$$('[class*="group relative bg-card rounded-xl"]');
    console.log(`Found ${channelCards.length} channel cards\n`);
    
    if (channelCards.length === 0) {
      console.log('⚠️  No channel cards found. Make sure you have subscribed channels.');
      await browser.close();
      return;
    }
    
    // Check the first channel card
    const firstCard = channelCards[0];
    
    // Get the unsubscribe button
    const unsubscribeButton = await firstCard.$('button[title="Unsubscribe"]');
    
    if (!unsubscribeButton) {
      console.log('❌ Unsubscribe button not found!');
      await browser.close();
      return;
    }
    
    console.log('✅ Unsubscribe button found\n');
    
    // Check visibility
    const buttonInfo = await unsubscribeButton.evaluate((btn) => {
      const rect = btn.getBoundingClientRect();
      const styles = window.getComputedStyle(btn);
      
      return {
        isVisible: rect.width > 0 && rect.height > 0,
        opacity: styles.opacity,
        display: styles.display,
        visibility: styles.visibility,
        position: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        classes: btn.className,
      };
    });
    
    console.log('📊 Button Properties:');
    console.log(`  Opacity: ${buttonInfo.opacity}`);
    console.log(`  Display: ${buttonInfo.display}`);
    console.log(`  Visibility: ${buttonInfo.visibility}`);
    console.log(`  Size: ${buttonInfo.position.width}x${buttonInfo.position.height}px`);
    console.log(`  Position: (${buttonInfo.position.left}, ${buttonInfo.position.top})`);
    console.log(`  Is Visible: ${buttonInfo.isVisible ? '✅' : '❌'}\n`);
    
    // Check if button becomes more visible on hover
    await firstCard.hover();
    await page.waitForTimeout(500);
    
    const buttonInfoAfterHover = await unsubscribeButton.evaluate((btn) => {
      const styles = window.getComputedStyle(btn);
      return {
        opacity: styles.opacity,
      };
    });
    
    console.log('📊 After Hover:');
    console.log(`  Opacity: ${buttonInfoAfterHover.opacity}\n`);
    
    // Check for overflow issues on parent
    const parentOverflow = await firstCard.evaluate((card) => {
      const styles = window.getComputedStyle(card);
      return {
        overflow: styles.overflow,
        overflowX: styles.overflowX,
        overflowY: styles.overflowY,
      };
    });
    
    console.log('📊 Parent Card Overflow:');
    console.log(`  overflow: ${parentOverflow.overflow}`);
    console.log(`  overflow-x: ${parentOverflow.overflowX}`);
    console.log(`  overflow-y: ${parentOverflow.overflowY}\n`);
    
    if (parentOverflow.overflow === 'hidden' || parentOverflow.overflowX === 'hidden' || parentOverflow.overflowY === 'hidden') {
      console.log('⚠️  WARNING: Parent has overflow hidden, which may clip the button!\n');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/unsubscribe-button-test.png', fullPage: true });
    console.log('✅ Screenshot saved to test-results/unsubscribe-button-test.png\n');
    
    // Summary
    console.log('═'.repeat(60));
    if (buttonInfo.isVisible && parseFloat(buttonInfo.opacity) > 0.5) {
      console.log('✅ SUCCESS: Unsubscribe button is visible!');
    } else if (buttonInfo.isVisible && parseFloat(buttonInfo.opacity) > 0) {
      console.log('⚠️  PARTIAL: Button exists but has low opacity');
      console.log('   It should become fully visible on hover');
    } else {
      console.log('❌ FAILED: Unsubscribe button is not visible');
    }
    console.log('═'.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testUnsubscribeButton().catch(console.error);
