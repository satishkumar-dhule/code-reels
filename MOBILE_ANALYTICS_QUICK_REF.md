# Mobile Analytics - Quick Reference 📊

## Tracking Functions

### Import
```typescript
import {
  trackMobileGesture,
  trackPullToRefresh,
  trackSwipeCard,
  trackSwipeNavigation,
  trackFABTap,
  trackBottomSheet,
  trackHapticFeedback,
  trackSkeletonLoader,
  trackGestureSuccess,
  trackMobilePerformance
} from '@/lib/analytics';
```

---

## Usage Examples

### Pull-to-Refresh
```typescript
const handleRefresh = async () => {
  const startTime = Date.now();
  try {
    await fetchData();
    const duration = Date.now() - startTime;
    trackPullToRefresh('/home', duration, true);
  } catch (error) {
    const duration = Date.now() - startTime;
    trackPullToRefresh('/home', duration, false);
  }
};
```

### Swipe Card
```typescript
const handleSwipe = (direction: 'left' | 'right', velocity: number) => {
  const action = direction === 'left' ? 'Remove' : 'Continue';
  trackSwipeCard('/home', direction, action, velocity);
};
```

### Swipe Navigation
```typescript
const handleSwipeNav = (direction: 'left' | 'right', velocity: number) => {
  trackSwipeNavigation(
    '/questions',
    direction,
    currentQuestion.id,
    nextQuestion.id,
    velocity
  );
};
```

### FAB Tap
```typescript
const handleFABClick = () => {
  const scrollPos = window.scrollY;
  trackFABTap('/learning-paths', 'Create Path', scrollPos);
};
```

### Bottom Sheet
```typescript
const handleOpen = () => {
  trackBottomSheet('/settings', 'open', 'tap');
};

const handleClose = () => {
  trackBottomSheet('/settings', 'close', 'backdrop');
};
```

### Haptic Feedback
```typescript
Haptics.light();
trackHapticFeedback('light', 'button_tap');

Haptics.medium();
trackHapticFeedback('medium', 'swipe_action');

Haptics.impact();
trackHapticFeedback('impact', 'pull_threshold');
```

### Skeleton Loader
```typescript
const startTime = Date.now();
// Show skeleton
// ...
// Hide skeleton
const duration = Date.now() - startTime;
trackSkeletonLoader('/home', duration, 3);
```

### Gesture Success
```typescript
trackGestureSuccess('swipe_card', true, 1);
trackGestureSuccess('pull_to_refresh', false, 2);
```

### Mobile Performance
```typescript
trackMobilePerformance('animation_fps', 60, '/home');
trackMobilePerformance('gesture_latency', 50, '/questions');
trackMobilePerformance('load_time', 1200, '/stats');
```

---

## Event Data Structure

### mobile_gesture
```javascript
{
  event: 'mobile_gesture',
  gesture_type: string,
  page: string,
  timestamp: string,
  // Additional metadata
}
```

### haptic_feedback
```javascript
{
  event: 'haptic_feedback',
  pattern: 'light' | 'medium' | 'impact' | 'success' | 'error',
  context: string,
  timestamp: string
}
```

### skeleton_loader
```javascript
{
  event: 'skeleton_loader',
  page: string,
  duration_ms: number,
  count: number
}
```

### gesture_success
```javascript
{
  event: 'gesture_success',
  gesture_type: string,
  success: boolean,
  attempts: number
}
```

### mobile_performance
```javascript
{
  event: 'mobile_performance',
  metric: 'animation_fps' | 'gesture_latency' | 'load_time',
  value: number,
  page: string
}
```

---

## Google Analytics Queries

### Gesture Usage
```sql
-- Most used gestures
SELECT 
  gesture_type,
  COUNT(*) as count
FROM events
WHERE event_name = 'mobile_gesture'
GROUP BY gesture_type
ORDER BY count DESC;
```

### Average Velocity
```sql
-- Average swipe velocity
SELECT 
  AVG(velocity_px_per_sec) as avg_velocity
FROM events
WHERE event_name = 'mobile_gesture'
  AND gesture_type IN ('swipe_card', 'swipe_navigation');
```

### Success Rate
```sql
-- Pull-to-refresh success rate
SELECT 
  COUNTIF(success = true) / COUNT(*) as success_rate
FROM events
WHERE event_name = 'mobile_gesture'
  AND gesture_type = 'pull_to_refresh';
```

### Haptic Usage
```sql
-- Haptic pattern distribution
SELECT 
  pattern,
  COUNT(*) as count
FROM events
WHERE event_name = 'haptic_feedback'
GROUP BY pattern
ORDER BY count DESC;
```

---

## Viewing in GA4

1. **Go to Events**
   - Reports → Engagement → Events

2. **Find Events**
   - `mobile_gesture`
   - `haptic_feedback`
   - `skeleton_loader`
   - `gesture_success`
   - `mobile_performance`

3. **View Parameters**
   - Click event name
   - See all parameters
   - Export data

---

## Testing

### Check if Working
```javascript
// Browser console
console.log('GA loaded:', !!window.gtag);
console.log('DataLayer:', window.dataLayer);

// Trigger gesture and check
window.dataLayer.filter(e => e[0] === 'event');
```

### Mock in Tests
```typescript
jest.mock('@/lib/analytics', () => ({
  trackMobileGesture: jest.fn(),
  trackPullToRefresh: jest.fn(),
  // ... other functions
}));
```

---

## Best Practices

### Do ✅
- Track all gesture interactions
- Include velocity for swipes
- Track success/failure
- Include page context
- Track haptic feedback
- Measure performance

### Don't ❌
- Track PII
- Track too frequently
- Block user interactions
- Track in CI/test
- Forget error handling

---

## Common Patterns

### Track with Haptic
```typescript
const handleAction = () => {
  Haptics.medium();
  trackHapticFeedback('medium', 'action_name');
  trackMobileGesture('gesture_type', page, metadata);
  // ... perform action
};
```

### Track with Duration
```typescript
const handleAsync = async () => {
  const start = Date.now();
  try {
    await action();
    const duration = Date.now() - start;
    trackMobileGesture('action', page, { duration, success: true });
  } catch (error) {
    const duration = Date.now() - start;
    trackMobileGesture('action', page, { duration, success: false });
  }
};
```

### Track with Velocity
```typescript
const handleDragEnd = (info: PanInfo) => {
  const velocity = Math.abs(info.velocity.x);
  trackSwipeNavigation(page, direction, fromId, toId, velocity);
};
```

---

## Metrics to Monitor

### Adoption
- Gesture usage rate
- Unique users per gesture
- Gestures per session

### Performance
- Average velocity
- Success rate
- Refresh duration

### Engagement
- Time on page
- Actions per session
- Return rate

---

**Quick Reference Complete! 📊**
