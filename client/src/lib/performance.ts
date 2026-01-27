/**
 * Performance Utilities
 * Optimize mobile performance
 */

import { trackMobilePerformance } from './analytics';

/**
 * Debounce function calls
 * Prevents excessive function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * Limits function execution rate
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Request Animation Frame wrapper
 * Ensures smooth 60fps animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    if (rafId) {
      return;
    }
    
    rafId = requestAnimationFrame(() => {
      func(...args);
      rafId = null;
    });
  };
}

/**
 * Measure animation FPS
 * Track animation performance
 */
export class FPSMeter {
  private frames: number[] = [];
  private lastTime: number = performance.now();
  
  tick() {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.frames.push(1000 / delta);
    
    // Keep only last 60 frames
    if (this.frames.length > 60) {
      this.frames.shift();
    }
  }
  
  getFPS(): number {
    if (this.frames.length === 0) return 0;
    return Math.round(this.frames.reduce((a, b) => a + b, 0) / this.frames.length);
  }
  
  reset() {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

/**
 * Measure gesture latency
 * Track time from gesture start to completion
 */
export class LatencyMeter {
  private startTime: number = 0;
  
  start() {
    this.startTime = performance.now();
  }
  
  end(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Lazy load images
 * Improves initial load time
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  placeholder?: string
) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    
    if (placeholder) {
      img.src = placeholder;
    }
    
    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = src;
  }
}

/**
 * Preload critical resources
 * Improves perceived performance
 */
export function preloadResource(url: string, type: 'image' | 'script' | 'style') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = type;
  document.head.appendChild(link);
}

/**
 * Check if device is low-end
 * Adjust features based on device capability
 */
export function isLowEndDevice(): boolean {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 1;
  if (cores < 4) return true;
  
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return true;
  
  // Check connection speed
  const connection = (navigator as any).connection;
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return true;
  }
  
  return false;
}

/**
 * Optimize animations for low-end devices
 * Reduce animation complexity
 */
export function getAnimationConfig() {
  const isLowEnd = isLowEndDevice();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return {
    enabled: !prefersReducedMotion,
    duration: isLowEnd ? 150 : 300,
    easing: isLowEnd ? 'ease-out' : 'ease-in-out',
    stiffness: isLowEnd ? 200 : 300,
    damping: isLowEnd ? 20 : 30,
  };
}

/**
 * Track Core Web Vitals
 * Monitor performance metrics
 */
export function trackWebVitals() {
  // First Contentful Paint (FCP)
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        const fcp = entry.startTime;
        trackMobilePerformance('load_time', fcp, window.location.pathname);
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['paint'] });
  } catch (e) {
    // Browser doesn't support this API
  }
  
  // Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    const lcp = lastEntry.startTime;
    trackMobilePerformance('load_time', lcp, window.location.pathname);
  });
  
  try {
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
  } catch (e) {
    // Browser doesn't support this API
  }
}

/**
 * Optimize scroll performance
 * Use passive event listeners
 */
export function addPassiveScrollListener(
  element: HTMLElement | Window,
  handler: EventListener
) {
  element.addEventListener('scroll', handler, { passive: true });
  
  return () => {
    element.removeEventListener('scroll', handler);
  };
}

/**
 * Batch DOM updates
 * Reduce layout thrashing
 */
export function batchDOMUpdates(updates: (() => void)[]) {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
}

/**
 * Memoize expensive computations
 * Cache results for better performance
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T
): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

/**
 * Check if element is in viewport
 * Useful for lazy loading
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Get optimal image size
 * Serve appropriate image resolution
 */
export function getOptimalImageSize(): 'small' | 'medium' | 'large' {
  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  const effectiveWidth = width * dpr;
  
  if (effectiveWidth < 640) return 'small';
  if (effectiveWidth < 1280) return 'medium';
  return 'large';
}

/**
 * Prefetch next page
 * Improve navigation speed
 */
export function prefetchPage(url: string) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Clear performance marks
 * Clean up after measurements
 */
export function clearPerformanceMarks(name?: string) {
  if (name) {
    performance.clearMarks(name);
    performance.clearMeasures(name);
  } else {
    performance.clearMarks();
    performance.clearMeasures();
  }
}
