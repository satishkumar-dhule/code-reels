import { test, expect } from '@playwright/test';

test.describe('Answer Panel Theme Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Visit a question page
    await page.goto('/channel/data-structures/q-727');
    await page.waitForLoadState('networkidle');
  });

  test.skip('Answer panel should have light background in light mode', async ({ page }) => {
    // Directly set the theme attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'genz-light');
      localStorage.setItem('theme', 'genz-light');
      // Trigger a storage event to notify React
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'theme',
        newValue: 'genz-light',
        oldValue: 'genz-dark'
      }));
    });
    
    // Wait for React to re-render
    await page.waitForTimeout(1000);

    // Check answer panel container background
    const answerPanel = page.locator('.w-1\\/2.overflow-y-auto.p-8').last();
    const bgColor = await answerPanel.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    console.log('Answer panel background:', bgColor);
    
    // Should be white or light (rgb values close to 255)
    expect(bgColor).toMatch(/rgb\(2[0-9]{2}|rgb\(255/);
  });

  test.skip('Expandable cards should have light background in light mode', async ({ page }) => {
    // Switch to light mode
    const themeToggle = page.locator('button').filter({ hasText: /theme/i }).first();
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    // Check expandable card backgrounds
    const cards = page.locator('.rounded-2xl.border.overflow-hidden');
    const count = await cards.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = cards.nth(i);
      const bgColor = await card.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      console.log(`Card ${i} background:`, bgColor);
      
      // Should not be black (rgb(0, 0, 0))
      expect(bgColor).not.toBe('rgb(0, 0, 0)');
      expect(bgColor).not.toBe('rgba(0, 0, 0, 1)');
    }
  });

  test.skip('Text should be dark in light mode', async ({ page }) => {
    // Switch to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'genz-light');
    });
    await page.waitForTimeout(500);

    // Check text color
    const textElements = page.locator('.text-foreground').first();
    if (await textElements.isVisible()) {
      const color = await textElements.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      
      console.log('Text color:', color);
      
      // Should be dark (rgb values close to 0)
      expect(color).toMatch(/rgb\([0-5][0-9]?/);
    }
  });

  test.skip('Check CSS variables in light mode', async ({ page }) => {
    // Switch to light mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'genz-light');
    });
    await page.waitForTimeout(500);

    // Check CSS variables
    const cssVars = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        card: styles.getPropertyValue('--card').trim(),
        primary: styles.getPropertyValue('--primary').trim(),
      };
    });

    console.log('CSS Variables:', cssVars);

    // Background should be white (hsl(0 0% 100%))
    expect(cssVars.background).toContain('100%');
    
    // Foreground should be dark (hsl(0 0% 5%))
    expect(cssVars.foreground).toContain('5%');
  });

  test.skip('Identify all black backgrounds in light mode', async ({ page }) => {
    // Directly set the theme attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'genz-light');
      localStorage.setItem('theme', 'genz-light');
      // Trigger a storage event to notify React
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'theme',
        newValue: 'genz-light',
        oldValue: 'genz-dark'
      }));
    });
    
    // Wait for React to re-render
    await page.waitForTimeout(1000);

    // Find all elements with black backgrounds
    const blackElements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      const blackBgs: Array<{ tag: string; classes: string; bg: string }> = [];
      
      allElements.forEach((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg === 'rgb(0, 0, 0)' || bg === 'rgba(0, 0, 0, 1)') {
          blackBgs.push({
            tag: el.tagName.toLowerCase(),
            classes: el.className.toString(),
            bg: bg
          });
        }
      });
      
      return blackBgs;
    });

    console.log('Elements with black backgrounds:', blackElements);
    
    // Log for debugging
    if (blackElements.length > 0) {
      console.log(`Found ${blackElements.length} elements with black backgrounds:`);
      blackElements.slice(0, 10).forEach((el, i) => {
        console.log(`${i + 1}. <${el.tag} class="${el.classes}">`);
      });
    }

    // Should have no black backgrounds in light mode
    expect(blackElements.length).toBe(0);
  });
});
