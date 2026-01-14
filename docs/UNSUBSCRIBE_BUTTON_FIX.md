# Unsubscribe Button Visibility Fix

## Issue
The unsubscribe button (X icon) on channel cards was not visible to users. While the button was clickable, users couldn't see it, leading to confusion when trying to unsubscribe from channels.

## Root Cause
Two issues were causing the visibility problem:

1. **Overflow Hidden**: The channel card container had `overflow-hidden` class, which was clipping the absolutely positioned unsubscribe button
2. **Zero Opacity**: The button had `opacity-0` by default and only showed on hover with `group-hover:opacity-100`

## Files Changed

### 1. `client/src/components/home/ModernHomePage.tsx`

**Line ~777**: Removed `overflow-hidden` from card container
```tsx
// Before
className={`group relative bg-card rounded-xl border border-border hover:border-primary/50 transition-all overflow-hidden cursor-pointer ${...}`}

// After
className={`group relative bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-pointer ${...}`}
```

**Line ~869**: Made unsubscribe button semi-visible by default
```tsx
// Before
<motion.button
  initial={{ opacity: 0, scale: 0.8 }}
  whileHover={{ scale: 1.1 }}
  className="... opacity-0 group-hover:opacity-100 ..."
>

// After
<motion.button
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 0.6 }}
  whileHover={{ scale: 1.1, opacity: 1 }}
  className="... group-hover:opacity-100 ..."
>
```

### 2. `client/src/components/mobile/MobileHomeFocused.tsx`

**Line ~887**: Made unsubscribe button semi-visible by default
```tsx
// Before
className="... opacity-0 group-hover:opacity-100 ..."

// After
className="... opacity-60 group-hover:opacity-100 ..."
```

## Solution
1. Removed `overflow-hidden` to prevent clipping of absolutely positioned elements
2. Changed default opacity from `0` to `0.6` so the button is always visible but subtle
3. Button becomes fully opaque (`opacity: 1`) on hover for better interaction feedback

## User Experience Improvements
- ✅ Unsubscribe button is now always visible (60% opacity)
- ✅ Button becomes fully visible (100% opacity) on card hover
- ✅ Users can easily find and click the unsubscribe button
- ✅ Maintains clean design with subtle visibility when not in use

## Testing
Run the test script to verify the fix:
```bash
node script/test-unsubscribe-button-visibility.js
```

## Visual Behavior
- **Default state**: Button visible at 60% opacity with subtle background
- **Hover state**: Button at 100% opacity with enhanced background
- **Click state**: Shows confirmation dialog for unsubscribe action

## Related Components
- `ChannelCard` (desktop grid/list view)
- `ChannelCard` (mobile view)
- `ChannelRow` (mobile list view) - already had visible button
