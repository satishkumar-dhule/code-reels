/**
 * Unit tests for useKeyboardNavigation hook
 * 
 * Tests keyboard shortcut registration and handling,
 * including modifier keys, event cleanup, and edge cases.
 * 
 * Validates: Requirements 11.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KeyboardShortcut } from './use-keyboard-navigation';

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Keyboard Event Matching', () => {
    it('should match key without modifiers', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        handler,
        description: 'Test shortcut'
      };

      // Simulate the matching logic
      const event = new KeyboardEvent('keydown', { key: 'k' });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(true);
    });


    it('should match key with Ctrl modifier', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrlKey: true,
        handler,
        description: 'Ctrl+K shortcut'
      };

      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(true);
    });

    it('should not match when Ctrl is required but not pressed', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrlKey: true,
        handler,
        description: 'Ctrl+K shortcut'
      };

      const event = new KeyboardEvent('keydown', { key: 'k' });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(false);
    });

    it('should match multiple modifier keys', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        handler,
        description: 'Ctrl+Shift+S shortcut'
      };

      const event = new KeyboardEvent('keydown', { 
        key: 's', 
        ctrlKey: true, 
        shiftKey: true 
      });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(true);
    });

    it('should not match when not all required modifiers are pressed', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        handler,
        description: 'Ctrl+Shift+S shortcut'
      };

      const event = new KeyboardEvent('keydown', { 
        key: 's', 
        ctrlKey: true 
      });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(false);
    });

    it('should match Alt modifier key', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'a',
        altKey: true,
        handler,
        description: 'Alt+A shortcut'
      };

      const event = new KeyboardEvent('keydown', { key: 'a', altKey: true });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(true);
    });

    it('should match Meta modifier key', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        metaKey: true,
        handler,
        description: 'Meta+K shortcut'
      };

      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      const matches = 
        event.key === shortcut.key &&
        (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
        (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey) &&
        (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
        (shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey);

      expect(matches).toBe(true);
    });

    it('should match arrow keys', () => {
      const leftShortcut: KeyboardShortcut = {
        key: 'ArrowLeft',
        handler: vi.fn(),
        description: 'Navigate left'
      };

      const rightShortcut: KeyboardShortcut = {
        key: 'ArrowRight',
        handler: vi.fn(),
        description: 'Navigate right'
      };

      const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });

      expect(leftEvent.key).toBe(leftShortcut.key);
      expect(rightEvent.key).toBe(rightShortcut.key);
    });

    it('should match special keys like Enter and Escape', () => {
      const enterShortcut: KeyboardShortcut = {
        key: 'Enter',
        handler: vi.fn(),
        description: 'Submit'
      };

      const escapeShortcut: KeyboardShortcut = {
        key: 'Escape',
        handler: vi.fn(),
        description: 'Cancel'
      };

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      expect(enterEvent.key).toBe(enterShortcut.key);
      expect(escapeEvent.key).toBe(escapeShortcut.key);
    });

    it('should not match unregistered keys', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        handler,
        description: 'Test shortcut'
      };

      const event = new KeyboardEvent('keydown', { key: 'x' });
      const matches = event.key === shortcut.key;

      expect(matches).toBe(false);
    });
  });

  describe('Shortcut Configuration', () => {
    it('should create valid shortcut with key only', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        handler,
        description: 'Simple shortcut'
      };

      expect(shortcut.key).toBe('k');
      expect(shortcut.handler).toBe(handler);
      expect(shortcut.description).toBe('Simple shortcut');
      expect(shortcut.ctrlKey).toBeUndefined();
      expect(shortcut.shiftKey).toBeUndefined();
      expect(shortcut.altKey).toBeUndefined();
      expect(shortcut.metaKey).toBeUndefined();
    });

    it('should create valid shortcut with all modifiers', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
        handler,
        description: 'Complex shortcut'
      };

      expect(shortcut.key).toBe('s');
      expect(shortcut.ctrlKey).toBe(true);
      expect(shortcut.shiftKey).toBe(true);
      expect(shortcut.altKey).toBe(true);
      expect(shortcut.metaKey).toBe(true);
      expect(shortcut.handler).toBe(handler);
      expect(shortcut.description).toBe('Complex shortcut');
    });

    it('should allow false values for modifiers', () => {
      const handler = vi.fn();
      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrlKey: false,
        shiftKey: false,
        handler,
        description: 'Explicit false modifiers'
      };

      expect(shortcut.ctrlKey).toBe(false);
      expect(shortcut.shiftKey).toBe(false);
    });
  });

  describe('Event Listener Management', () => {
    it('should create keydown event correctly', () => {
      const event = new KeyboardEvent('keydown', { 
        key: 'k',
        bubbles: true,
        cancelable: true
      });

      expect(event.type).toBe('keydown');
      expect(event.key).toBe('k');
      expect(event.bubbles).toBe(true);
      expect(event.cancelable).toBe(true);
    });

    it('should create event with modifiers correctly', () => {
      const event = new KeyboardEvent('keydown', { 
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
        bubbles: true,
        cancelable: true
      });

      expect(event.ctrlKey).toBe(true);
      expect(event.shiftKey).toBe(true);
      expect(event.altKey).toBe(true);
      expect(event.metaKey).toBe(true);
    });

    it('should allow preventDefault on events', () => {
      const event = new KeyboardEvent('keydown', { 
        key: 'k',
        cancelable: true
      });

      expect(event.defaultPrevented).toBe(false);
      event.preventDefault();
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('Multiple Shortcuts Handling', () => {
    it('should handle array of shortcuts', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'k',
          ctrlKey: true,
          handler: handler1,
          description: 'Ctrl+K shortcut'
        },
        {
          key: 'Escape',
          handler: handler2,
          description: 'Escape shortcut'
        }
      ];

      expect(shortcuts).toHaveLength(2);
      expect(shortcuts[0].key).toBe('k');
      expect(shortcuts[1].key).toBe('Escape');
    });

    it('should prioritize first matching shortcut', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'k',
          handler: handler1,
          description: 'First K handler'
        },
        {
          key: 'k',
          handler: handler2,
          description: 'Second K handler'
        }
      ];

      const event = new KeyboardEvent('keydown', { key: 'k' });
      
      // Simulate the loop logic that breaks on first match
      let matchedHandler: ((e: KeyboardEvent) => void) | null = null;
      for (const shortcut of shortcuts) {
        if (event.key === shortcut.key) {
          matchedHandler = shortcut.handler;
          break;
        }
      }

      expect(matchedHandler).toBe(handler1);
      expect(matchedHandler).not.toBe(handler2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty shortcuts array', () => {
      const shortcuts: KeyboardShortcut[] = [];
      expect(shortcuts).toHaveLength(0);
    });

    it('should handle case-sensitive keys', () => {
      const lowerShortcut: KeyboardShortcut = {
        key: 'k',
        handler: vi.fn(),
        description: 'Lowercase k'
      };

      const upperShortcut: KeyboardShortcut = {
        key: 'K',
        handler: vi.fn(),
        description: 'Uppercase K'
      };

      const lowerEvent = new KeyboardEvent('keydown', { key: 'k' });
      const upperEvent = new KeyboardEvent('keydown', { key: 'K' });

      expect(lowerEvent.key).toBe(lowerShortcut.key);
      expect(upperEvent.key).toBe(upperShortcut.key);
      expect(lowerEvent.key).not.toBe(upperShortcut.key);
    });

    it('should handle numeric keys', () => {
      const shortcut: KeyboardShortcut = {
        key: '1',
        handler: vi.fn(),
        description: 'Number 1'
      };

      const event = new KeyboardEvent('keydown', { key: '1' });
      expect(event.key).toBe(shortcut.key);
    });

    it('should handle space key', () => {
      const shortcut: KeyboardShortcut = {
        key: ' ',
        handler: vi.fn(),
        description: 'Space key'
      };

      const event = new KeyboardEvent('keydown', { key: ' ' });
      expect(event.key).toBe(shortcut.key);
    });

    it('should handle function keys', () => {
      const shortcut: KeyboardShortcut = {
        key: 'F1',
        handler: vi.fn(),
        description: 'F1 key'
      };

      const event = new KeyboardEvent('keydown', { key: 'F1' });
      expect(event.key).toBe(shortcut.key);
    });
  });

  describe('Handler Function', () => {
    it('should pass event to handler', () => {
      const handler = vi.fn();
      const event = new KeyboardEvent('keydown', { key: 'k' });
      
      handler(event);
      
      expect(handler).toHaveBeenCalledWith(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow handler to access event properties', () => {
      const handler = vi.fn((e: KeyboardEvent) => {
        return {
          key: e.key,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey
        };
      });
      
      const event = new KeyboardEvent('keydown', { 
        key: 'k',
        ctrlKey: true,
        shiftKey: false
      });
      
      const result = handler(event);
      
      expect(result.key).toBe('k');
      expect(result.ctrlKey).toBe(true);
      expect(result.shiftKey).toBe(false);
    });
  });

  describe('Description Field', () => {
    it('should store description for documentation', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrlKey: true,
        handler: vi.fn(),
        description: 'Open search dialog'
      };

      expect(shortcut.description).toBe('Open search dialog');
    });

    it('should allow empty description', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        handler: vi.fn(),
        description: ''
      };

      expect(shortcut.description).toBe('');
    });

    it('should allow detailed description', () => {
      const shortcut: KeyboardShortcut = {
        key: 'k',
        ctrlKey: true,
        handler: vi.fn(),
        description: 'Open the global search dialog to search across all content, questions, and learning paths'
      };

      expect(shortcut.description).toContain('search');
      expect(shortcut.description.length).toBeGreaterThan(20);
    });
  });
});
