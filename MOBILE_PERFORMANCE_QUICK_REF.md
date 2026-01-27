# Mobile Performance - Quick Reference ⚡

## Import

```typescript
// Performance utilities
import {
  debounce,
  throttle,
  rafThrottle,
  FPSMeter,
  LatencyMeter,
  lazyLoadImage,
  isLowEndDevice,
  getAnimationConfig
} from '@/lib/performance';

// Performance hooks
import {
  useFPSMonitor,
  useLatencyMonitor,
  useLoadPerformance,
  useAnimationConfig,
  useDeviceCapability,
  usePrefetch
} from '@/hooks/use-performance';
```

---

## Common Patterns

### 1. Optimize Scroll Handler
```typescript
import { rafThrottle } from '@/lib/performance';

// RAF-throttled for 60fps
const handleScroll = rafThrottle(() => {
  // Handle scroll
});

window.addEventListener('scroll', handleScroll, { passive: true });
```

### 2. Monitor FPS
```typescript
import { useFPSMonitor } from '@/hooks/use-performance';

function MyComponent() {
  const fps = useFPSMonitor(true);
  console.log('FPS:', fps); // 60
}
```

### 3. Track Gesture Latency
```typescript
import { useLatencyMonitor } from '@/hooks/use-performance';

function MyComponent() {
  const { startMeasure, endMeasure } = useLatencyMonitor();
  
  const handleGesture = () => {
    startMeasure();
    // Perform gesture
    const latency = endMeasure('swipe');
    console.log('Latency:', latency, 'ms');
  };
}
```

### 4. Device-Adaptive Animations
```typescript
import { useAnimationConfig } from '@/hooks/use-performance';

function MyComponent() {
  const config = useAnimationConfig();
  
  return (
    <motion.div
      animate={{ x: 100 }}
      transition={{
        type: 'spring',
        stiffness: config.stiffness, // 200 or 300
        damping: config.damping       // 20 or 30
      }}
    />
  );
}
```

### 5. Detect Low-End Device
```typescript
import { useDeviceCapability } from '@/hooks/use-performance';

function MyComponent() {
  const { isLowEnd } = useDeviceCapability();
  
  return isLowEnd ? <SimpleUI /> : <ComplexUI />;
}
```

### 6. Lazy Load Images
```typescript
import { lazyLoadImage } from '@/lib/performance';

useEffect(() => {
  const img = imgRef.current;
  if (img) {
    lazyLoadImage(img, 'full.jpg', 'placeholder.jpg');
  }
}, []);
```

### 7. Prefetch Pages
```typescript
import { usePrefetch } from '@/hooks/use-performance';

function MyComponent() {
  usePrefetch(['/next-page', '/another-page']);
}
```

### 8. Debounce Input
```typescript
import { debounce } from '@/lib/performance';

const handleSearch = debounce((query: string) => {
  // Search
}, 300);
```

### 9. Throttle Events
```typescript
import { throttle } from '@/lib/performance';

const handleResize = throttle(() => {
  // Handle resize
}, 100);
```

### 10. Batch DOM Updates
```typescript
import { batchDOMUpdates } from '@/lib/performance';

batchDOMUpdates([
  () => el1.style.color = 'red',
  () => el2.style.color = 'blue'
]);
```

---

## Performance Targets

### Core Web Vitals
- **FCP**: < 1.8s (Good: < 1.0s)
- **LCP**: < 2.5s (Good: < 1.5s)
- **FID**: < 100ms (Good: < 50ms)
- **CLS**: < 0.1 (Good: < 0.05)

### Animation Performance
- **FPS**: 60 (Minimum: 30)
- **Latency**: < 100ms (Good: < 50ms)

### Bundle Size
- **Initial**: < 500KB
- **Per Route**: < 200KB

---

## Device Detection

### Low-End Device
```typescript
const isLowEnd = isLowEndDevice();
// true if:
// - CPU cores < 4
// - Memory < 4GB
// - Connection: 2G/slow-2G
```

### Reduced Motion
```typescript
const config = getAnimationConfig();
// config.enabled = false if user prefers reduced motion
```

---

## Monitoring

### Track FPS
```typescript
trackMobilePerformance('animation_fps', 60, '/home');
```

### Track Latency
```typescript
trackMobilePerformance('gesture_latency', 50, '/questions');
```

### Track Load Time
```typescript
trackMobilePerformance('load_time', 1200, '/stats');
```

---

## Best Practices

### Do ✅
- Use RAF throttling for scroll
- Use passive event listeners
- Lazy load components
- Memoize expensive computations
- Batch DOM updates
- Optimize for low-end devices
- Respect reduced motion

### Don't ❌
- Use regular throttle for scroll
- Use non-passive listeners
- Load everything upfront
- Compute on every render
- Update DOM individually
- Ignore device capability
- Force animations

---

## Testing

### Manual
```bash
# Open DevTools Performance tab
# Record → Trigger gestures → Stop
# Check FPS, layout shifts
```

### Automated
```bash
# Lighthouse
npm run lighthouse

# Bundle size
npm run build
npx vite-bundle-visualizer
```

---

## Quick Checklist

- [ ] RAF-throttled scroll handlers
- [ ] Passive event listeners
- [ ] Lazy loaded components
- [ ] Device-adaptive animations
- [ ] Reduced motion support
- [ ] Performance monitoring
- [ ] Bundle size < 500KB
- [ ] FPS = 60
- [ ] Latency < 100ms

---

**Performance optimized! ⚡**
