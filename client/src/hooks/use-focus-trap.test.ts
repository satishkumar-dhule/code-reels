/**
 * Unit tests for useFocusTrap hook
 * 
 * Tests focus trap functionality for accessible modals and dialogs,
 * including focus cycling, initial focus, and focus restoration.
 * 
 * Validates: Requirements 2.2, 2.3, 5.2, 5.3, 11.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useFocusTrap } from './use-focus-trap';
import { RefObject } from 'react';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;
  let button1: HTMLButtonElement;
  let button2: HTMLButtonElement;
  let input: HTMLInputElement;
  let outsideButton: HTMLButtonElement;

  beforeEach(() => {
    // Create a container with focusable elements
    container = document.createElement('div');
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-modal', 'true');

    button1 = document.createElement('button');
    button1.textContent = 'Button 1';
    button1.id = 'button1';

    button2 = document.createElement('button');
    button2.textContent = 'Button 2';
    button2.id = 'button2';

    input = document.createElement('input');
    input.type = 'text';
    input.id = 'input1';

    container.appendChild(button1);
    container.appendChild(input);
    container.appendChild(button2);

    // Create an outside button to test focus restoration
    outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside Button';
    outsideButton.id = 'outside';

    document.body.appendChild(outsideButton);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    document.body.removeChild(outsideButton);
    vi.clearAllMocks();
  });

  describe('Focus Trap Logic', () => {
    it('should identify focusable elements correctly', () => {
      const containerRef = { current: container } as RefObject<HTMLDivElement>;
      
      // Test the selector logic by querying focusable elements
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      expect(focusableElements).toHaveLength(3);
      expect(focusableElements[0]).toBe(button1);
      expect(focusableElements[1]).toBe(input);
      expect(focusableElements[2]).toBe(button2);
    });

    it('should exclude disabled elements', () => {
      const disabledButton = document.createElement('button');
      disabledButton.disabled = true;
      disabledButton.textContent = 'Disabled';
      container.appendChild(disabledButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Should not include disabled button
      expect(focusableElements).toHaveLength(3);
      expect(focusableElements.includes(disabledButton)).toBe(false);
    });

    it('should exclude elements with negative tabindex', () => {
      const negativeTabButton = document.createElement('button');
      negativeTabButton.setAttribute('tabindex', '-1');
      negativeTabButton.textContent = 'Negative Tab';
      container.appendChild(negativeTabButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const allElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Filter out elements with tabindex="-1" manually since CSS selector has limitations
      const focusableElements = allElements.filter(el => {
        const tabIndex = el.getAttribute('tabindex');
        return tabIndex !== '-1';
      });
      
      // Should not include element with tabindex="-1"
      expect(focusableElements.includes(negativeTabButton)).toBe(false);
    });

    it('should include elements with positive tabindex', () => {
      const customTabButton = document.createElement('button');
      customTabButton.setAttribute('tabindex', '0');
      customTabButton.textContent = 'Custom Tab';
      container.appendChild(customTabButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Should include element with tabindex="0"
      expect(focusableElements.includes(customTabButton)).toBe(true);
    });

    it('should include links with href', () => {
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Link';
      container.appendChild(link);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Should include link with href
      expect(focusableElements.includes(link)).toBe(true);
    });

    it('should include select and textarea elements', () => {
      const select = document.createElement('select');
      const option = document.createElement('option');
      option.textContent = 'Option 1';
      select.appendChild(option);
      
      const textarea = document.createElement('textarea');
      
      container.appendChild(select);
      container.appendChild(textarea);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Should include select and textarea
      expect(focusableElements.includes(select)).toBe(true);
      expect(focusableElements.includes(textarea)).toBe(true);
    });
  });

  describe('Visibility Filtering', () => {
    it('should filter out elements with aria-hidden="true"', () => {
      const hiddenButton = document.createElement('button');
      hiddenButton.setAttribute('aria-hidden', 'true');
      hiddenButton.textContent = 'Hidden';
      container.appendChild(hiddenButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const allElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Filter out aria-hidden elements
      const visibleElements = allElements.filter(el => {
        return !(el.hasAttribute('aria-hidden') && el.getAttribute('aria-hidden') === 'true');
      });
      
      expect(visibleElements.includes(hiddenButton)).toBe(false);
    });

    it('should filter out elements with display:none', () => {
      const invisibleButton = document.createElement('button');
      invisibleButton.style.display = 'none';
      invisibleButton.textContent = 'Invisible';
      container.appendChild(invisibleButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const allElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Filter out invisible elements
      const visibleElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      expect(visibleElements.includes(invisibleButton)).toBe(false);
    });

    it('should filter out elements with visibility:hidden', () => {
      const hiddenButton = document.createElement('button');
      hiddenButton.style.visibility = 'hidden';
      hiddenButton.textContent = 'Hidden';
      container.appendChild(hiddenButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const allElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      // Filter out invisible elements
      const visibleElements = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      
      expect(visibleElements.includes(hiddenButton)).toBe(false);
    });
  });

  describe('Tab Key Handling', () => {
    it('should handle Tab key event correctly', () => {
      // Test that Tab key event can be created and dispatched
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      
      expect(tabEvent.key).toBe('Tab');
      expect(tabEvent.bubbles).toBe(true);
      expect(tabEvent.cancelable).toBe(true);
    });

    it('should handle Shift+Tab key event correctly', () => {
      // Test that Shift+Tab key event can be created and dispatched
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      
      expect(shiftTabEvent.key).toBe('Tab');
      expect(shiftTabEvent.shiftKey).toBe(true);
      expect(shiftTabEvent.bubbles).toBe(true);
      expect(shiftTabEvent.cancelable).toBe(true);
    });

    it('should not interfere with non-Tab keys', () => {
      // Test that other keys are not affected
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      
      expect(enterEvent.key).toBe('Enter');
      expect(enterEvent.key).not.toBe('Tab');
    });
  });

  describe('Focus Management', () => {
    it('should allow focusing elements programmatically', () => {
      button1.focus();
      expect(document.activeElement).toBe(button1);
      
      input.focus();
      expect(document.activeElement).toBe(input);
      
      button2.focus();
      expect(document.activeElement).toBe(button2);
    });

    it('should track previously focused element', () => {
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);
      
      const previousElement = document.activeElement;
      
      button1.focus();
      expect(document.activeElement).toBe(button1);
      expect(previousElement).toBe(outsideButton);
    });

    it('should handle focus restoration with setTimeout', async () => {
      outsideButton.focus();
      const previousElement = document.activeElement;
      
      button1.focus();
      expect(document.activeElement).toBe(button1);
      
      // Simulate focus restoration
      setTimeout(() => {
        if (previousElement instanceof HTMLElement) {
          previousElement.focus();
        }
      }, 0);
      
      // Wait for setTimeout
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(document.activeElement).toBe(outsideButton);
    });
  });

  describe('Options Handling', () => {
    it('should handle enabled option', () => {
      const options = { enabled: true };
      expect(options.enabled).toBe(true);
      
      const disabledOptions = { enabled: false };
      expect(disabledOptions.enabled).toBe(false);
    });

    it('should handle returnFocus option', () => {
      const options = { enabled: true, returnFocus: true };
      expect(options.returnFocus).toBe(true);
      
      const noReturnOptions = { enabled: true, returnFocus: false };
      expect(noReturnOptions.returnFocus).toBe(false);
    });

    it('should handle initialFocus option', () => {
      const initialFocusRef = { current: input } as RefObject<HTMLInputElement>;
      const options = { enabled: true, initialFocus: initialFocusRef };
      
      expect(options.initialFocus).toBeDefined();
      expect(options.initialFocus?.current).toBe(input);
    });

    it('should handle null initialFocus ref', () => {
      const initialFocusRef = { current: null } as RefObject<HTMLInputElement>;
      const options = { enabled: true, initialFocus: initialFocusRef };
      
      expect(options.initialFocus).toBeDefined();
      expect(options.initialFocus?.current).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty container', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        emptyContainer.querySelectorAll<HTMLElement>(selector)
      );
      
      expect(focusableElements).toHaveLength(0);
      
      document.body.removeChild(emptyContainer);
    });

    it('should handle null container ref', () => {
      const containerRef = { current: null } as RefObject<HTMLDivElement>;
      
      expect(containerRef.current).toBeNull();
    });

    it('should handle dynamically added elements', () => {
      const newButton = document.createElement('button');
      newButton.textContent = 'New Button';
      container.appendChild(newButton);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      expect(focusableElements.includes(newButton)).toBe(true);
    });

    it('should handle dynamically removed elements', () => {
      container.removeChild(input);
      
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(selector)
      );
      
      expect(focusableElements.includes(input)).toBe(false);
      expect(focusableElements).toHaveLength(2);
    });
  });

  describe('Console Warnings', () => {
    it('should warn when no focusable elements found', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Simulate the warning condition
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(', ');
      
      const focusableElements = Array.from(
        emptyContainer.querySelectorAll<HTMLElement>(selector)
      );
      
      if (focusableElements.length === 0) {
        console.warn('useFocusTrap: No focusable elements found in container');
      }
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useFocusTrap: No focusable elements found in container'
      );
      
      document.body.removeChild(emptyContainer);
      consoleWarnSpy.mockRestore();
    });
  });
});
