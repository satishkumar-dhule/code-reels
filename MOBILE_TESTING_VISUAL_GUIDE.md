# Mobile Testing Visual Guide 📱

Visual reference for what to expect when testing mobile features.

---

## Pull-to-Refresh

### What You'll See
```
┌─────────────────────┐
│   ↓ Pull Down       │ ← Pull indicator appears
│   ⟳ Refreshing...   │ ← Rotating icon
│                     │
│  ┌───────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ← Skeleton loaders
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │
│  └───────────────┘  │
└─────────────────────┘
```

### What You'll Feel
1. **Pull down** → Smooth resistance
2. **Reach 80px** → 💥 Impact haptic (30ms)
3. **Release** → Refresh starts
4. **Complete** → ✅ Success haptic (double tap)

### Where to Test
- Home Page
- Stats Page

---

## Swipeable Cards

### What You'll See

**Swipe Left (Remove)**:
```
┌─────────────────────┐
│ Path Card      ←──  │ ← Swipe left
│ ┌─────────────┐     │
│ │ System      │ 🗑️  │ ← Red delete action
│ │ Design      │     │
│ └─────────────┘     │
└─────────────────────┘
```

**Swipe Right (Continue)**:
```
┌─────────────────────┐
│  ──→  Path Card     │ ← Swipe right
│     ✓ ┌─────────────┐│
│       │ System      ││ ← Green continue action
│       │ Design      ││
│       └─────────────┘│
└─────────────────────┘
```

### What You'll Feel
1. **Start swipe** → Smooth drag
2. **Pass 100px** → 💥 Medium haptic (20ms)
3. **Action triggers** → Card animates out

### Where to Test
- Home Page (Continue Learning section)

---

## Floating Action Button (FAB)

### What You'll See

**Visible State**:
```
┌─────────────────────┐
│                     │
│   Page Content      │
│                     │
│                     │
│                 ┌─┐ │ ← FAB bottom-right
│                 │+│ │   56x56px
│                 └─┘ │
└─────────────────────┘
```

**Hidden State (Scroll Down)**:
```
┌─────────────────────┐
│                     │
│   Page Content      │
│   ↓ Scrolling       │
│                     │
│                     │ ← FAB hidden
│                     │
└─────────────────────┘
```

**Shown State (Scroll Up)**:
```
┌─────────────────────┐
│   ↑ Scrolling       │
│   Page Content      │
│                     │
│                     │
│                 ┌─┐ │ ← FAB reappears
│                 │+│ │
│                 └─┘ │
└─────────────────────┘
```

### What You'll Feel
1. **Tap FAB** → 💥 Light haptic (10ms)
2. **Action triggers** → Modal opens or navigation

### Where to Test
- Learning Paths Page
- Question Viewer Page

---

## Swipe Navigation

### What You'll See

**Swipe Left (Next)**:
```
┌─────────────────────┐
│                     │
│  Question Text ←──  │ ← Swipe left
│                     │
│                   ❯ │ ← Right chevron
│                     │
└─────────────────────┘
```

**Swipe Right (Previous)**:
```
┌─────────────────────┐
│                     │
│  ──→ Question Text  │ ← Swipe right
│                     │
│ ❮                   │ ← Left chevron
│                     │
└─────────────────────┘
```

### What You'll Feel
1. **Start swipe** → Smooth drag
2. **Pass 100px OR fast swipe** → 💥 Medium haptic (20ms)
3. **Question changes** → Smooth transition

### Where to Test
- Question Viewer Page

---

## Bottom Sheet

### What You'll See

**Closed State**:
```
┌─────────────────────┐
│                     │
│   Page Content      │
│                     │
│                     │
│   [Create Path]     │ ← Button to open
└─────────────────────┘
```

**Opening Animation**:
```
┌─────────────────────┐
│   Page Content      │
│   (blurred)         │
├─────────────────────┤
│   ═══ Drag Handle   │ ← Sheet slides up
│   Create Path       │
│   ┌───────────────┐ │
│   │ Form fields   │ │
└───┴───────────────┴─┘
```

**Open State**:
```
┌─────────────────────┐
│   ═══ Drag Handle   │ ← Drag to dismiss
│   Create Path       │
│   ┌───────────────┐ │
│   │ Name: ______  │ │ ← Scrollable
│   │ Type: ______  │ │   content
│   │ ...           │ │
│   └───────────────┘ │
│   [Create Button]   │ ← Sticky footer
└─────────────────────┘
```

### What You'll Feel
1. **Tap button** → Sheet slides up
2. **Drag handle down** → Sheet dismisses
3. **Tap backdrop** → Sheet dismisses

### Where to Test
- Learning Paths Page (Create Path)
- Any modal dialogs

---

## Skeleton Loaders

### What You'll See

**Loading State**:
```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ← Pulsing gray
│  │ ▓▓▓▓▓▓▓       │  │   rectangles
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │  │
│  │ ▓▓▓▓▓▓▓       │  │
│  └───────────────┘  │
└─────────────────────┘
```

**Loaded State**:
```
┌─────────────────────┐
│  ┌───────────────┐  │
│  │ System Design │  │ ← Real content
│  │ Learn core... │  │   fades in
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ Algorithms    │  │
│  │ Master DSA... │  │
│  └───────────────┘  │
└─────────────────────┘
```

### What You'll See
1. **Page loads** → Skeleton loaders appear
2. **Data arrives** → Smooth fade to real content
3. **No layout shift** → Content fits perfectly

### Where to Test
- Home Page (first load)
- Stats Page (first load)

---

## Touch Targets

### Minimum Sizes

**Too Small** ❌:
```
┌──┐
│ ✓│  30x30px - Hard to tap
└──┘
```

**Acceptable** ✅:
```
┌────┐
│ ✓  │  44x44px - iOS minimum
└────┘
```

**Comfortable** ✅:
```
┌──────┐
│  ✓   │  48x48px - Material Design
└──────┘
```

**FAB Standard** ✅:
```
┌────────┐
│   +    │  56x56px - Material Design FAB
└────────┘
```

### What to Check
- All buttons at least 44x44px
- FAB is 56x56px
- Comfortable spacing between elements
- Easy to tap with thumb

---

## Haptic Patterns

### Light (10ms)
```
💥 (quick tap)
```
**Use**: Button taps, FAB
**Feel**: Subtle, quick

### Medium (20ms)
```
💥💥 (noticeable tap)
```
**Use**: Swipe actions, navigation
**Feel**: Clear, responsive

### Impact (30ms)
```
💥💥💥 (strong tap)
```
**Use**: Pull-to-refresh threshold
**Feel**: Significant, important

### Success (10-50-10ms)
```
💥 ... 💥 (double tap)
```
**Use**: Refresh complete
**Feel**: Positive, confirming

### Error (10-100-10-100-10ms)
```
💥 ... 💥 ... 💥 (triple tap)
```
**Use**: Refresh failed
**Feel**: Negative, alerting

---

## Animation Smoothness

### 60fps (Good) ✅
```
Frame 1: ━━━━━━━━━━━━━━━━━━━━
Frame 2: ━━━━━━━━━━━━━━━━━━━━
Frame 3: ━━━━━━━━━━━━━━━━━━━━
```
**Feel**: Smooth, fluid, responsive

### 30fps (Janky) ❌
```
Frame 1: ━━━━━━━━━━━━━━━━━━━━
Frame 2: ━━━━━━━━━━━━━━━━━━━━
         (dropped frame)
Frame 3: ━━━━━━━━━━━━━━━━━━━━
```
**Feel**: Stuttery, laggy, unresponsive

### How to Check
- Animations should be smooth
- No stuttering or lag
- Gestures feel responsive
- Transitions are fluid

---

## Dark Mode

### Light Mode
```
┌─────────────────────┐
│ ⚪ Light Mode       │ ← White background
│                     │   Black text
│  ┌───────────────┐  │
│  │ Card Content  │  │ ← Light cards
│  └───────────────┘  │
└─────────────────────┘
```

### Dark Mode
```
┌─────────────────────┐
│ ⚫ Dark Mode        │ ← Black background
│                     │   White text
│  ┌───────────────┐  │
│  │ Card Content  │  │ ← Dark cards
│  └───────────────┘  │
└─────────────────────┘
```

### What to Check
- Toggle works smoothly
- All text readable
- All colors appropriate
- No white flashes
- Consistent throughout

---

## Common Issues Visual Guide

### Issue: Horizontal Scroll ❌
```
┌─────────────────────┐
│ Content that goes ──→│ ← Content overflows
│ way too far right   │   (bad!)
└─────────────────────┘
```

### Fixed: No Overflow ✅
```
┌─────────────────────┐
│ Content fits        │ ← Content contained
│ perfectly           │   (good!)
└─────────────────────┘
```

### Issue: Layout Shift ❌
```
Before:
┌─────────────────────┐
│ Content here        │
│                     │
└─────────────────────┘

After (jumps):
┌─────────────────────┐
│ Content here        │
│ New content         │ ← Pushes down
│                     │   (bad!)
└─────────────────────┘
```

### Fixed: No Shift ✅
```
Before:
┌─────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓       │ ← Skeleton
│                     │
└─────────────────────┘

After (smooth):
┌─────────────────────┐
│ Real Content        │ ← Fades in
│                     │   (good!)
└─────────────────────┘
```

---

## Testing Flow Visual

### 1. Setup
```
Computer ──WiFi──→ Phone
   ↓
npm run dev
   ↓
http://192.168.1.100:5001/
```

### 2. Test Each Feature
```
Home Page
   ↓
Pull to Refresh ✓
   ↓
Swipe Cards ✓
   ↓
Skeleton Loaders ✓
   ↓
Learning Paths
   ↓
FAB ✓
   ↓
Bottom Sheet ✓
   ↓
Question Viewer
   ↓
Swipe Navigation ✓
   ↓
Stats Page
   ↓
Pull to Refresh ✓
```

### 3. Document Issues
```
Found Issue
   ↓
Take Screenshot
   ↓
Document Steps
   ↓
Report Bug
   ↓
Fix & Retest
```

---

## Quick Visual Checklist

### Home Page
- [ ] 🔄 Pull-to-refresh works
- [ ] 👆 Swipe cards work
- [ ] ⏳ Skeleton loaders show
- [ ] 📱 No horizontal scroll
- [ ] 🌓 Dark mode works

### Learning Paths
- [ ] ➕ FAB visible (56x56px)
- [ ] 👆 FAB tappable
- [ ] 📜 FAB hides on scroll down
- [ ] 📜 FAB shows on scroll up
- [ ] 📋 Bottom sheet works

### Question Viewer
- [ ] 👈 Swipe left (next)
- [ ] 👉 Swipe right (previous)
- [ ] ❯❮ Chevron indicators
- [ ] ➕ FAB for next
- [ ] 📱 No horizontal scroll

### Stats Page
- [ ] 🔄 Pull-to-refresh works
- [ ] ⏳ Skeleton loaders show
- [ ] 📊 Stats display correctly
- [ ] 📱 No horizontal scroll
- [ ] 🌓 Dark mode works

### Haptics
- [ ] 💥 Light (FAB taps)
- [ ] 💥💥 Medium (swipes)
- [ ] 💥💥💥 Impact (pull threshold)
- [ ] 💥...💥 Success (refresh done)
- [ ] 💥...💥...💥 Error (refresh fail)

### Performance
- [ ] 🎬 60fps animations
- [ ] ⚡ Fast load time
- [ ] 🎯 Touch targets 44px+
- [ ] 📱 Responsive layout
- [ ] 🔋 No battery drain

---

## Expected vs Actual

### Pull-to-Refresh

**Expected**:
1. Pull down → Indicator appears
2. Reach 80px → Impact haptic
3. Release → Refresh starts
4. Loading → Skeleton loaders
5. Complete → Success haptic
6. Data → Updates smoothly

**If Not Working**:
- Check if page is scrollable
- Check console for errors
- Try different browser
- Check network connection

### Swipe Actions

**Expected**:
1. Swipe card → Smooth drag
2. Pass 100px → Medium haptic
3. Action reveals → Color shows
4. Release → Action triggers
5. Card → Animates out

**If Not Working**:
- Check if card is draggable
- Check swipe threshold
- Try slower swipe
- Check console for errors

### FAB

**Expected**:
1. Page loads → FAB visible
2. Tap FAB → Light haptic
3. Action → Triggers immediately
4. Scroll down → FAB hides
5. Scroll up → FAB shows

**If Not Working**:
- Check if FAB is visible
- Check z-index
- Check scroll detection
- Try different scroll speed

---

**Use this guide while testing to know what to expect! 📱**
