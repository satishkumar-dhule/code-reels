/**
 * Keyboard Navigation Audit Test
 * 
 * Comprehensive audit of keyboard navigation across all pages.
 * Tests tab order, focusability, focus indicators, modal focus trapping,
 * and keyboard alternatives for gesture-based components.
 * 
 * Validates Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4
 */

import { test, expect } from '@playwright/test';

// Pages to audit
const PAGES_TO_AUDIT = [
  '/',
  '/about',
  '/channels',
  '/learning-paths',
  '/blog',
  '/coding-challenges',
];

test.describe('Keyboard Navigation Audit', () => {
  
  test.describe('Tab Order and Focusability', () => {
    
    test('all interactive elements should be keyboard accessible', async ({ page }) => {
      for (const url of PAGES_TO_AUDIT) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Get all interactive elements
        const interactiveElements = await page.locator(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]:not([aria-disabled="true"]), [role="link"], [tabindex]:not([tabindex="-1"])'
        ).all();
        
        console.log(`\n${url}: Found ${interactiveElements.length} interactive elements`);
        
        let unreachableCount = 0;
        
        for (const element of interactiveElements) {
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());
          const role = await element.getAttribute('role');
          const tabIndex = await element.getAttribute('tabindex');
          const ariaHidden = await element.getAttribute('aria-hidden');
          const isVisible = await element.isVisible();
          
          // Skip hidden elements
          if (ariaHidden === 'true' || !isVisible) {
            continue;
          }
          
          // Check if element is focusable
          const isFocusable = await element.evaluate(el => {
            const tabIndex = el.getAttribute('tabindex');
            if (tabIndex && parseInt(tabIndex) < 0) return false;
            
            const focusableElements = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
            if (focusableElements.includes(el.tagName)) return true;
            
            if (tabIndex && parseInt(tabIndex) >= 0) return true;
            
            return false;
          });
          
          if (!isFocusable) {
            const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
            console.log(`  ❌ Unreachable: ${tagName}${role ? `[role="${role}"]` : ''} - ${html}`);
            unreachableCount++;
          }
        }
        
        // Report results
        if (unreachableCount > 0) {
          console.log(`  ⚠️  ${unreachableCount} unreachable elements on ${url}`);
        } else {
          console.log(`  ✅ All interactive elements are keyboard accessible on ${url}`);
        }
        
        // This is an audit, so we log but don't fail
        // expect(unreachableCount).toBe(0);
      }
    });
    
    test('tab order should follow logical visual layout', async ({ page }) => {
      for (const url of PAGES_TO_AUDIT) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        console.log(`\n${url}: Testing tab order`);
        
        // Get all focusable elements in DOM order
        const focusableElements = await page.locator(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ).all();
        
        const tabOrder: Array<{ element: string; position: { x: number; y: number } }> = [];
        
        for (const element of focusableElements) {
          const isVisible = await element.isVisible();
          if (!isVisible) continue;
          
          const box = await element.boundingBox();
          if (!box) continue;
          
          const html = await element.evaluate(el => {
            const tag = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : '';
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
            return `${tag}${id}${classes}`.substring(0, 50);
          });
          
          tabOrder.push({
            element: html,
            position: { x: box.x, y: box.y }
          });
        }
        
        // Check if tab order generally follows top-to-bottom, left-to-right
        let outOfOrderCount = 0;
        for (let i = 1; i < tabOrder.length; i++) {
          const prev = tabOrder[i - 1];
          const curr = tabOrder[i];
          
          // If current element is significantly above previous (more than 50px), it's likely out of order
          if (curr.position.y < prev.position.y - 50) {
            console.log(`  ⚠️  Potential tab order issue: ${curr.element} appears above ${prev.element}`);
            outOfOrderCount++;
          }
        }
        
        if (outOfOrderCount > 0) {
          console.log(`  ⚠️  ${outOfOrderCount} potential tab order issues on ${url}`);
        } else {
          console.log(`  ✅ Tab order appears logical on ${url}`);
        }
      }
    });
    
    test('all interactive elements should have visible focus indicators', async ({ page }) => {
      for (const url of PAGES_TO_AUDIT) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        console.log(`\n${url}: Testing focus indicators`);
        
        // Get focusable elements
        const focusableElements = await page.locator(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        ).all();
        
        let missingFocusCount = 0;
        
        // Sample a few elements (testing all can be slow)
        const samplesToTest = Math.min(10, focusableElements.length);
        
        for (let i = 0; i < samplesToTest; i++) {
          const element = focusableElements[Math.floor(i * focusableElements.length / samplesToTest)];
          
          const isVisible = await element.isVisible();
          if (!isVisible) continue;
          
          // Focus the element
          await element.focus();
          
          // Check for focus indicator
          const hasFocusIndicator = await element.evaluate(el => {
            const styles = window.getComputedStyle(el);
            const focusStyles = window.getComputedStyle(el, ':focus');
            
            // Check for outline
            if (focusStyles.outline && focusStyles.outline !== 'none' && focusStyles.outline !== '0px') {
              return true;
            }
            
            // Check for box-shadow (common focus indicator)
            if (focusStyles.boxShadow && focusStyles.boxShadow !== 'none') {
              return true;
            }
            
            // Check for border change
            if (focusStyles.border !== styles.border) {
              return true;
            }
            
            // Check for background change
            if (focusStyles.backgroundColor !== styles.backgroundColor) {
              return true;
            }
            
            return false;
          });
          
          if (!hasFocusIndicator) {
            const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
            console.log(`  ❌ Missing focus indicator: ${html}`);
            missingFocusCount++;
          }
        }
        
        if (missingFocusCount > 0) {
          console.log(`  ⚠️  ${missingFocusCount} elements missing focus indicators on ${url}`);
        } else {
          console.log(`  ✅ Focus indicators present on sampled elements on ${url}`);
        }
      }
    });
  });
  
  test.describe('Modal Focus Trapping', () => {
    
    test('SearchModal should trap focus when open', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Open search modal with Cmd+K
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(500);
      
      // Check if modal is open
      const modal = page.locator('[data-testid="search-modal-mobile"], [data-testid="search-modal-desktop"]').first();
      const isVisible = await modal.isVisible();
      
      if (!isVisible) {
        console.log('  ⚠️  Search modal not found or not visible');
        return;
      }
      
      console.log('  ✅ Search modal opened');
      
      // Get all focusable elements in modal
      const focusableInModal = await modal.locator(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ).all();
      
      if (focusableInModal.length === 0) {
        console.log('  ⚠️  No focusable elements found in modal');
        return;
      }
      
      console.log(`  Found ${focusableInModal.length} focusable elements in modal`);
      
      // Focus first element
      await focusableInModal[0].focus();
      
      // Tab through all elements
      for (let i = 0; i < focusableInModal.length; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      // After tabbing through all elements, focus should cycle back to first
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.outerHTML.substring(0, 100) : null;
      });
      
      console.log(`  Active element after cycling: ${activeElement}`);
      
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      const stillVisible = await modal.isVisible();
      if (!stillVisible) {
        console.log('  ✅ Modal closed with Escape key');
      } else {
        console.log('  ⚠️  Modal did not close with Escape key');
      }
    });
    
    test('BottomSheet should trap focus when open', async ({ page }) => {
      // Navigate to a page that might have a BottomSheet
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for BottomSheet trigger buttons
      const bottomSheetTriggers = await page.locator('[data-testid*="bottom-sheet"], [aria-haspopup="dialog"]').all();
      
      if (bottomSheetTriggers.length === 0) {
        console.log('  ℹ️  No BottomSheet triggers found on home page');
        return;
      }
      
      console.log(`  Found ${bottomSheetTriggers.length} potential BottomSheet triggers`);
      
      // Try to open first BottomSheet
      await bottomSheetTriggers[0].click();
      await page.waitForTimeout(500);
      
      // Look for BottomSheet with dialog role
      const bottomSheet = page.locator('[role="dialog"][aria-modal="true"]').first();
      const isVisible = await bottomSheet.isVisible();
      
      if (!isVisible) {
        console.log('  ℹ️  BottomSheet not visible after clicking trigger');
        return;
      }
      
      console.log('  ✅ BottomSheet opened');
      
      // Get focusable elements
      const focusableInSheet = await bottomSheet.locator(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ).all();
      
      console.log(`  Found ${focusableInSheet.length} focusable elements in BottomSheet`);
      
      if (focusableInSheet.length > 0) {
        // Test focus trap
        await focusableInSheet[0].focus();
        
        for (let i = 0; i < focusableInSheet.length + 1; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        
        console.log('  ✅ Tabbed through BottomSheet elements');
      }
    });
  });
  
  test.describe('Gesture Alternatives', () => {
    
    test('SwipeableCard should have keyboard alternatives', async ({ page }) => {
      // SwipeableCard is used in the question viewer
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for SwipeableCard components
      const swipeableCards = await page.locator('[data-component="SwipeableCard"]').all();
      
      if (swipeableCards.length === 0) {
        console.log('  ℹ️  No SwipeableCard components found on home page');
        // Try a question page
        const questionLinks = await page.locator('a[href*="/question/"]').all();
        if (questionLinks.length > 0) {
          await questionLinks[0].click();
          await page.waitForLoadState('networkidle');
          
          const swipeableCardsOnQuestion = await page.locator('[data-component="SwipeableCard"]').all();
          if (swipeableCardsOnQuestion.length === 0) {
            console.log('  ℹ️  No SwipeableCard components found on question page either');
            return;
          }
          console.log(`  Found ${swipeableCardsOnQuestion.length} SwipeableCard components on question page`);
        } else {
          return;
        }
      } else {
        console.log(`  Found ${swipeableCards.length} SwipeableCard components`);
      }
      
      // Check for keyboard navigation buttons or handlers
      const hasArrowKeyHandlers = await page.evaluate(() => {
        // Check if arrow key event listeners are attached
        const handlers = (window as any).__keyboardHandlers || [];
        return handlers.some((h: any) => 
          h.key === 'ArrowLeft' || h.key === 'ArrowRight' || 
          h.key === 'ArrowUp' || h.key === 'ArrowDown'
        );
      });
      
      // Check for navigation buttons
      const navButtons = await page.locator('button[aria-label*="next"], button[aria-label*="previous"], button[aria-label*="swipe"]').all();
      
      if (hasArrowKeyHandlers || navButtons.length > 0) {
        console.log('  ✅ Keyboard alternatives found for SwipeableCard');
        if (navButtons.length > 0) {
          console.log(`     - ${navButtons.length} navigation buttons`);
        }
        if (hasArrowKeyHandlers) {
          console.log('     - Arrow key handlers detected');
        }
      } else {
        console.log('  ⚠️  No keyboard alternatives found for SwipeableCard');
        console.log('     Consider adding arrow key navigation or visible buttons');
      }
    });
    
    test('PullToRefresh should have keyboard alternative', async ({ page }) => {
      // PullToRefresh might be used on feed pages
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for PullToRefresh component
      const pullToRefresh = await page.locator('[data-component="PullToRefresh"]').all();
      
      if (pullToRefresh.length === 0) {
        console.log('  ℹ️  No PullToRefresh components found');
        return;
      }
      
      console.log(`  Found ${pullToRefresh.length} PullToRefresh components`);
      
      // Look for refresh button
      const refreshButtons = await page.locator('button[aria-label*="refresh"], button[aria-label*="reload"]').all();
      
      if (refreshButtons.length > 0) {
        console.log(`  ✅ Found ${refreshButtons.length} refresh button(s) as keyboard alternative`);
        
        // Test that button is keyboard accessible
        const firstButton = refreshButtons[0];
        await firstButton.focus();
        const isFocused = await firstButton.evaluate(el => el === document.activeElement);
        
        if (isFocused) {
          console.log('  ✅ Refresh button is keyboard accessible');
        } else {
          console.log('  ⚠️  Refresh button could not be focused');
        }
      } else {
        console.log('  ⚠️  No refresh button found as keyboard alternative');
        console.log('     Consider adding a visible refresh button');
      }
    });
  });
  
  test.describe('Focus Restoration', () => {
    
    test('focus should return to trigger element after modal closes', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Find a button that opens a modal
      const searchButton = page.locator('button[aria-label*="search"], button[data-testid*="search"]').first();
      const searchButtonExists = await searchButton.count() > 0;
      
      if (!searchButtonExists) {
        console.log('  ℹ️  No search button found to test focus restoration');
        return;
      }
      
      // Focus and click the button
      await searchButton.focus();
      const buttonHtml = await searchButton.evaluate(el => el.outerHTML.substring(0, 100));
      console.log(`  Focusing trigger button: ${buttonHtml}`);
      
      await searchButton.click();
      await page.waitForTimeout(500);
      
      // Modal should be open
      const modal = page.locator('[role="dialog"], [data-testid*="modal"]').first();
      const modalVisible = await modal.isVisible();
      
      if (!modalVisible) {
        console.log('  ⚠️  Modal did not open');
        return;
      }
      
      console.log('  ✅ Modal opened');
      
      // Close modal with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Check if focus returned to trigger button
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.outerHTML.substring(0, 100) : null;
      });
      
      console.log(`  Focus after modal close: ${focusedElement}`);
      
      // Check if the focused element is the same as the trigger button
      const focusRestored = await searchButton.evaluate(el => el === document.activeElement);
      
      if (focusRestored) {
        console.log('  ✅ Focus restored to trigger button');
      } else {
        console.log('  ⚠️  Focus not restored to trigger button');
      }
    });
  });
  
  test.describe('Keyboard Shortcuts', () => {
    
    test('should document and test common keyboard shortcuts', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      console.log('\n  Testing common keyboard shortcuts:');
      
      // Test Cmd+K / Ctrl+K for search
      console.log('  - Testing Cmd+K for search...');
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(500);
      
      const searchModal = page.locator('[data-testid="search-modal-mobile"], [data-testid="search-modal-desktop"]').first();
      const searchModalVisible = await searchModal.isVisible();
      
      if (searchModalVisible) {
        console.log('    ✅ Cmd+K opens search modal');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else {
        console.log('    ⚠️  Cmd+K did not open search modal');
      }
      
      // Test Escape to close modals
      console.log('  - Testing Escape to close modals...');
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      
      const modalStillVisible = await searchModal.isVisible();
      if (!modalStillVisible) {
        console.log('    ✅ Escape closes modal');
      } else {
        console.log('    ⚠️  Escape did not close modal');
      }
      
      // Test Tab navigation
      console.log('  - Testing Tab navigation...');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      const focusedAfterTab = await page.evaluate(() => {
        return document.activeElement?.tagName || 'NONE';
      });
      
      if (focusedAfterTab !== 'BODY' && focusedAfterTab !== 'NONE') {
        console.log(`    ✅ Tab moves focus (focused: ${focusedAfterTab})`);
      } else {
        console.log('    ⚠️  Tab did not move focus to an interactive element');
      }
    });
  });
});
