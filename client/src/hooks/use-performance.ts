/**
 * Performance Monitoring Hook
 * Track and optimize mobile performance
 */

import { useEffect, useRef, useState } from 'react';
import { FPSMeter, LatencyMeter, trackWebVitals, isLowEndDevice, getAnimationConfig } from '../lib/performance';
import { trackMobilePerformance } from '../lib/analytics';

/**
 * Track FPS for animations
 */
export function useFPSMonitor(enabled: boolean = false) {
  const meterRef = useRef<FPSMeter | null>(null);
  const [fps, setFPS] = useState(60);
  
  useEffect(() => {
    if (!enabled) return;
    
    const meter = new FPSMeter();
    meterRef.current = meter;
    
    let rafId: number;
    const tick = () => {
      meter.tick();
      setFPS(meter.getFPS());
      rafId = requestAnimationFrame(tick);
    };
    
    rafId = requestAnimationFrame(tick);
    
    // Track FPS every 5 seconds
    const interval = setInterval(() => {
      const currentFPS = meter.getFPS();
      if (currentFPS > 0) {
        trackMobilePerformance('animation_fps', currentFPS, window.location.pathname);
      }
    }, 5000);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
    };
  }, [enabled]);
  
  return fps;
}

/**
 * Track gesture latency
 */
export function useLatencyMonitor() {
  const meterRef = useRef<LatencyMeter>(new LatencyMeter());
  
  const startMeasure = () => {
    meterRef.current.start();
  };
  
  const endMeasure = (gestureName: string) => {
    const latency = meterRef.current.end();
    trackMobilePerformance('gesture_latency', latency, window.location.pathname);
    return latency;
  };
  
  return { startMeasure, endMeasure };
}

/**
 * Track page load performance
 */
export function useLoadPerformance() {
  useEffect(() => {
    // Track Web Vitals
    trackWebVitals();
    
    // Track page load time
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (loadTime > 0) {
        trackMobilePerformance('load_time', loadTime, window.location.pathname);
      }
    }
  }, []);
}

/**
 * Get device-optimized animation config
 */
export function useAnimationConfig() {
  const [config, setConfig] = useState(getAnimationConfig());
  
  useEffect(() => {
    // Update config if device capabilities change
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setConfig(getAnimationConfig());
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return config;
}

/**
 * Check if device is low-end
 */
export function useDeviceCapability() {
  const [isLowEnd, setIsLowEnd] = useState(false);
  
  useEffect(() => {
    setIsLowEnd(isLowEndDevice());
  }, []);
  
  return { isLowEnd };
}

/**
 * Optimize component rendering
 */
export function useRenderOptimization() {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    // Warn if component renders too frequently
    if (timeSinceLastRender < 16 && renderCount.current > 10) {
      console.warn('Component rendering too frequently, consider optimization');
    }
  });
  
  return {
    renderCount: renderCount.current,
    resetCount: () => { renderCount.current = 0; }
  };
}

/**
 * Prefetch resources on idle
 */
export function usePrefetch(urls: string[]) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const idleCallback = (window as any).requestIdleCallback(() => {
        urls.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = url;
          document.head.appendChild(link);
        });
      });
      
      return () => {
        (window as any).cancelIdleCallback(idleCallback);
      };
    } else {
      // Fallback: prefetch after a delay
      const timeout = setTimeout(() => {
        urls.forEach(url => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = url;
          document.head.appendChild(link);
        });
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [urls]);
}

/**
 * Monitor memory usage (if available)
 */
export function useMemoryMonitor() {
  const [memory, setMemory] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);
  
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const mem = (performance as any).memory;
        setMemory({
          used: mem.usedJSHeapSize,
          total: mem.totalJSHeapSize,
          limit: mem.jsHeapSizeLimit
        });
      }
    };
    
    checkMemory();
    const interval = setInterval(checkMemory, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return memory;
}
