#!/usr/bin/env node

/**
 * Help identify invisible elements on any page
 * This script will check common pages and look for visibility issues
 */

import { chromium } from 'playwright';

async function checkPages() {
  console.log('\n🔍 Checking for Invisible Elements\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Check different pages
    const pages = [
      'https://open-interview.github.io/',
      'https://open-interview.github.io/#/channels',
      'https://open-interview.github.io/#/learning-paths',
    ];
    
    for (const url of pages) {
      console.log(`\n📄 Checking: ${url}`);
      console.log('─'.repeat(80));
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        
        // Check for sections
        const sections = await page.$$('section');
        console.log(`  Found ${sections.length} section elements`);
        
        if (sections.length > 0) {
          // Check each section for visibility issues
          for (let i = 0; i < sections.length; i++) {
            const section = sections[i];
            const info = await section.evaluate((el, index) => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              
              // Check all deeply nested divs for visibility issues
              const findInvisibleElements = (element, path = '') => {
                const issues = [];
                const rect = element.getBoundingClientRect();
                const styles = window.getComputedStyle(element);
                
                const isInvisible = 
                  rect.width === 0 || 
                  rect.height === 0 || 
                  styles.visibility === 'hidden' || 
                  parseFloat(styles.opacity) === 0 ||
                  styles.display === 'none';
                
                if (isInvisible) {
                  issues.push({
                    path,
                    tag: element.tagName,
                    className: element.className,
                    reason: rect.width === 0 ? 'width=0' :
                            rect.height === 0 ? 'height=0' :
                            styles.visibility === 'hidden' ? 'visibility:hidden' :
                            parseFloat(styles.opacity) === 0 ? 'opacity:0' :
                            'display:none',
                  });
                }
                
                // Check children (limit depth)
                if (path.split('/').length < 10) {
                  Array.from(element.children).forEach((child, i) => {
                    issues.push(...findInvisibleElements(child, `${path}/${child.tagName.toLowerCase()}[${i+1}]`));
                  });
                }
                
                return issues;
              };
              
              return {
                index,
                visible: rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden',
                rect: { width: rect.width, height: rect.height },
                className: el.className,
                invisibleElements: findInvisibleElements(el, `section[${index + 1}]`),
              };
            }, i);
            
            if (info.invisibleElements.length > 0) {
              console.log(`\n  ⚠️  Section ${i + 1} has ${info.invisibleElements.length} invisible elements:`);
              info.invisibleElements.slice(0, 10).forEach(issue => {
                console.log(`    ${issue.path}`);
                console.log(`      Tag: ${issue.tag}, Reason: ${issue.reason}`);
                if (issue.className) console.log(`      Class: ${issue.className}`);
              });
              if (info.invisibleElements.length > 10) {
                console.log(`    ... and ${info.invisibleElements.length - 10} more`);
              }
            }
          }
        }
        
        // Look for elements with overflow issues
        const overflowIssues = await page.evaluate(() => {
          const issues = [];
          const allElements = document.querySelectorAll('*');
          
          allElements.forEach((el, index) => {
            if (index > 1000) return; // Limit check
            
            const styles = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            // Check if element has overflow hidden and children extending beyond
            if (styles.overflow === 'hidden' || styles.overflowX === 'hidden' || styles.overflowY === 'hidden') {
              const children = Array.from(el.children);
              const hasOverflowingChild = children.some(child => {
                const childRect = child.getBoundingClientRect();
                return (
                  childRect.left < rect.left ||
                  childRect.right > rect.right ||
                  childRect.top < rect.top ||
                  childRect.bottom > rect.bottom
                );
              });
              
              if (hasOverflowingChild) {
                issues.push({
                  tag: el.tagName,
                  className: el.className,
                  overflow: styles.overflow,
                  overflowX: styles.overflowX,
                  overflowY: styles.overflowY,
                });
              }
            }
          });
          
          return issues;
        });
        
        if (overflowIssues.length > 0) {
          console.log(`\n  ⚠️  Found ${overflowIssues.length} elements with overflow clipping:`);
          overflowIssues.slice(0, 5).forEach(issue => {
            console.log(`    ${issue.tag} (${issue.className || 'no class'})`);
            console.log(`      overflow: ${issue.overflow}, overflowX: ${issue.overflowX}, overflowY: ${issue.overflowY}`);
          });
        }
        
      } catch (error) {
        console.log(`  ❌ Error loading page: ${error.message}`);
      }
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 To check a specific element, please provide:');
    console.log('  1. The exact URL of the page');
    console.log('  2. A description of what element you\'re looking for');
    console.log('  3. Or a CSS selector instead of XPath\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkPages().catch(console.error);
