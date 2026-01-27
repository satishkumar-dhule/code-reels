# Mobile Testing Checklist ✅

Quick reference for testing mobile features on real devices.

---

## Setup (5 min)

```bash
# Get your IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Start server
npm run dev

# Open on phone: http://YOUR_IP:5001/
```

---

## Home Page

### Pull-to-Refresh
- [ ] Pull down from top
- [ ] Impact haptic at threshold
- [ ] Skeleton loaders show
- [ ] Success haptic on complete
- [ ] Data refreshes

### Swipeable Cards
- [ ] Swipe card left
- [ ] Medium haptic
- [ ] Red "Remove" action
- [ ] Card removes

### Skeleton Loaders
- [ ] Show on first load
- [ ] Pulse animation
- [ ] Smooth fade-in

---

## Learning Paths

### FAB
- [ ] Visible bottom-right
- [ ] 56x56px size
- [ ] Light haptic on tap
- [ ] Hides on scroll down
- [ ] Shows on scroll up

### Bottom Sheet
- [ ] Slides up from bottom
- [ ] Drag handle works
- [ ] Content scrollable
- [ ] Footer sticky

---

## Question Viewer

### Swipe Navigation
- [ ] Swipe left → next
- [ ] Swipe right → previous
- [ ] Medium haptic
- [ ] Chevron indicators
- [ ] Fast swipe works

### FAB
- [ ] Tap for next question
- [ ] Light haptic
- [ ] Hides on scroll

---

## Stats Page

### Pull-to-Refresh
- [ ] Pull down works
- [ ] Impact haptic
- [ ] Skeleton loaders
- [ ] Success haptic
- [ ] Stats update

---

## Performance

- [ ] 60fps animations
- [ ] No jank
- [ ] Touch targets 44px+
- [ ] Fast load time
- [ ] Smooth gestures

---

## Haptics

- [ ] Light (10ms) - FAB taps
- [ ] Medium (20ms) - Swipes
- [ ] Impact (30ms) - Pull threshold
- [ ] Success (double) - Refresh done
- [ ] Error (triple) - Refresh fail

---

## Browsers

- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Samsung Internet
- [ ] Firefox Mobile

---

## Devices

- [ ] iPhone SE (375px)
- [ ] iPhone 12/13 (390px)
- [ ] Android (360-412px)
- [ ] iPad (768px)

---

## Edge Cases

- [ ] Slow 3G network
- [ ] Offline mode
- [ ] Landscape orientation
- [ ] Large text
- [ ] Reduced motion
- [ ] Dark mode

---

## Accessibility

- [ ] Screen reader works
- [ ] Keyboard navigation
- [ ] Color contrast
- [ ] ARIA labels
- [ ] Focus indicators

---

## Bug Template

```
Device: [iPhone 12, iOS 17.2]
Browser: [Safari Mobile]
Page: [Home Page]
Feature: [Pull-to-Refresh]

Steps:
1. 
2. 
3. 

Expected: 
Actual: 

Priority: [High/Medium/Low]
```

---

## Quick Smoke Test (10 min)

1. Home: Pull refresh, swipe card (2 min)
2. Paths: Tap FAB, scroll (2 min)
3. Questions: Swipe left/right (3 min)
4. Stats: Pull refresh (2 min)
5. Check: Dark mode, haptics (1 min)

---

**Status**: Ready to Test
**Time**: 2-3 hours full test, 10 min smoke test
**Priority**: 🔥 CRITICAL

**Test on real devices to ensure everything works! 📱**
