#!/usr/bin/env node

/**
 * Analyze the actual structure of the live site
 */

import { chromium } from 'playwright';
import fs from 'fs';

async function analyzePage() {
  console.log('\n🔍 Analyzing Page Structure\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://open-interview.github.io/', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    await page.waitForTimeout(2000);
    
    console.log('✅ Page loaded\n');
    
    // Get the full DOM structure
    const structure = await page.evaluate(() => {
      function getStructure(element, depth = 0, maxDepth = 10) {
        if (depth > maxDepth) return null;
        
        const info = {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          classes: element.className || null,
          children: [],
          text: element.childNodes.length === 1 && element.childNodes[0].nodeType === 3 
            ? element.textContent?.trim().substring(0, 50) 
            : null,
          childCount: element.children.length,
        };
        
        // Only traverse if we have children and haven't hit max depth
        if (element.children.length > 0 && depth < maxDepth) {
          for (let i = 0; i < Math.min(element.children.length, 20); i++) {
            const child = getStructure(element.children[i], depth + 1, maxDepth);
            if (child) info.children.push(child);
          }
        }
        
        return info;
      }
      
      return getStructure(document.body, 0, 8);
    });
    
    // Pretty print the structure
    function printStructure(node, indent = 0) {
      const prefix = '  '.repeat(indent);
      let line = `${prefix}<${node.tag}`;
      if (node.id) line += ` id="${node.id}"`;
      if (node.classes) line += ` class="${node.classes}"`;
      if (node.childCount > 0) line += ` (${node.childCount} children)`;
      line += '>';
      if (node.text) line += ` ${node.text}`;
      
      console.log(line);
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => printStructure(child, indent + 1));
      }
    }
    
    console.log('📊 DOM Structure:\n');
    printStructure(structure);
    
    // Save to file
    fs.writeFileSync('test-results/page-structure.json', JSON.stringify(structure, null, 2));
    console.log('\n✅ Full structure saved to test-results/page-structure.json');
    
    // Look for sections specifically
    console.log('\n🔍 Looking for sections...\n');
    const sections = await page.evaluate(() => {
      const allSections = document.querySelectorAll('section');
      return Array.from(allSections).map((section, i) => ({
        index: i,
        id: section.id || null,
        classes: section.className || null,
        childCount: section.children.length,
        text: section.textContent?.trim().substring(0, 100),
      }));
    });
    
    sections.forEach(section => {
      console.log(`Section ${section.index}:`);
      console.log(`  ID: ${section.id || '(none)'}`);
      console.log(`  Classes: ${section.classes || '(none)'}`);
      console.log(`  Children: ${section.childCount}`);
      console.log(`  Text: ${section.text || '(empty)'}`);
      console.log('');
    });
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/page-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved to test-results/page-screenshot.png\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

analyzePage().catch(console.error);
