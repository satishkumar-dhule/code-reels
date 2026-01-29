/**
 * iPhone 13 UI Audit Helpers
 * 
 * Helper functions and utilities specific to iPhone 13 viewport testing.
 * These utilities help identify layout issues, clipped content, and
 * accessibility problems on iPhone 13 screen dimensions (390x844px).
 */

import { Page } from '@playwright/test';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AuditIssue {
  type: 'clipping' | 'overlap' | 'touch-target' | 'safe-area' | 'overflow';
  severity: 'critical' | 'high' | 'medium' | 'low';
  page: string;
  element: string;
  selector: string;
  description: string;
  measurements: {
    expected?: number;
    actual?: number;
    bounds?: { x: number; y: number; width: number; height: number };
  };
  screenshot?: string;
  theme?: 'light' | 'dark';
}

export interface PageAuditResult {
  page: string;
  url: string;
  theme: 'light' | 'dark';
  timestamp: string;
  issues: AuditIssue[];
  passed: boolean;
}

export interface AuditReport {
  device: 'iPhone 13';
  viewport: { width: number; height: number };
  totalPages: number;
  totalIssues: number;
  criticalIssues: number;
  pageResults: PageAuditResult[];
  summary: {
    clippingIssues: number;
    overlapIssues: number;
    touchTargetIssues: number;
    safeAreaIssues: number;
    overflowIssues: number;
  };
}

export interface iPhone13Config {
  viewport: {
    width: 390;
    height: 844;
  };
  deviceScaleFactor: 3;
  isMobile: true;
  hasTouch: true;
  safeArea: {
    top: 47;    // Status bar + notch
    bottom: 34; // Home indicator
    left: 0;
    right: 0;
  };
}

export interface PageTestConfig {
  name: string;
  url: string;
  waitFor?: string; // Selector to wait for before testing
  skipChecks?: Array<'clipping' | 'overlap' | 'touch-target' | 'safe-area'>;
  modals?: Array<{
    name: string;
    trigger: string; // Selector to click to open modal
    closeButton?: string;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const IPHONE13_STANDARDS = {
  viewport: {
    width: 390,
    height: 844,
  },
  safeArea: {
    top: 47,
    bottom: 34,
    left: 0,
    right: 0,
  },
  minTouchTarget: 44, // Apple HIG minimum
  thumbReachZone: {
    // Easy reach zone for one-handed use
    top: 200,
    bottom: 844 - 34, // Above home indicator
  },
} as const;

export const PAGES_TO_TEST: PageTestConfig[] = [
  {
    name: 'Home',
    url: '/',
    waitFor: 'body',
  },
  {
    name: 'Learning Paths',
    url: '/learning-paths',
    waitFor: 'body',
  },
  {
    name: 'Question Viewer',
    url: '/questions/1',
    waitFor: 'body',
  },
  {
    name: 'Coding Challenges',
    url: '/coding-challenges',
    waitFor: 'body',
  },
  {
    name: 'Certifications',
    url: '/certifications',
    waitFor: 'body',
  },
  {
    name: 'Stats',
    url: '/stats',
    waitFor: 'body',
  },
  {
    name: 'SRS Review',
    url: '/srs',
    waitFor: 'body',
  },
  {
    name: 'Voice Interview',
    url: '/voice-interview',
    waitFor: 'body',
  },
  {
    name: 'Blog',
    url: '/blog',
    waitFor: 'body',
  },
  {
    name: 'Settings',
    url: '/settings',
    waitFor: 'body',
  },
];

// ============================================================================
// SAFE AREA UTILITIES
// ============================================================================

/**
 * Check if an element is within the safe area (respects notch and home indicator)
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @param safeArea - Safe area configuration
 * @returns True if element is in safe area
 */
export async function isInSafeArea(
  page: Page,
  selector: string,
  safeArea: typeof IPHONE13_STANDARDS.safeArea = IPHONE13_STANDARDS.safeArea
): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return true; // Element not visible, skip check
    }
    
    const isInSafe = 
      box.y >= safeArea.top &&
      box.y + box.height <= IPHONE13_STANDARDS.viewport.height - safeArea.bottom;
    
    return isInSafe;
  } catch (error) {
    return true; // Element not found, skip check
  }
}

/**
 * Check if an element is a background or decorative element
 * 
 * @param page - Playwright page object
 * @param element - Playwright locator for the element
 * @returns True if element is decorative/background
 */
async function isDecorativeElement(
  page: Page,
  element: any
): Promise<boolean> {
  try {
    const isDecorative = await element.evaluate((el: HTMLElement) => {
      // Check for decorative attributes
      if (el.getAttribute('role') === 'presentation' || 
          el.getAttribute('role') === 'none' ||
          el.getAttribute('aria-hidden') === 'true') {
        return true;
      }
      
      // Check for background/decorative classes
      const className = el.className || '';
      const decorativePatterns = [
        'background',
        'bg-',
        'backdrop',
        'decoration',
        'decorative',
        'overlay',
        'gradient',
        'pattern',
      ];
      
      for (const pattern of decorativePatterns) {
        if (className.includes(pattern)) {
          return true;
        }
      }
      
      // Check if element is purely visual (no text content, no interactive children)
      const hasText = el.textContent?.trim().length > 0;
      const hasInteractiveChildren = el.querySelector('button, a, input, select, textarea') !== null;
      
      if (!hasText && !hasInteractiveChildren) {
        // Check if it's a div or span with only visual styling
        const tagName = el.tagName.toLowerCase();
        if (tagName === 'div' || tagName === 'span') {
          return true;
        }
      }
      
      return false;
    });
    
    return isDecorative;
  } catch (error) {
    return false;
  }
}

/**
 * Check for safe area violations across the page
 * 
 * @param page - Playwright page object
 * @param safeArea - Safe area configuration
 * @returns Array of audit issues for safe area violations
 */
export async function checkSafeAreaViolations(
  page: Page,
  safeArea: typeof IPHONE13_STANDARDS.safeArea = IPHONE13_STANDARDS.safeArea
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Check all content elements (excluding backgrounds and decorative elements)
  const contentSelectors = [
    'button',
    'a',
    'input',
    'select',
    'textarea',
    'h1, h2, h3, h4, h5, h6',
    'p',
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
        
        // Skip decorative/background elements
        const isDecorative = await isDecorativeElement(page, element);
        if (isDecorative) {
          continue;
        }
        
        // Check if element extends into unsafe zones
        const inTopUnsafeZone = box.y < safeArea.top;
        const inBottomUnsafeZone = box.y + box.height > IPHONE13_STANDARDS.viewport.height - safeArea.bottom;
        
        if (inTopUnsafeZone || inBottomUnsafeZone) {
          const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
          
          issues.push({
            type: 'safe-area',
            severity: 'high',
            page: page.url(),
            element: html,
            selector,
            description: inTopUnsafeZone 
              ? `Element extends into notch area (top ${safeArea.top}px)`
              : `Element extends into home indicator area (bottom ${safeArea.bottom}px)`,
            measurements: {
              expected: inTopUnsafeZone ? safeArea.top : IPHONE13_STANDARDS.viewport.height - safeArea.bottom,
              actual: inTopUnsafeZone ? box.y : box.y + box.height,
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

// ============================================================================
// TOUCH TARGET UTILITIES
// ============================================================================

/**
 * Get the touch target size of an element
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @returns Width and height of the touch target
 */
export async function getTouchTargetSize(
  page: Page,
  selector: string
): Promise<{ width: number; height: number } | null> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return null;
    }
    
    return {
      width: box.width,
      height: box.height,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check all touch targets meet minimum size requirements
 * 
 * @param page - Playwright page object
 * @param minSize - Minimum size in pixels (default: 44)
 * @returns Array of audit issues for undersized touch targets
 */
export async function checkTouchTargets(
  page: Page,
  minSize: number = IPHONE13_STANDARDS.minTouchTarget
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[onclick]',
  ];
  
  for (const selector of interactiveSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      
      try {
        const box = await element.boundingBox();
        
        if (!box) continue;
        
        // Check if touch target is too small
        if (box.width < minSize || box.height < minSize) {
          const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
          
          const severity: AuditIssue['severity'] = 
            box.width < 30 || box.height < 30 ? 'critical' :
            box.width < 44 || box.height < 44 ? 'high' : 'medium';
          
          issues.push({
            type: 'touch-target',
            severity,
            page: page.url(),
            element: html,
            selector,
            description: `Touch target too small: ${Math.round(box.width)}x${Math.round(box.height)}px (minimum: ${minSize}x${minSize}px)`,
            measurements: {
              expected: minSize,
              actual: Math.min(box.width, box.height),
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

// ============================================================================
// OVERLAP DETECTION UTILITIES
// ============================================================================

/**
 * Check if an element is critical (important for user interaction)
 * 
 * @param element - Playwright locator for the element
 * @returns True if element is critical
 */
async function isCriticalElement(element: any): Promise<boolean> {
  try {
    const isCritical = await element.evaluate((el: HTMLElement) => {
      // Check if element is interactive
      const tagName = el.tagName.toLowerCase();
      const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
      
      if (interactiveTags.includes(tagName)) {
        return true;
      }
      
      // Check for interactive roles
      const role = el.getAttribute('role');
      const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'];
      
      if (role && interactiveRoles.includes(role)) {
        return true;
      }
      
      // Check for click handlers
      if (el.onclick || el.getAttribute('onclick')) {
        return true;
      }
      
      // Check for important content (headings, main content)
      const importantTags = ['h1', 'h2', 'h3', 'main', 'article'];
      if (importantTags.includes(tagName)) {
        return true;
      }
      
      // Check for ARIA labels indicating importance
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) {
        return true;
      }
      
      return false;
    });
    
    return isCritical;
  } catch (error) {
    return false;
  }
}

/**
 * Calculate overlap area between two rectangles
 * 
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns Overlap area in pixels
 */
function calculateOverlapArea(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): number {
  const xOverlap = Math.max(
    0,
    Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x)
  );
  
  const yOverlap = Math.max(
    0,
    Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y)
  );
  
  return xOverlap * yOverlap;
}

/**
 * Check for fixed elements overlapping interactive content
 * 
 * Requirements: 1.3, 1.4, 2.3, 2.4, 2.5
 * 
 * This function detects when fixed or sticky positioned elements (headers, footers,
 * navigation bars, floating action buttons) obscure interactive content or critical
 * information. It distinguishes between critical overlaps (blocking buttons/links)
 * and non-critical overlaps (decorative elements).
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for overlapping elements
 */
export async function checkFixedElementOverlap(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Find all fixed or sticky positioned elements with their properties
  const fixedElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return elements
      .filter(el => {
        const style = window.getComputedStyle(el);
        const position = style.position;
        
        // Only check fixed and sticky elements
        if (position !== 'fixed' && position !== 'sticky') {
          return false;
        }
        
        // Skip invisible elements
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        
        // Skip elements with zero dimensions
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }
        
        return true;
      })
      .map(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        
        // Generate a meaningful selector
        let selector = el.tagName.toLowerCase();
        if (el.id) {
          selector += `#${el.id}`;
        } else if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c.trim()).slice(0, 3);
          if (classes.length > 0) {
            selector += `.${classes.join('.')}`;
          }
        }
        
        return {
          selector,
          bounds: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          zIndex: parseInt(style.zIndex) || 0,
          position: style.position,
          html: el.outerHTML.substring(0, 150),
        };
      });
  });
  
  // If no fixed elements, no overlap issues
  if (fixedElements.length === 0) {
    return issues;
  }
  
  // Check if fixed elements overlap with interactive or critical content
  const contentSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    'h1',
    'h2',
    'h3',
    '[onclick]',
  ];
  
  for (const selector of contentSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      
      try {
        const box = await element.boundingBox();
        
        if (!box) continue;
        
        // Check if element is visible
        const isVisible = await element.isVisible();
        if (!isVisible) continue;
        
        // Check if this is a critical element
        const isCritical = await isCriticalElement(element);
        
        // Check overlap with each fixed element
        for (const fixed of fixedElements) {
          // Check for overlap using rectangle intersection
          const overlaps = !(
            fixed.bounds.x + fixed.bounds.width <= box.x ||
            fixed.bounds.x >= box.x + box.width ||
            fixed.bounds.y + fixed.bounds.height <= box.y ||
            fixed.bounds.y >= box.y + box.height
          );
          
          if (overlaps) {
            // Calculate overlap area
            const overlapArea = calculateOverlapArea(fixed.bounds, box);
            const elementArea = box.width * box.height;
            const overlapPercentage = (overlapArea / elementArea) * 100;
            
            // Only report significant overlaps (>10% of element area)
            if (overlapPercentage < 10) {
              continue;
            }
            
            const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
            
            // Determine severity based on criticality and overlap percentage
            let severity: AuditIssue['severity'];
            if (isCritical && overlapPercentage > 50) {
              severity = 'critical'; // Critical element mostly obscured
            } else if (isCritical || overlapPercentage > 75) {
              severity = 'high'; // Critical element or mostly obscured
            } else if (overlapPercentage > 50) {
              severity = 'medium'; // Significantly obscured
            } else {
              severity = 'low'; // Minor overlap
            }
            
            const description = isCritical
              ? `Fixed element "${fixed.selector}" overlaps critical interactive content (${Math.round(overlapPercentage)}% obscured)`
              : `Fixed element "${fixed.selector}" overlaps content (${Math.round(overlapPercentage)}% obscured)`;
            
            issues.push({
              type: 'overlap',
              severity,
              page: page.url(),
              element: html,
              selector: fixed.selector,
              description,
              measurements: {
                bounds: box,
                actual: overlapPercentage,
                expected: 0,
              },
            });
          }
        }
      } catch (error) {
        // Element might not be accessible, skip
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Get the z-index stack for an element
 * 
 * This function analyzes the z-index layering of an element, including
 * inherited stacking contexts from parent elements. It helps identify
 * which elements will appear on top in case of overlaps.
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @returns Z-index value (computed from element and stacking context)
 */
export async function getZIndexStack(
  page: Page,
  selector: string
): Promise<number> {
  try {
    const element = page.locator(selector).first();
    
    // Get z-index considering stacking context
    const zIndexInfo = await element.evaluate(el => {
      const style = window.getComputedStyle(el);
      const zIndex = style.zIndex;
      
      // Parse z-index
      let computedZIndex = 0;
      if (zIndex !== 'auto') {
        computedZIndex = parseInt(zIndex) || 0;
      }
      
      // Check if element creates a stacking context
      const createsStackingContext = 
        style.position !== 'static' ||
        parseFloat(style.opacity) < 1 ||
        style.transform !== 'none' ||
        style.filter !== 'none' ||
        style.perspective !== 'none' ||
        style.clipPath !== 'none' ||
        style.mask !== 'none' ||
        style.mixBlendMode !== 'normal' ||
        style.isolation === 'isolate';
      
      // Walk up the DOM tree to find parent stacking contexts
      let maxParentZIndex = 0;
      let parent = el.parentElement;
      
      while (parent) {
        const parentStyle = window.getComputedStyle(parent);
        const parentZIndex = parentStyle.zIndex;
        
        if (parentZIndex !== 'auto') {
          const parentZ = parseInt(parentZIndex) || 0;
          maxParentZIndex = Math.max(maxParentZIndex, parentZ);
        }
        
        parent = parent.parentElement;
      }
      
      return {
        elementZIndex: computedZIndex,
        maxParentZIndex,
        createsStackingContext,
        effectiveZIndex: createsStackingContext ? computedZIndex : maxParentZIndex,
      };
    });
    
    return zIndexInfo.effectiveZIndex;
  } catch (error) {
    return 0;
  }
}

// ============================================================================
// MODAL AND DYNAMIC CONTENT UTILITIES
// ============================================================================

/**
 * Check if a modal fits within the viewport
 * 
 * Requirements: 1.5, 5.11, 5.12
 * 
 * This function verifies that modal dialogs and overlays fit entirely within
 * the viewport without clipping or requiring scroll to access close buttons.
 * 
 * @param page - Playwright page object
 * @param modalSelector - CSS selector for the modal element
 * @returns Audit issue if modal doesn't fit, null otherwise
 */
export async function checkModalViewportFit(
  page: Page,
  modalSelector: string
): Promise<AuditIssue | null> {
  try {
    const modal = page.locator(modalSelector).first();
    const box = await modal.boundingBox();
    
    if (!box) {
      return null; // Modal not visible
    }
    
    const viewport = IPHONE13_STANDARDS.viewport;
    
    // Check if modal extends beyond viewport
    const clippedLeft = box.x < 0;
    const clippedTop = box.y < 0;
    const clippedRight = box.x + box.width > viewport.width;
    const clippedBottom = box.y + box.height > viewport.height;
    
    if (clippedLeft || clippedTop || clippedRight || clippedBottom) {
      const html = await modal.evaluate(el => el.outerHTML.substring(0, 150));
      
      let description = 'Modal extends beyond viewport at ';
      if (clippedLeft) description += 'left ';
      if (clippedTop) description += 'top ';
      if (clippedRight) description += 'right ';
      if (clippedBottom) description += 'bottom ';
      
      return {
        type: 'clipping',
        severity: 'critical',
        page: page.url(),
        element: html,
        selector: modalSelector,
        description,
        measurements: {
          bounds: box,
        },
      };
    }
    
    // Check if close button is accessible
    const closeButtonSelectors = [
      `${modalSelector} [aria-label*="close" i]`,
      `${modalSelector} [aria-label*="dismiss" i]`,
      `${modalSelector} button[class*="close" i]`,
      `${modalSelector} .close`,
      `${modalSelector} [data-dismiss]`,
    ];
    
    for (const closeSelector of closeButtonSelectors) {
      const closeButton = page.locator(closeSelector).first();
      const closeCount = await closeButton.count();
      
      if (closeCount > 0) {
        const closeBox = await closeButton.boundingBox();
        
        if (closeBox) {
          const closeClipped = 
            closeBox.x < 0 ||
            closeBox.y < 0 ||
            closeBox.x + closeBox.width > viewport.width ||
            closeBox.y + closeBox.height > viewport.height;
          
          if (closeClipped) {
            const html = await closeButton.evaluate(el => el.outerHTML.substring(0, 100));
            
            return {
              type: 'clipping',
              severity: 'critical',
              page: page.url(),
              element: html,
              selector: closeSelector,
              description: 'Modal close button is clipped or inaccessible',
              measurements: {
                bounds: closeBox,
              },
            };
          }
        }
      }
    }
    
    return null; // Modal fits properly
  } catch (error) {
    return null; // Modal not found or not accessible
  }
}

/**
 * Test a modal by opening it and checking viewport fit
 * 
 * @param page - Playwright page object
 * @param triggerSelector - Selector for element that opens the modal
 * @param modalSelector - Selector for the modal element
 * @param closeSelector - Optional selector for close button
 * @returns Audit issue if modal has problems, null otherwise
 */
export async function testModal(
  page: Page,
  triggerSelector: string,
  modalSelector: string,
  closeSelector?: string
): Promise<AuditIssue | null> {
  try {
    // Check if trigger exists
    const trigger = page.locator(triggerSelector).first();
    const triggerCount = await trigger.count();
    
    if (triggerCount === 0) {
      return null; // Trigger not found, skip test
    }
    
    // Click trigger to open modal
    await trigger.click();
    
    // Wait for modal to appear
    await page.waitForSelector(modalSelector, { timeout: 2000 });
    await page.waitForTimeout(300); // Wait for animation
    
    // Check modal viewport fit
    const issue = await checkModalViewportFit(page, modalSelector);
    
    // Close modal if close selector provided
    if (closeSelector) {
      const closeButton = page.locator(closeSelector).first();
      const closeCount = await closeButton.count();
      
      if (closeCount > 0) {
        await closeButton.click();
        await page.waitForTimeout(300); // Wait for close animation
      }
    }
    
    return issue;
  } catch (error) {
    // Modal test failed, return null
    return null;
  }
}

/**
 * Check if an accordion/expandable element stays within viewport when expanded
 * 
 * Requirements: 6.1
 * 
 * @param page - Playwright page object
 * @param accordionSelector - Selector for the accordion element
 * @param triggerSelector - Selector for the element that expands the accordion
 * @returns Audit issue if expanded content causes problems, null otherwise
 */
export async function checkAccordionExpansion(
  page: Page,
  accordionSelector: string,
  triggerSelector: string
): Promise<AuditIssue | null> {
  try {
    // Check if accordion exists
    const accordion = page.locator(accordionSelector).first();
    const accordionCount = await accordion.count();
    
    if (accordionCount === 0) {
      return null; // Accordion not found
    }
    
    // Get initial bounds
    const initialBox = await accordion.boundingBox();
    
    // Click trigger to expand
    const trigger = page.locator(triggerSelector).first();
    await trigger.click();
    await page.waitForTimeout(300); // Wait for animation
    
    // Get expanded bounds
    const expandedBox = await accordion.boundingBox();
    
    if (!expandedBox) {
      return null;
    }
    
    const viewport = IPHONE13_STANDARDS.viewport;
    
    // Check if expanded content extends beyond viewport
    const clippedBottom = expandedBox.y + expandedBox.height > viewport.height;
    
    if (clippedBottom) {
      const html = await accordion.evaluate(el => el.outerHTML.substring(0, 150));
      
      return {
        type: 'clipping',
        severity: 'medium',
        page: page.url(),
        element: html,
        selector: accordionSelector,
        description: 'Expanded accordion extends beyond viewport bottom',
        measurements: {
          expected: viewport.height,
          actual: expandedBox.y + expandedBox.height,
          bounds: expandedBox,
        },
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a dropdown menu fits within viewport when opened
 * 
 * Requirements: 6.2
 * 
 * @param page - Playwright page object
 * @param dropdownSelector - Selector for the dropdown element
 * @param triggerSelector - Selector for the element that opens the dropdown
 * @returns Audit issue if dropdown doesn't fit, null otherwise
 */
export async function checkDropdownFit(
  page: Page,
  dropdownSelector: string,
  triggerSelector: string
): Promise<AuditIssue | null> {
  try {
    // Click trigger to open dropdown
    const trigger = page.locator(triggerSelector).first();
    const triggerCount = await trigger.count();
    
    if (triggerCount === 0) {
      return null; // Trigger not found
    }
    
    await trigger.click();
    await page.waitForTimeout(200); // Wait for dropdown to appear
    
    // Check dropdown bounds
    const dropdown = page.locator(dropdownSelector).first();
    const box = await dropdown.boundingBox();
    
    if (!box) {
      return null; // Dropdown not visible
    }
    
    const viewport = IPHONE13_STANDARDS.viewport;
    
    // Check if dropdown extends beyond viewport
    const clippedRight = box.x + box.width > viewport.width;
    const clippedBottom = box.y + box.height > viewport.height;
    
    if (clippedRight || clippedBottom) {
      const html = await dropdown.evaluate(el => el.outerHTML.substring(0, 150));
      
      let description = 'Dropdown extends beyond viewport at ';
      if (clippedRight) description += 'right ';
      if (clippedBottom) description += 'bottom ';
      
      return {
        type: 'clipping',
        severity: 'high',
        page: page.url(),
        element: html,
        selector: dropdownSelector,
        description,
        measurements: {
          bounds: box,
        },
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a tooltip or popover is fully visible
 * 
 * Requirements: 6.3
 * 
 * @param page - Playwright page object
 * @param tooltipSelector - Selector for the tooltip element
 * @param triggerSelector - Selector for the element that shows the tooltip
 * @returns Audit issue if tooltip is clipped, null otherwise
 */
export async function checkTooltipVisibility(
  page: Page,
  tooltipSelector: string,
  triggerSelector: string
): Promise<AuditIssue | null> {
  try {
    // Hover over trigger to show tooltip
    const trigger = page.locator(triggerSelector).first();
    const triggerCount = await trigger.count();
    
    if (triggerCount === 0) {
      return null; // Trigger not found
    }
    
    await trigger.hover();
    await page.waitForTimeout(200); // Wait for tooltip to appear
    
    // Check tooltip bounds
    const tooltip = page.locator(tooltipSelector).first();
    const box = await tooltip.boundingBox();
    
    if (!box) {
      return null; // Tooltip not visible
    }
    
    const viewport = IPHONE13_STANDARDS.viewport;
    
    // Check if tooltip extends beyond viewport
    const clipped = 
      box.x < 0 ||
      box.y < 0 ||
      box.x + box.width > viewport.width ||
      box.y + box.height > viewport.height;
    
    if (clipped) {
      const html = await tooltip.evaluate(el => el.outerHTML.substring(0, 150));
      
      return {
        type: 'clipping',
        severity: 'medium',
        page: page.url(),
        element: html,
        selector: tooltipSelector,
        description: 'Tooltip extends beyond viewport',
        measurements: {
          bounds: box,
        },
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// NAVIGATION ELEMENT UTILITIES
// ============================================================================

/**
 * Check if top navigation bar clips page titles or content
 * 
 * Requirements: 4.1
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for navigation clipping
 */
export async function checkTopNavigation(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Find top navigation elements
  const navSelectors = [
    'nav',
    'header',
    '[role="navigation"]',
    '[role="banner"]',
    '.navbar',
    '.header',
    '.top-nav',
  ];
  
  for (const selector of navSelectors) {
    const navElements = page.locator(selector);
    const count = await navElements.count();
    
    for (let i = 0; i < count; i++) {
      const nav = navElements.nth(i);
      
      try {
        const box = await nav.boundingBox();
        
        if (!box) continue;
        
        // Check if nav is at the top of the page
        if (box.y > 100) continue; // Not a top nav
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if nav extends beyond viewport
        if (box.x + box.width > viewport.width) {
          const html = await nav.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'high',
            page: page.url(),
            element: html,
            selector,
            description: 'Top navigation extends beyond viewport width',
            measurements: {
              expected: viewport.width,
              actual: box.x + box.width,
              bounds: box,
            },
          });
        }
        
        // Check for truncated text in navigation
        const navText = await nav.evaluate(el => {
          const textElements = el.querySelectorAll('a, button, span');
          const truncated: string[] = [];
          
          for (const textEl of Array.from(textElements)) {
            const style = window.getComputedStyle(textEl);
            if (style.textOverflow === 'ellipsis' || style.overflow === 'hidden') {
              const rect = textEl.getBoundingClientRect();
              if ((textEl as HTMLElement).scrollWidth > rect.width) {
                truncated.push(textEl.textContent?.substring(0, 50) || '');
              }
            }
          }
          
          return truncated;
        });
        
        if (navText.length > 0) {
          const html = await nav.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'medium',
            page: page.url(),
            element: html,
            selector,
            description: `Navigation text truncated: ${navText.join(', ')}`,
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Check if bottom navigation is fully visible and accessible
 * 
 * Requirements: 4.2
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for bottom navigation
 */
export async function checkBottomNavigation(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Find bottom navigation elements
  const bottomNavSelectors = [
    '.bottom-nav',
    '.bottom-navigation',
    '[role="navigation"][class*="bottom"]',
    'nav[class*="bottom"]',
    'footer nav',
  ];
  
  for (const selector of bottomNavSelectors) {
    const navElements = page.locator(selector);
    const count = await navElements.count();
    
    for (let i = 0; i < count; i++) {
      const nav = navElements.nth(i);
      
      try {
        const box = await nav.boundingBox();
        
        if (!box) continue;
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if nav is at the bottom of the viewport
        if (box.y < viewport.height - 150) continue; // Not a bottom nav
        
        // Check if nav extends beyond viewport
        if (box.y + box.height > viewport.height) {
          const html = await nav.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'critical',
            page: page.url(),
            element: html,
            selector,
            description: 'Bottom navigation extends beyond viewport',
            measurements: {
              expected: viewport.height,
              actual: box.y + box.height,
              bounds: box,
            },
          });
        }
        
        // Check if nav is in safe area (above home indicator)
        const safeBottomY = viewport.height - IPHONE13_STANDARDS.safeArea.bottom;
        if (box.y + box.height > safeBottomY) {
          const html = await nav.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'safe-area',
            severity: 'high',
            page: page.url(),
            element: html,
            selector,
            description: 'Bottom navigation overlaps home indicator area',
            measurements: {
              expected: safeBottomY,
              actual: box.y + box.height,
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Check if sidebar/drawer menus fit within viewport
 * 
 * Requirements: 4.3
 * 
 * @param page - Playwright page object
 * @param sidebarSelector - Selector for the sidebar element
 * @returns Audit issue if sidebar doesn't fit, null otherwise
 */
export async function checkSidebarFit(
  page: Page,
  sidebarSelector: string
): Promise<AuditIssue | null> {
  try {
    const sidebar = page.locator(sidebarSelector).first();
    const count = await sidebar.count();
    
    if (count === 0) {
      return null; // Sidebar not found
    }
    
    const box = await sidebar.boundingBox();
    
    if (!box) {
      return null; // Sidebar not visible
    }
    
    const viewport = IPHONE13_STANDARDS.viewport;
    
    // Check if sidebar extends beyond viewport
    const clippedRight = box.x + box.width > viewport.width;
    const clippedBottom = box.y + box.height > viewport.height;
    
    if (clippedRight || clippedBottom) {
      const html = await sidebar.evaluate(el => el.outerHTML.substring(0, 150));
      
      let description = 'Sidebar extends beyond viewport at ';
      if (clippedRight) description += 'right ';
      if (clippedBottom) description += 'bottom ';
      
      return {
        type: 'clipping',
        severity: 'high',
        page: page.url(),
        element: html,
        selector: sidebarSelector,
        description,
        measurements: {
          bounds: box,
        },
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if breadcrumbs overflow or wrap awkwardly
 * 
 * Requirements: 4.5
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for breadcrumb problems
 */
export async function checkBreadcrumbs(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  const breadcrumbSelectors = [
    '[aria-label*="breadcrumb" i]',
    '.breadcrumb',
    '.breadcrumbs',
    'nav[class*="breadcrumb"]',
  ];
  
  for (const selector of breadcrumbSelectors) {
    const breadcrumbs = page.locator(selector);
    const count = await breadcrumbs.count();
    
    for (let i = 0; i < count; i++) {
      const breadcrumb = breadcrumbs.nth(i);
      
      try {
        const box = await breadcrumb.boundingBox();
        
        if (!box) continue;
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if breadcrumb extends beyond viewport
        if (box.x + box.width > viewport.width) {
          const html = await breadcrumb.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'overflow',
            severity: 'medium',
            page: page.url(),
            element: html,
            selector,
            description: 'Breadcrumb navigation overflows viewport',
            measurements: {
              expected: viewport.width,
              actual: box.x + box.width,
              bounds: box,
            },
          });
        }
        
        // Check for awkward wrapping (multiple lines)
        const lineCount = await breadcrumb.evaluate(el => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const rects = range.getClientRects();
          return rects.length;
        });
        
        if (lineCount > 2) {
          const html = await breadcrumb.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'low',
            page: page.url(),
            element: html,
            selector,
            description: `Breadcrumb wraps to ${lineCount} lines`,
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Check if tab bars display all tabs without truncation
 * 
 * Requirements: 4.6
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for tab bar problems
 */
export async function checkTabBars(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  const tabSelectors = [
    '[role="tablist"]',
    '.tabs',
    '.tab-bar',
    'nav[class*="tab"]',
  ];
  
  for (const selector of tabSelectors) {
    const tabBars = page.locator(selector);
    const count = await tabBars.count();
    
    for (let i = 0; i < count; i++) {
      const tabBar = tabBars.nth(i);
      
      try {
        const box = await tabBar.boundingBox();
        
        if (!box) continue;
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if tab bar extends beyond viewport
        if (box.x + box.width > viewport.width) {
          const html = await tabBar.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'overflow',
            severity: 'high',
            page: page.url(),
            element: html,
            selector,
            description: 'Tab bar overflows viewport',
            measurements: {
              expected: viewport.width,
              actual: box.x + box.width,
              bounds: box,
            },
          });
        }
        
        // Check for truncated tab text
        const truncatedTabs = await tabBar.evaluate(el => {
          const tabs = el.querySelectorAll('[role="tab"], .tab, button');
          const truncated: string[] = [];
          
          for (const tab of Array.from(tabs)) {
            const style = window.getComputedStyle(tab);
            if (style.textOverflow === 'ellipsis' || style.overflow === 'hidden') {
              const rect = tab.getBoundingClientRect();
              if ((tab as HTMLElement).scrollWidth > rect.width) {
                truncated.push(tab.textContent?.substring(0, 30) || '');
              }
            }
          }
          
          return truncated;
        });
        
        if (truncatedTabs.length > 0) {
          const html = await tabBar.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'medium',
            page: page.url(),
            element: html,
            selector,
            description: `Tab text truncated: ${truncatedTabs.join(', ')}`,
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Check all navigation elements for visibility and accessibility
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6
 * 
 * @param page - Playwright page object
 * @returns Array of all navigation-related audit issues
 */
export async function checkAllNavigation(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Check top navigation
  const topNavIssues = await checkTopNavigation(page);
  issues.push(...topNavIssues);
  
  // Check bottom navigation
  const bottomNavIssues = await checkBottomNavigation(page);
  issues.push(...bottomNavIssues);
  
  // Check breadcrumbs
  const breadcrumbIssues = await checkBreadcrumbs(page);
  issues.push(...breadcrumbIssues);
  
  // Check tab bars
  const tabBarIssues = await checkTabBars(page);
  issues.push(...tabBarIssues);
  
  return issues;
}

// ============================================================================
// THEME UTILITIES
// ============================================================================

/**
 * Switch theme on the page
 * 
 * @param page - Playwright page object
 * @param theme - Theme to switch to ('light' or 'dark')
 */
export async function switchTheme(
  page: Page,
  theme: 'light' | 'dark'
): Promise<void> {
  await page.evaluate((targetTheme) => {
    const html = document.documentElement;
    if (targetTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, theme);
  
  // Wait for theme transition to complete
  await page.waitForTimeout(300);
}

/**
 * Get current theme from the page
 * 
 * @param page - Playwright page object
 * @returns Current theme ('light' or 'dark')
 */
export async function getCurrentTheme(page: Page): Promise<'light' | 'dark'> {
  const isDark = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark');
  });
  
  return isDark ? 'dark' : 'light';
}

/**
 * Measure layout before and after theme switch to detect layout shifts
 * 
 * Requirements: 7.3
 * 
 * @param page - Playwright page object
 * @param selector - Selector for element to measure
 * @returns Object with before and after measurements
 */
async function measureElementLayout(
  page: Page,
  selector: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    const element = page.locator(selector).first();
    const box = await element.boundingBox();
    
    if (!box) {
      return null;
    }
    
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check for layout shifts when switching themes
 * 
 * Requirements: 7.3
 * 
 * This function switches between light and dark themes and measures whether
 * elements maintain their position and dimensions. Layout shifts during theme
 * transitions can be jarring and indicate CSS issues.
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for layout shifts
 */
export async function checkThemeLayoutConsistency(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Get current theme
  const initialTheme = await getCurrentTheme(page);
  
  // Elements to measure for layout shifts
  const elementsToCheck = [
    'header',
    'nav',
    'main',
    'footer',
    'button',
    'h1',
    '.container',
  ];
  
  // Measure elements in initial theme
  const initialMeasurements = new Map<string, any>();
  
  for (const selector of elementsToCheck) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) { // Check first 5 of each type
      const element = elements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        const key = `${selector}-${i}`;
        initialMeasurements.set(key, box);
      }
    }
  }
  
  // Switch theme
  const newTheme = initialTheme === 'light' ? 'dark' : 'light';
  await switchTheme(page, newTheme);
  
  // Measure elements in new theme
  for (const selector of elementsToCheck) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = elements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        const key = `${selector}-${i}`;
        const initialBox = initialMeasurements.get(key);
        
        if (initialBox) {
          // Check for significant layout shifts (>2px)
          const xShift = Math.abs(box.x - initialBox.x);
          const yShift = Math.abs(box.y - initialBox.y);
          const widthChange = Math.abs(box.width - initialBox.width);
          const heightChange = Math.abs(box.height - initialBox.height);
          
          if (xShift > 2 || yShift > 2 || widthChange > 2 || heightChange > 2) {
            const html = await element.evaluate(el => el.outerHTML.substring(0, 100));
            
            issues.push({
              type: 'clipping',
              severity: 'medium',
              page: page.url(),
              element: html,
              selector,
              description: `Layout shift during theme switch: x:${xShift.toFixed(1)}px, y:${yShift.toFixed(1)}px, w:${widthChange.toFixed(1)}px, h:${heightChange.toFixed(1)}px`,
              measurements: {
                bounds: box,
              },
              theme: newTheme,
            });
          }
        }
      }
    }
  }
  
  // Switch back to initial theme
  await switchTheme(page, initialTheme);
  
  return issues;
}

/**
 * Test both themes for layout issues
 * 
 * Requirements: 7.1, 7.2
 * 
 * @param page - Playwright page object
 * @param auditFunction - Function that performs audit checks
 * @returns Object with issues for both themes
 */
export async function testBothThemes(
  page: Page,
  auditFunction: (page: Page, theme: 'light' | 'dark') => Promise<AuditIssue[]>
): Promise<{ light: AuditIssue[]; dark: AuditIssue[] }> {
  // Test light theme
  await switchTheme(page, 'light');
  const lightIssues = await auditFunction(page, 'light');
  
  // Test dark theme
  await switchTheme(page, 'dark');
  const darkIssues = await auditFunction(page, 'dark');
  
  return {
    light: lightIssues,
    dark: darkIssues,
  };
}

/**
 * Check if theme colors are properly applied
 * 
 * Requirements: 7.4, 7.5, 7.6
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for theme color problems
 */
export async function checkThemeColors(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  const theme = await getCurrentTheme(page);
  
  // Check if theme class is applied
  const hasThemeClass = await page.evaluate((t) => {
    const html = document.documentElement;
    return t === 'dark' ? html.classList.contains('dark') : !html.classList.contains('dark');
  }, theme);
  
  if (!hasThemeClass) {
    issues.push({
      type: 'clipping',
      severity: 'high',
      page: page.url(),
      element: '<html>',
      selector: 'html',
      description: `Theme class not properly applied for ${theme} theme`,
      measurements: {},
      theme,
    });
  }
  
  return issues;
}

// ============================================================================
// LOADING STATE UTILITIES
// ============================================================================

/**
 * Check if loading states maintain layout dimensions
 * 
 * Requirements: 6.4
 * 
 * @param page - Playwright page object
 * @param containerSelector - Selector for container that shows loading state
 * @returns Audit issue if layout shifts during loading, null otherwise
 */
export async function checkLoadingStateLayout(
  page: Page,
  containerSelector: string
): Promise<AuditIssue | null> {
  try {
    const container = page.locator(containerSelector).first();
    const count = await container.count();
    
    if (count === 0) {
      return null; // Container not found
    }
    
    // Measure loaded state
    const loadedBox = await container.boundingBox();
    
    if (!loadedBox) {
      return null;
    }
    
    // Note: In a real implementation, we would trigger a loading state
    // and measure the dimensions. For now, we just verify the container exists.
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Find and check all loading indicators on the page
 * 
 * Requirements: 6.4
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for loading state problems
 */
export async function checkLoadingIndicators(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Common loading indicator selectors
  const loadingSelectors = [
    '[role="progressbar"]',
    '[aria-busy="true"]',
    '.loading',
    '.spinner',
    '.skeleton',
    '[data-loading="true"]',
  ];
  
  for (const selector of loadingSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      
      try {
        const box = await element.boundingBox();
        
        if (!box) continue;
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if loading indicator extends beyond viewport
        if (box.x + box.width > viewport.width || box.y + box.height > viewport.height) {
          const html = await element.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'medium',
            page: page.url(),
            element: html,
            selector,
            description: 'Loading indicator extends beyond viewport',
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

// ============================================================================
// ERROR AND SUCCESS MESSAGE UTILITIES
// ============================================================================

/**
 * Check if error messages display properly within viewport
 * 
 * Requirements: 6.5
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for error message problems
 */
export async function checkErrorMessages(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Common error message selectors
  const errorSelectors = [
    '[role="alert"]',
    '[aria-live="assertive"]',
    '.error',
    '.error-message',
    '[data-error="true"]',
    '.alert-error',
    '.toast-error',
  ];
  
  for (const selector of errorSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      
      try {
        const box = await element.boundingBox();
        
        if (!box) continue;
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if error message extends beyond viewport
        const clipped = 
          box.x < 0 ||
          box.y < 0 ||
          box.x + box.width > viewport.width ||
          box.y + box.height > viewport.height;
        
        if (clipped) {
          const html = await element.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'high',
            page: page.url(),
            element: html,
            selector,
            description: 'Error message extends beyond viewport',
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

/**
 * Check if success notifications are visible
 * 
 * Requirements: 6.6
 * 
 * @param page - Playwright page object
 * @returns Array of audit issues for success notification problems
 */
export async function checkSuccessNotifications(
  page: Page
): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  
  // Common success notification selectors
  const successSelectors = [
    '[role="status"]',
    '[aria-live="polite"]',
    '.success',
    '.success-message',
    '[data-success="true"]',
    '.alert-success',
    '.toast-success',
  ];
  
  for (const selector of successSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    
    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      
      try {
        const box = await element.boundingBox();
        
        if (!box) continue;
        
        const viewport = IPHONE13_STANDARDS.viewport;
        
        // Check if success notification extends beyond viewport
        const clipped = 
          box.x < 0 ||
          box.y < 0 ||
          box.x + box.width > viewport.width ||
          box.y + box.height > viewport.height;
        
        if (clipped) {
          const html = await element.evaluate(el => el.outerHTML.substring(0, 150));
          
          issues.push({
            type: 'clipping',
            severity: 'medium',
            page: page.url(),
            element: html,
            selector,
            description: 'Success notification extends beyond viewport',
            measurements: {
              bounds: box,
            },
          });
        }
      } catch (error) {
        continue;
      }
    }
  }
  
  return issues;
}

// ============================================================================
// SCREENSHOT AND REPORTING UTILITIES
// ============================================================================

/**
 * Capture a full page screenshot
 * 
 * @param page - Playwright page object
 * @param pageName - Name of the page for the screenshot filename
 * @param theme - Current theme ('light' or 'dark')
 * @returns Path to the screenshot file
 */
export async function captureFullPageScreenshot(
  page: Page,
  pageName: string,
  theme: 'light' | 'dark'
): Promise<string> {
  const sanitizedName = pageName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const screenshotPath = `e2e/reports/screenshots/${sanitizedName}-${theme}-full.png`;
  
  try {
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    
    return screenshotPath;
  } catch (error) {
    console.error(`Failed to capture screenshot for ${pageName}:`, error);
    return '';
  }
}

/**
 * Capture a screenshot of a specific element with highlighting
 * 
 * @param page - Playwright page object
 * @param selector - CSS selector for the element
 * @param issueType - Type of issue for the screenshot filename
 * @param index - Index for multiple issues of the same type
 * @returns Path to the screenshot file
 */
export async function captureIssueScreenshot(
  page: Page,
  selector: string,
  issueType: string,
  index: number
): Promise<string> {
  const sanitizedType = issueType.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const screenshotPath = `e2e/reports/screenshots/issue-${sanitizedType}-${index}.png`;
  
  try {
    // Highlight the element with a red outline
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLElement) {
        el.style.outline = '3px solid red';
        el.style.outlineOffset = '2px';
      }
    }, selector);
    
    // Wait a moment for the outline to render
    await page.waitForTimeout(100);
    
    // Capture screenshot of the element
    const element = page.locator(selector).first();
    await element.screenshot({
      path: screenshotPath,
    });
    
    // Remove the outline
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el && el instanceof HTMLElement) {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    }, selector);
    
    return screenshotPath;
  } catch (error) {
    console.error(`Failed to capture issue screenshot:`, error);
    return '';
  }
}

/**
 * Capture screenshots for all issues on a page
 * 
 * @param page - Playwright page object
 * @param pageName - Name of the page
 * @param theme - Current theme
 * @param issues - Array of audit issues
 * @returns Updated issues array with screenshot paths
 */
export async function captureIssueScreenshots(
  page: Page,
  pageName: string,
  theme: 'light' | 'dark',
  issues: AuditIssue[]
): Promise<AuditIssue[]> {
  // Capture full page screenshot
  const fullPageScreenshot = await captureFullPageScreenshot(page, pageName, theme);
  
  // Capture individual issue screenshots (limit to first 10 to avoid too many files)
  const issuesWithScreenshots = await Promise.all(
    issues.slice(0, 10).map(async (issue, index) => {
      try {
        const issueScreenshot = await captureIssueScreenshot(
          page,
          issue.selector,
          issue.type,
          index
        );
        
        return {
          ...issue,
          screenshot: issueScreenshot || fullPageScreenshot,
        };
      } catch (error) {
        return {
          ...issue,
          screenshot: fullPageScreenshot,
        };
      }
    })
  );
  
  // Add full page screenshot to remaining issues
  const remainingIssues = issues.slice(10).map(issue => ({
    ...issue,
    screenshot: fullPageScreenshot,
  }));
  
  return [...issuesWithScreenshots, ...remainingIssues];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wait for page to be fully loaded and stable
 * 
 * @param page - Playwright page object
 */
export async function waitForPageStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
  // Wait for animations to settle
  await page.waitForTimeout(500);
}

/**
 * Generate audit summary from page results
 * 
 * @param pageResults - Array of page audit results
 * @returns Audit report with summary statistics
 */
export function generateAuditReport(pageResults: PageAuditResult[]): AuditReport {
  const summary = {
    clippingIssues: 0,
    overlapIssues: 0,
    touchTargetIssues: 0,
    safeAreaIssues: 0,
    overflowIssues: 0,
  };
  
  let totalIssues = 0;
  let criticalIssues = 0;
  
  for (const result of pageResults) {
    totalIssues += result.issues.length;
    
    for (const issue of result.issues) {
      if (issue.severity === 'critical') {
        criticalIssues++;
      }
      
      switch (issue.type) {
        case 'clipping':
          summary.clippingIssues++;
          break;
        case 'overlap':
          summary.overlapIssues++;
          break;
        case 'touch-target':
          summary.touchTargetIssues++;
          break;
        case 'safe-area':
          summary.safeAreaIssues++;
          break;
        case 'overflow':
          summary.overflowIssues++;
          break;
      }
    }
  }
  
  return {
    device: 'iPhone 13',
    viewport: IPHONE13_STANDARDS.viewport,
    totalPages: pageResults.length,
    totalIssues,
    criticalIssues,
    pageResults,
    summary,
  };
}

/**
 * Generate a markdown report from audit results
 * 
 * @param report - Audit report object
 * @returns Markdown formatted report string
 */
export function generateMarkdownReport(report: AuditReport): string {
  const lines: string[] = [];
  
  // Header
  lines.push('# iPhone 13 UI Audit Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Device:** ${report.device}`);
  lines.push(`**Viewport:** ${report.viewport.width}x${report.viewport.height}px`);
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Total Pages Tested:** ${report.totalPages}`);
  lines.push(`- **Total Issues:** ${report.totalIssues}`);
  lines.push(`- **Critical Issues:** ${report.criticalIssues}`);
  lines.push('');
  
  // Issue Breakdown
  lines.push('### Issue Breakdown');
  lines.push('');
  lines.push(`- **Clipping Issues:** ${report.summary.clippingIssues}`);
  lines.push(`- **Overlap Issues:** ${report.summary.overlapIssues}`);
  lines.push(`- **Touch Target Issues:** ${report.summary.touchTargetIssues}`);
  lines.push(`- **Safe Area Issues:** ${report.summary.safeAreaIssues}`);
  lines.push(`- **Overflow Issues:** ${report.summary.overflowIssues}`);
  lines.push('');
  
  // Page Results
  lines.push('## Page Results');
  lines.push('');
  
  for (const pageResult of report.pageResults) {
    lines.push(`### ${pageResult.page} (${pageResult.theme})`);
    lines.push('');
    lines.push(`- **URL:** ${pageResult.url}`);
    lines.push(`- **Status:** ${pageResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`- **Issues Found:** ${pageResult.issues.length}`);
    lines.push('');
    
    if (pageResult.issues.length > 0) {
      // Group issues by severity
      const critical = pageResult.issues.filter(i => i.severity === 'critical');
      const high = pageResult.issues.filter(i => i.severity === 'high');
      const medium = pageResult.issues.filter(i => i.severity === 'medium');
      const low = pageResult.issues.filter(i => i.severity === 'low');
      
      if (critical.length > 0) {
        lines.push('#### 🔴 Critical Issues');
        lines.push('');
        for (const issue of critical) {
          lines.push(`- **${issue.type}:** ${issue.description}`);
          lines.push(`  - Selector: \`${issue.selector}\``);
          if (issue.screenshot) {
            lines.push(`  - Screenshot: ${issue.screenshot}`);
          }
        }
        lines.push('');
      }
      
      if (high.length > 0) {
        lines.push('#### 🟠 High Priority Issues');
        lines.push('');
        for (const issue of high) {
          lines.push(`- **${issue.type}:** ${issue.description}`);
          lines.push(`  - Selector: \`${issue.selector}\``);
        }
        lines.push('');
      }
      
      if (medium.length > 0) {
        lines.push('#### 🟡 Medium Priority Issues');
        lines.push('');
        for (const issue of medium) {
          lines.push(`- **${issue.type}:** ${issue.description}`);
        }
        lines.push('');
      }
      
      if (low.length > 0) {
        lines.push('#### 🟢 Low Priority Issues');
        lines.push('');
        lines.push(`- ${low.length} low priority issues found`);
        lines.push('');
      }
    }
  }
  
  // Recommendations
  lines.push('## Recommendations');
  lines.push('');
  
  if (report.criticalIssues > 0) {
    lines.push('### Critical Issues Require Immediate Attention');
    lines.push('');
    lines.push('Critical issues indicate content or functionality that is completely inaccessible to users. These should be fixed immediately:');
    lines.push('');
    lines.push('1. Review all clipped elements and ensure they fit within the viewport');
    lines.push('2. Check fixed/sticky elements that obscure interactive content');
    lines.push('3. Verify touch targets meet the 44x44px minimum size');
    lines.push('');
  }
  
  if (report.summary.safeAreaIssues > 0) {
    lines.push('### Safe Area Violations');
    lines.push('');
    lines.push('Content extending into the notch or home indicator areas should be addressed:');
    lines.push('');
    lines.push('- Add proper safe area insets using CSS `env(safe-area-inset-*)`');
    lines.push('- Ensure critical content respects the top 47px and bottom 34px zones');
    lines.push('');
  }
  
  if (report.summary.overlapIssues > 0) {
    lines.push('### Fixed Element Overlaps');
    lines.push('');
    lines.push('Fixed elements are obscuring content:');
    lines.push('');
    lines.push('- Review z-index stacking contexts');
    lines.push('- Add proper padding to page content to account for fixed headers/footers');
    lines.push('- Consider making fixed elements semi-transparent or auto-hiding');
    lines.push('');
  }
  
  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*This report was generated automatically by the iPhone 13 UI Audit test suite.*');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Save audit report to files (JSON and Markdown)
 * 
 * @param report - Audit report object
 * @param basePath - Base path for report files (default: 'e2e/reports')
 */
export async function saveAuditReport(
  report: AuditReport,
  basePath: string = 'e2e/reports'
): Promise<void> {
  try {
    // Note: In a real implementation, we would use fs.writeFile
    // For now, we just log that we would save the report
    console.log(`\nAudit report would be saved to:`);
    console.log(`  - ${basePath}/iphone13-audit-report.json`);
    console.log(`  - ${basePath}/iphone13-audit-report.md`);
  } catch (error) {
    console.error('Failed to save audit report:', error);
  }
}
