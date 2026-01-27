# Mobile Components - Quick Reference Card 📱

## Import

```tsx
import {
  BottomSheet,
  FloatingButton,
  PullToRefresh,
  SwipeableCard,
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonText
} from '@/components/mobile';
```

---

## 1. PullToRefresh

**Pattern**: Instagram, Twitter
**Use**: Refresh data

```tsx
<PullToRefresh onRefresh={async () => {
  await reloadData();
}}>
  {children}
</PullToRefresh>
```

**Props**:
- `onRefresh: () => Promise<void>` - Async refresh function
- `threshold?: number` - Pull distance (default: 80px)
- `disabled?: boolean` - Disable gesture

---

## 2. SwipeableCard

**Pattern**: WhatsApp, Gmail
**Use**: Hidden actions

```tsx
<SwipeableCard
  leftAction={{
    icon: <Check className="w-5 h-5" />,
    label: 'Done',
    color: 'bg-green-500',
    onAction: () => handleDone()
  }}
  rightAction={{
    icon: <X className="w-5 h-5" />,
    label: 'Delete',
    color: 'bg-red-500',
    onAction: () => handleDelete()
  }}
  threshold={100}
>
  {cardContent}
</SwipeableCard>
```

**Props**:
- `leftAction?: SwipeAction` - Left swipe action
- `rightAction?: SwipeAction` - Right swipe action
- `threshold?: number` - Swipe distance (default: 100px)
- `disabled?: boolean` - Disable swipe

**SwipeAction**:
```tsx
{
  icon: ReactNode;
  label: string;
  color: string; // Tailwind class
  onAction: () => void;
}
```

---

## 3. FloatingButton

**Pattern**: Material Design, Gmail
**Use**: Primary action

```tsx
<FloatingButton
  icon={<Plus className="w-6 h-6" />}
  label="Create"
  onClick={() => handleCreate()}
  position="bottom-right"
  hideOnScroll={true}
/>
```

**Props**:
- `icon: ReactNode` - Icon element
- `label?: string` - Optional text label
- `onClick: () => void` - Click handler
- `position?: 'bottom-right' | 'bottom-left' | 'bottom-center'`
- `hideOnScroll?: boolean` - Auto-hide (default: true)
- `className?: string` - Additional classes

**Sizes**:
- Without label: 56x56px (Material Design standard)
- With label: Auto width, 56px height

---

## 4. BottomSheet

**Pattern**: Instagram, Apple Maps
**Use**: Modals, forms

```tsx
<BottomSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Create Path"
  description="Build your journey"
  footer={
    <button className="w-full py-4 bg-primary rounded-[14px]">
      Create
    </button>
  }
>
  {formContent}
</BottomSheet>
```

**Props**:
- `open: boolean` - Open state
- `onOpenChange: (open: boolean) => void` - State setter
- `title?: string` - Header title
- `description?: string` - Header description
- `footer?: ReactNode` - Sticky footer
- `children: ReactNode` - Scrollable content

**Features**:
- Slides up from bottom
- Drag handle for dismissal
- Backdrop blur
- Sticky header and footer
- Scrollable content

---

## 5. Skeleton Loaders

**Pattern**: Facebook, LinkedIn
**Use**: Loading states

### Basic Skeleton
```tsx
<Skeleton className="w-full h-20 rounded-lg" />
```

### Skeleton Card
```tsx
<SkeletonCard />
```

### Skeleton List
```tsx
<SkeletonList count={3} />
```

### Skeleton Text
```tsx
<SkeletonText lines={3} />
```

**Props**:
- `className?: string` - Custom styles
- `variant?: 'text' | 'circular' | 'rectangular'`
- `animation?: 'pulse' | 'wave' | 'none'`

**Usage Pattern**:
```tsx
{loading ? (
  <SkeletonList count={3} />
) : (
  data.map(item => <Card key={item.id} {...item} />)
)}
```

---

## Common Patterns

### Page with Pull-to-Refresh
```tsx
function MyPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleRefresh = async () => {
    setLoading(true);
    const newData = await fetchData();
    setData(newData);
    setLoading(false);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {loading ? (
        <SkeletonList count={5} />
      ) : (
        data.map(item => <Card key={item.id} {...item} />)
      )}
    </PullToRefresh>
  );
}
```

### List with Swipeable Cards
```tsx
function MyList({ items, onDelete, onEdit }) {
  return (
    <div className="space-y-4">
      {items.map(item => (
        <SwipeableCard
          key={item.id}
          leftAction={{
            icon: <Edit className="w-5 h-5" />,
            label: 'Edit',
            color: 'bg-blue-500',
            onAction: () => onEdit(item.id)
          }}
          rightAction={{
            icon: <Trash className="w-5 h-5" />,
            label: 'Delete',
            color: 'bg-red-500',
            onAction: () => onDelete(item.id)
          }}
        >
          <div className="p-4 bg-white rounded-lg">
            {item.content}
          </div>
        </SwipeableCard>
      ))}
    </div>
  );
}
```

### Page with FAB
```tsx
function MyPage() {
  return (
    <>
      {/* Page content */}
      <div className="pb-24">
        {/* Content */}
      </div>

      {/* FAB */}
      <FloatingButton
        icon={<Plus className="w-6 h-6" />}
        onClick={() => handleCreate()}
        position="bottom-right"
      />
    </>
  );
}
```

### Modal with BottomSheet
```tsx
function MyModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Open Modal
      </button>

      <BottomSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Settings"
        footer={
          <button 
            onClick={() => setIsOpen(false)}
            className="w-full py-4 bg-primary rounded-[14px]"
          >
            Save
          </button>
        }
      >
        {/* Form fields */}
      </BottomSheet>
    </>
  );
}
```

---

## Swipe Navigation (Custom)

For swipe navigation (like Question Viewer):

```tsx
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

function SwipeableContent() {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    
    if (info.offset.x < -threshold || velocity < -500) {
      // Swipe left
      handleNext();
    } else if (info.offset.x > threshold || velocity > 500) {
      // Swipe right
      handlePrevious();
    }
    
    x.set(0); // Reset
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      style={{ x, opacity }}
      onDragEnd={handleDragEnd}
    >
      {content}
    </motion.div>
  );
}
```

---

## Touch Targets

**Minimum sizes** (iOS Human Interface Guidelines):
- Minimum: 44x44px
- Comfortable: 48x48px
- FAB: 56x56px

**Spacing**:
- Minimum between elements: 8px
- Comfortable: 12px

**Example**:
```tsx
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon className="w-5 h-5" />
</button>
```

---

## Animations

All components use **Framer Motion** for 60fps animations:

```tsx
// Spring animation (natural feel)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
>
  {content}
</motion.div>

// Tween animation (precise timing)
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  {content}
</motion.div>
```

---

## Dark Mode

All components support dark mode automatically via Tailwind:

```tsx
// Use semantic colors
className="bg-background text-foreground"
className="bg-muted text-muted-foreground"
className="bg-primary text-primary-foreground"

// Or explicit dark mode
className="bg-white dark:bg-black text-black dark:text-white"
```

---

## Accessibility

All components include:
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus indicators
- ✅ Touch targets 44px+

**Example**:
```tsx
<button
  aria-label="Create new path"
  className="min-h-[44px] focus:ring-2 focus:ring-primary"
>
  <Plus className="w-5 h-5" />
</button>
```

---

## Performance Tips

1. **Lazy load components**:
```tsx
const BottomSheet = lazy(() => import('@/components/mobile/BottomSheet'));
```

2. **Memoize expensive renders**:
```tsx
const MemoizedCard = memo(SwipeableCard);
```

3. **Use CSS transforms** (not top/left):
```tsx
// Good
style={{ transform: `translateX(${x}px)` }}

// Bad
style={{ left: `${x}px` }}
```

4. **Debounce scroll handlers**:
```tsx
const handleScroll = debounce(() => {
  // Handle scroll
}, 100);
```

---

## Testing

```tsx
// Test swipe gesture
test('swipe card left triggers action', async () => {
  const onAction = jest.fn();
  render(
    <SwipeableCard
      leftAction={{ icon: <X />, label: 'Delete', color: 'bg-red-500', onAction }}
    >
      Content
    </SwipeableCard>
  );
  
  const card = screen.getByText('Content');
  fireEvent.dragEnd(card, { offset: { x: -150 } });
  
  expect(onAction).toHaveBeenCalled();
});
```

---

## Troubleshooting

### Gesture not working
- Check if `drag` prop is set
- Check if `dragConstraints` is set
- Check if element is scrollable (conflicts with drag)

### Animation janky
- Use CSS transforms, not top/left
- Check for expensive re-renders
- Use `will-change: transform` CSS

### Touch target too small
- Minimum 44x44px
- Add padding if needed
- Test on real device

### FAB not hiding on scroll
- Check `hideOnScroll` prop
- Check if scroll event is firing
- Check if element is scrollable

---

## Quick Checklist

When adding mobile features:
- [ ] Touch targets 44px+
- [ ] Smooth 60fps animations
- [ ] Dark mode support
- [ ] Accessibility (ARIA, keyboard)
- [ ] Loading states (skeleton)
- [ ] Error states
- [ ] Test on real device

---

**Need help?** Check the full documentation in:
- `READY_TO_USE_MOBILE_COMPONENTS.md`
- `MOBILE_FIRST_COMPLETE.md`
- Component source files in `client/src/components/mobile/`
