# Mobile-First Implementation - Getting Started 🚀

## Current Status

✅ **Already Installed**:
- Radix UI components (Dialog, Dropdown, Tabs, Scroll Area, Toast, Popover, Select)
- Framer Motion (animations)
- Tailwind CSS
- Lucide React (icons)
- Vaul (drawer/bottom sheet)

## Additional Libraries Needed

```bash
# Install mobile-specific libraries
pnpm add @use-gesture/react
pnpm add @tanstack/react-virtual
pnpm add react-spring-bottom-sheet
pnpm add react-swipeable-list
pnpm add react-simple-pull-to-refresh
```

## Quick Start - Immediate Improvements

Since we already have most libraries, let's start with **immediate wins** using existing tools:

### 1. Use Vaul for Bottom Sheets (Already Installed!)

Vaul is a battle-tested drawer component used by Vercel, Shadcn, and many production apps.

**Example**:
```tsx
import { Drawer } from 'vaul';

<Drawer.Root>
  <Drawer.Trigger>Open</Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40" />
    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] h-[85vh]">
      <Drawer.Handle />
      {/* Content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

### 2. Use Framer Motion for Gestures (Already Installed!)

```tsx
import { motion } from 'framer-motion';

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(e, { offset, velocity }) => {
    if (offset.x > 100) {
      // Swiped right
    }
  }}
>
  Swipeable Card
</motion.div>
```

### 3. Use Radix Scroll Area (Already Installed!)

```tsx
import * as ScrollArea from '@radix-ui/react-scroll-area';

<ScrollArea.Root className="h-full">
  <ScrollArea.Viewport>
    {/* Content */}
  </ScrollArea.Viewport>
  <ScrollArea.Scrollbar orientation="vertical">
    <ScrollArea.Thumb />
  </ScrollArea.Scrollbar>
</ScrollArea.Root>
```

## Immediate Action Plan

### Step 1: Fix Learning Paths Modal (Use Vaul)

Replace current modal with Vaul drawer:

**File**: `client/src/pages/UnifiedLearningPathsGenZ.tsx`

```tsx
import { Drawer } from 'vaul';

// Replace AnimatePresence modal with:
<Drawer.Root open={showPathModal} onOpenChange={setShowPathModal}>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[24px] h-[85vh] z-50 flex flex-col">
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <Drawer.Handle className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>
      
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0">
        <h2 className="text-lg font-black">{modalMode === 'create' ? 'Create Path' : selectedPath?.name}</h2>
      </div>
      
      {/* Scrollable content */}
      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full p-4">
          {/* Content here */}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      
      {/* Sticky footer */}
      <div className="p-3 border-t flex-shrink-0">
        <button className="w-full py-4 bg-gradient-to-r from-primary to-cyan-500 rounded-[14px] font-bold">
          Activate This Path
        </button>
      </div>
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

### Step 2: Add Pull-to-Refresh to Home Page

**File**: `client/src/components/home/GenZHomePage.tsx`

```tsx
import { useState } from 'react';

function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (startY === 0) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    if (distance > 0) {
      setPullDistance(distance);
      setPulling(true);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80) {
      onRefresh();
    }
    setPulling(false);
    setStartY(0);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pulling && (
        <div className="flex justify-center py-4">
          <div className="animate-spin">⟳</div>
        </div>
      )}
      {children}
    </div>
  );
}
```

### Step 3: Add Swipe Gestures to Question Cards

**File**: `client/src/pages/QuestionViewerGenZ.tsx`

```tsx
import { motion } from 'framer-motion';

<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={0.2}
  onDragEnd={(e, { offset, velocity }) => {
    if (offset.x > 100) {
      // Swipe right - Previous question
      handlePrevious();
    } else if (offset.x < -100) {
      // Swipe left - Next question
      handleNext();
    }
  }}
  className="question-card"
>
  {/* Question content */}
</motion.div>
```

### Step 4: Fix Stats Page (Add Proper Background)

**File**: `client/src/pages/StatsGenZ.tsx`

```tsx
// Add explicit background colors
<AppLayout>
  <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
    {/* Content */}
  </div>
</AppLayout>
```

## Component Library Structure

Create these reusable components:

```
client/src/components/mobile/
├── BottomSheet.tsx          # Wrapper around Vaul
├── PullToRefresh.tsx        # Pull-to-refresh component
├── SwipeableCard.tsx        # Swipeable card with actions
├── VirtualList.tsx          # Virtual scrolling wrapper
├── FloatingButton.tsx       # FAB component
├── StickyHeader.tsx         # Auto-hide header
├── SkeletonLoader.tsx       # Loading states
└── GestureCard.tsx          # Card with swipe gestures
```

## Implementation Priority

### 🔥 Critical (Do First)
1. ✅ Fix learning paths modal with Vaul
2. ✅ Fix stats page background
3. ✅ Add swipe gestures to questions
4. ✅ Create mobile component library

### 🎯 High Priority (Do Next)
5. Add pull-to-refresh to home
6. Add virtual scrolling to long lists
7. Optimize touch targets (44px minimum)
8. Add haptic feedback

### 💡 Nice to Have (Do Later)
9. Add skeleton loaders
10. Add floating action buttons
11. Add swipe actions to cards
12. Add infinite scroll

## Testing Checklist

After each change:
- [ ] Test on iPhone SE (375px)
- [ ] Test on iPhone 12 (390px)
- [ ] Test on iPad (768px)
- [ ] Check touch targets (44px min)
- [ ] Verify smooth 60fps animations
- [ ] Test with slow 3G network

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Mobile Score: > 90
- Bundle Size: < 200KB initial

---

**Ready to start? Let's begin with Step 1: Fix the learning paths modal with Vaul!**
