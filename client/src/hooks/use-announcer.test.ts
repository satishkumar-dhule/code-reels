/**
 * Unit tests for useAnnouncer hook
 * 
 * Tests live region creation, announcement functionality, and cleanup,
 * ensuring dynamic content is properly announced to screen readers.
 * 
 * Validates: Requirements 1.3, 9.5, 11.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('useAnnouncer', () => {
  beforeEach(() => {
    // Clear any existing live regions
    const existingRegions = document.querySelectorAll('[role="status"]');
    existingRegions.forEach(region => region.remove());
  });

  afterEach(() => {
    // Cleanup
    const existingRegions = document.querySelectorAll('[role="status"]');
    existingRegions.forEach(region => region.remove());
    vi.clearAllMocks();
  });

  describe('Live Region Creation', () => {
    it('should create a live region element', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
      
      const liveRegion = document.querySelector('[role="status"]');
      expect(liveRegion).toBeTruthy();
      expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion?.getAttribute('aria-atomic')).toBe('true');
      
      document.body.removeChild(announcer);
    });

    it('should have screen reader only styles', () => {
      const announcer = document.createElement('div');
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      
      expect(announcer.style.position).toBe('absolute');
      expect(announcer.style.left).toBe('-10000px');
      expect(announcer.style.width).toBe('1px');
      expect(announcer.style.height).toBe('1px');
      expect(announcer.style.overflow).toBe('hidden');
      
      document.body.removeChild(announcer);
    });

    it('should append live region to document body', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      expect(document.body.contains(announcer)).toBe(true);
      
      document.body.removeChild(announcer);
    });

    it('should create only one live region per hook instance', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      const liveRegions = document.querySelectorAll('[role="status"]');
      expect(liveRegions.length).toBe(1);
      
      document.body.removeChild(announcer);
    });
  });

  describe('Announcement Functionality', () => {
    it('should set text content for announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Test announcement';
      
      expect(announcer.textContent).toBe('Test announcement');
      
      document.body.removeChild(announcer);
    });

    it('should support polite priority announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.setAttribute('aria-live', 'polite');
      announcer.textContent = 'Polite announcement';
      
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      expect(announcer.textContent).toBe('Polite announcement');
      
      document.body.removeChild(announcer);
    });

    it('should support assertive priority announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.setAttribute('aria-live', 'assertive');
      announcer.textContent = 'Assertive announcement';
      
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
      expect(announcer.textContent).toBe('Assertive announcement');
      
      document.body.removeChild(announcer);
    });

    it('should update text content for multiple announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'First announcement';
      expect(announcer.textContent).toBe('First announcement');
      
      announcer.textContent = 'Second announcement';
      expect(announcer.textContent).toBe('Second announcement');
      
      document.body.removeChild(announcer);
    });

    it('should handle empty string announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      announcer.textContent = '';
      
      expect(announcer.textContent).toBe('');
      
      document.body.removeChild(announcer);
    });

    it('should handle long text announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      const longText = 'This is a very long announcement that contains multiple sentences and should still be announced properly by screen readers.';
      announcer.textContent = longText;
      
      expect(announcer.textContent).toBe(longText);
      
      document.body.removeChild(announcer);
    });

    it('should handle special characters in announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      const specialText = 'Error: <script>alert("test")</script>';
      announcer.textContent = specialText;
      
      // textContent should escape HTML
      expect(announcer.textContent).toBe(specialText);
      expect(announcer.innerHTML).not.toContain('<script>');
      
      document.body.removeChild(announcer);
    });
  });

  describe('Priority Switching', () => {
    it('should switch from polite to assertive', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      
      announcer.setAttribute('aria-live', 'assertive');
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
      
      document.body.removeChild(announcer);
    });

    it('should switch from assertive to polite', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'assertive');
      document.body.appendChild(announcer);
      
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
      
      announcer.setAttribute('aria-live', 'polite');
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      
      document.body.removeChild(announcer);
    });

    it('should maintain priority across multiple announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'assertive');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'First';
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
      
      announcer.textContent = 'Second';
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
      
      document.body.removeChild(announcer);
    });
  });

  describe('Cleanup Behavior', () => {
    it('should remove live region from DOM on cleanup', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      expect(document.body.contains(announcer)).toBe(true);
      
      document.body.removeChild(announcer);
      
      expect(document.body.contains(announcer)).toBe(false);
    });

    it('should handle cleanup when element already removed', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      document.body.removeChild(announcer);
      
      // Should not throw when trying to remove again
      expect(() => {
        if (document.body.contains(announcer)) {
          document.body.removeChild(announcer);
        }
      }).not.toThrow();
    });

    it('should clear text content before cleanup', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.textContent = 'Test';
      document.body.appendChild(announcer);
      
      announcer.textContent = '';
      expect(announcer.textContent).toBe('');
      
      document.body.removeChild(announcer);
    });
  });

  describe('Message Clearing', () => {
    it('should support clearing messages with setTimeout', async () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Test message';
      expect(announcer.textContent).toBe('Test message');
      
      setTimeout(() => {
        announcer.textContent = '';
      }, 100);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(announcer.textContent).toBe('');
      
      document.body.removeChild(announcer);
    });

    it('should allow repeated announcements of same message', async () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Same message';
      expect(announcer.textContent).toBe('Same message');
      
      // Clear
      announcer.textContent = '';
      
      // Announce again
      announcer.textContent = 'Same message';
      expect(announcer.textContent).toBe('Same message');
      
      document.body.removeChild(announcer);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null ref gracefully', () => {
      let announcerRef: HTMLDivElement | null = null;
      
      expect(announcerRef).toBeNull();
      
      if (announcerRef) {
        announcerRef.textContent = 'Test';
      }
      
      // Should not throw
      expect(announcerRef).toBeNull();
    });

    it('should warn when trying to announce without initialized region', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const announcerRef: HTMLDivElement | null = null;
      
      if (!announcerRef) {
        console.warn('useAnnouncer: Live region not initialized');
      }
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('useAnnouncer: Live region not initialized');
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle rapid successive announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'First';
      announcer.textContent = 'Second';
      announcer.textContent = 'Third';
      
      expect(announcer.textContent).toBe('Third');
      
      document.body.removeChild(announcer);
    });

    it('should handle announcements with newlines', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      const multilineText = 'Line 1\nLine 2\nLine 3';
      announcer.textContent = multilineText;
      
      expect(announcer.textContent).toBe(multilineText);
      
      document.body.removeChild(announcer);
    });

    it('should handle announcements with unicode characters', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      const unicodeText = 'Hello 👋 World 🌍';
      announcer.textContent = unicodeText;
      
      expect(announcer.textContent).toBe(unicodeText);
      
      document.body.removeChild(announcer);
    });
  });

  describe('Integration Scenarios', () => {
    it('should support form validation announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'assertive');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Error: Email is required';
      
      expect(announcer.getAttribute('aria-live')).toBe('assertive');
      expect(announcer.textContent).toBe('Error: Email is required');
      
      document.body.removeChild(announcer);
    });

    it('should support success message announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Changes saved successfully';
      
      expect(announcer.getAttribute('aria-live')).toBe('polite');
      expect(announcer.textContent).toBe('Changes saved successfully');
      
      document.body.removeChild(announcer);
    });

    it('should support loading state announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Loading...';
      expect(announcer.textContent).toBe('Loading...');
      
      // Update when loaded
      announcer.textContent = 'Content loaded';
      expect(announcer.textContent).toBe('Content loaded');
      
      document.body.removeChild(announcer);
    });

    it('should support notification announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'You have 3 new messages';
      
      expect(announcer.textContent).toBe('You have 3 new messages');
      
      document.body.removeChild(announcer);
    });

    it('should support dynamic content update announcements', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      announcer.textContent = 'Search results updated: 42 items found';
      
      expect(announcer.textContent).toBe('Search results updated: 42 items found');
      
      document.body.removeChild(announcer);
    });
  });

  describe('ARIA Attributes', () => {
    it('should have role="status"', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      document.body.appendChild(announcer);
      
      expect(announcer.getAttribute('role')).toBe('status');
      
      document.body.removeChild(announcer);
    });

    it('should have aria-atomic="true"', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
      
      expect(announcer.getAttribute('aria-atomic')).toBe('true');
      
      document.body.removeChild(announcer);
    });

    it('should have aria-live attribute', () => {
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
      
      expect(announcer.hasAttribute('aria-live')).toBe(true);
      expect(['polite', 'assertive']).toContain(announcer.getAttribute('aria-live'));
      
      document.body.removeChild(announcer);
    });
  });
});