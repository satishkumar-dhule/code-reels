/**
 * Viewport Measurement Helpers
 * 
 * Generic viewport measurement utilities that can be used for any device.
 * These helpers detect clipping, overflow, and viewport compliance issues.
 */

import { Page } from '@playwright/test';
import type { AuditIssue } from './iphone13-helpers';

// ============================================================================
// VIEWPORT MEASUREMENT UTILITIES
// ============================================================================

/**
 * Check if an element is fully within the viewport
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @returns True if element is fully within viewport
 */
export async function isElementInViewport(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return true; // Element not visible, skip check
    }
    
    const viewport = page.viewportSize();
    if (!viewport) {
      return true; // No viewport size, skip check
    }
    
    const isInViewport = 
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height;
    
    return isInViewport;
  } catch (error) {
    return true; // Element not found, skip check
  }
}

/**
 * Get the bounding box for an element
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @returns Bounding box with DOMRect-like properties or null if element not found
 */
export async function getElementBounds(
  page: Page,
  selector: string
): Promise<{ x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number } | null> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return null;
    }
    
    // Return DOMRect-like object with all properties
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height,
      left: box.x,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check if an element is clipped at viewport edges
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @param viewport - Viewport dimensions
 * @returns True if element is clipped
 */
export async function isElementClipped(
  page: Page,
  selector: string,
  viewport: { width: number; height: number }
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return false; // Element not visible, not clipped
    }
    
    // Check if any part of the element extends beyond viewport
    const isClipped = 
      box.x < 0 ||
      box.y < 0 ||
      box.x + box.width > viewport.width ||
      box.y + box.height > viewport.height;
    
    return isClipped;
  } catch (error) {
    return false; // Element not found, not clipped
  }
}

/**
 * Check for horizontal overflow on the page
 * 
 * @param page - Playwright page object
 * @returns Object with overflow status and elements causing overflow
 */
export async function checkHorizontalOverflow(
  page: Page
): Promise<{ hasOverflow: boolean; elements: string[] }> {
  const viewport = page.viewportSize();
  if (!viewport) {
    return { hasOverflow: false, elements: [] };
  }
  
  const result = await page.evaluate((viewportWidth) => {
    const body = document.body;
    const html = document.documentElement;
    
    // Check if page has horizontal overflow
    const hasOverflow = 
      body.scrollWidth > viewportWidth ||
      html.scrollWidth > viewportWidth;
    
    if (!hasOverflow) {
      return { hasOverflow: false, elements: [] };
    }
    
    // Find elements causing overflow
    const elements = Array.from(document.querySelectorAll('*'));
    const overflowingElements: string[] = [];
    
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      
      // Skip elements that are intentionally scrollable
      const style = window.getComputedStyle(el);
      const isScrollable = 
        style.overflowX === 'scroll' ||
        style.overflowX === 'auto';
      
      if (isScrollable) {
        continue;
      }
      
      // Check if element extends beyond viewport
      if (rect.right > viewportWidth) {
        const selector = 
          el.tagName.toLowerCase() +
          (el.id ? `#${el.id}` : '') +
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        
        overflowingElements.push(selector);
      }
    }
    
    return {
      hasOverflow: true,
      elements: overflowingElements.slice(0, 10), // Limit to first 10
    };
  }, viewport.width);
  
  return result;
}

/**
 * Check all visible elements for viewport compliance
 * 
 * @param page - Playwright page object
 * @param viewport - Viewport dimensions
 * @returns Array of audit issues for clipped elements
 */
export async function checkViewportCompliance(
  page: Page,
  viewport: { width: number; height: number }
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Check important content elements
  const contentSelectors = [
    'h1, h2, h3, h4, h5, h6',
    'p',
    'button',
    'a',
    'input',
    'select',
    'textarea',
    'img',
    '[role="button"]',
    '[role="link"]',
  ];
  
  for (const selector of contentSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      
      try {
        const box = await element.boundingBox();
        
        if (!box) continue;
        
        // Check if element is clipped
        const clippedLeft = box.x < 0;
        const clippedTop = box.y < 0;
        const clippedRight = box.x + box.width > viewport.width;
        const clippedBottom = box.y + box.height > viewport.height;
        
        if (clippedLeft || clippedTop || clippedRight || clippedBottom) {
          const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
          
          let description = 'Element clipped at ';
          if (clippedLeft) description += 'left ';
          if (clippedTop) description += 'top ';
          if (clippedRight) description += 'right ';
          if (clippedBottom) description += 'bottom ';
          description += 'edge of viewport';
          
          // Determine severity based on how much is clipped
          const clippedAmount = Math.max(
            clippedLeft ? Math.abs(box.x) : 0,
            clippedTop ? Math.abs(box.y) : 0,
            clippedRight ? box.x + box.width - viewport.width : 0,
            clippedBottom ? box.y + box.height - viewport.height : 0
          );
          
          const severity: AuditIssue['severity'] = 
            clippedAmount > 10 ? 'critical' :
            clippedAmount > 2 ? 'high' : 'medium';
          
          issues.push({
            type: 'clipping',
            severity,
            page: page.url(),
            element: html,
            selector,
            description,
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        // Element might not be visible, skip
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Check for vertical overflow (content extending beyond viewport height)
 * 
 * @param page - Playwright page object
 * @returns Object with overflow status and scroll height
 */
export async function checkVerticalOverflow(
  page: Page
): Promise<{ hasOverflow: boolean; scrollHeight: number; viewportHeight: number }> {
  const viewport = page.viewportSize();
  if (!viewport) {
    return { hasOverflow: false, scrollHeight: 0, viewportHeight: 0 };
  }
  
  const result = await page.evaluate((viewportHeight) => {
    const body = document.body;
    const html = document.documentElement;
    
    const scrollHeight = Math.max(
      body.scrollHeight,
      html.scrollHeight
    );
    
    return {
      hasOverflow: scrollHeight > viewportHeight,
      scrollHeight,
      viewportHeight,
    };
  }, viewport.height);
  
  return result;
}

/**
 * Get all elements that are partially or fully outside the viewport
 * 
 * @param page - Playwright page object
 * @returns Array of selectors for out-of-viewport elements
 */
export async function getOutOfViewportElements(
  page: Page
): Promise<string[]> {
  const viewport = page.viewportSize();
  if (!viewport) {
    return [];
  }
  
  const elements = await page.evaluate((vp) => {
    const allElements = Array.from(document.querySelectorAll('*'));
    const outOfViewport: string[] = [];
    
    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      
      // Skip elements with no dimensions
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }
      
      // Check if element is outside viewport
      const isOutside = 
        rect.right < 0 ||
        rect.bottom < 0 ||
        rect.left > vp.width ||
        rect.top > vp.height;
      
      if (isOutside) {
        const selector = 
          el.tagName.toLowerCase() +
          (el.id ? `#${el.id}` : '') +
          (el.className ? `.${Array.from(el.classList).join('.')}` : '');
        
        outOfViewport.push(selector);
      }
    }
    
    return outOfViewport.slice(0, 20); // Limit to first 20
  }, viewport);
  
  return elements;
}

/**
 * Measure the visible area of an element (accounting for clipping)
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @returns Visible area as percentage of total element area
 */
export async function getVisibleAreaPercentage(
  page: Page,
  selector: string
): Promise<number> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return 0;
    }
    
    const viewport = page.viewportSize();
    if (!viewport) {
      return 100;
    }
    
    // Calculate visible area
    const visibleLeft = Math.max(0, box.x);
    const visibleTop = Math.max(0, box.y);
    const visibleRight = Math.min(viewport.width, box.x + box.width);
    const visibleBottom = Math.min(viewport.height, box.y + box.height);
    
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    
    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = box.width * box.height;
    
    return totalArea > 0 ? (visibleArea / totalArea) * 100 : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if an element is fully visible (100% in viewport)
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @returns True if element is fully visible
 */
export async function isElementFullyVisible(
  page: Page,
  selector: string
): Promise<boolean> {
  const percentage = await getVisibleAreaPercentage(page, selector);
  return percentage === 100;
}

/**
 * Get viewport dimensions from page
 * 
 * @param page - Playwright page object
 * @returns Viewport width and height
 */
export async function getViewportDimensions(
  page: Page
): Promise<{ width: number; height: number }> {
  const viewport = page.viewportSize();
  return viewport || { width: 0, height: 0 };
}
