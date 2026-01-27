# Complete Navigation & User Journey Flows

## Overview
This document outlines the complete user journey through CodeReels, from first visit to mastery.

---

## User Journey Stages

### 1. **First-Time Visitor** (No Active Paths)
```
Landing Page (/)
├─ Hero Section
│  ├─ Value Proposition
│  ├─ Feature Badges
│  ├─ Primary CTA: "Start Practicing Now"
│  └─ Social Proof (testimonials, stats)
│
├─ Quick Actions Grid
│  ├─ Voice Interview
│  ├─ Coding Challenges
│  ├─ Training Mode
│  └─ Timed Tests
│
└─ Choose Your Path Section
   ├─ Frontend Developer
   ├─ Backend Engineer
   ├─ Full Stack Developer
   ├─ DevOps Engineer
   ├─ Mobile Developer
   └─ Data Engineer
```

**User Actions:**
1. Click "Start Practicing Now" → `/learning-paths`
2. Click any Quick Action → Direct to practice mode
3. Click any Path → `/learning-paths` (to activate)

---

### 2. **Returning User** (Has Active Paths)
```
Home Page (/)
├─ Stats Bar (Sticky Top)
│  ├─ Streak (with tooltip: "Consistency = Success")
│  ├─ XP (with tooltip: "Unlock AI feedback")
│  └─ Level (with tooltip: "Higher levels = Harder challenges")
│
├─ Active Paths Section
│  ├─ Path Card 1 (Grid: 1 col mobile, 2 col desktop)
│  │  ├─ Icon + Name + Description
│  │  ├─ Progress Stats (2x2 grid mobile, 4 col desktop)
│  │  ├─ Channels in Path
│  │  └─ "Continue Learning" CTA
│  │
│  └─ Path Card 2
│     └─ (Same structure)
│
├─ Ready to Level Up Section ⭐ NEW
│  ├─ Main CTA: "Start Voice Interview"
│  ├─ Secondary CTA: "Solve Problems"
│  └─ Resume Path Card (if incomplete path exists)
│     ├─ "Pick up where you left off"
│     ├─ Last question/topic
│     ├─ Progress indicator
│     └─ "Resume" button
│
├─ Practice Your Way (Quick Actions)
│  └─ 4 practice modes with descriptions
│
└─ Progress Overview
   ├─ Total Completed
   ├─ Learning Paths Available
   └─ Current Rank
```

**User Actions:**
1. Click "Continue Learning" on path → First channel in path
2. Click "Resume" on resume card → Last incomplete question
3. Click any Quick Action → Practice mode
4. Click "Add Path" → `/learning-paths`

---

## Navigation Flows

### Flow 1: Activate First Path
```
Home (/) 
  → Click "Start Practicing Now"
  → Learning Paths (/learning-paths)
  → Browse paths
  → Click path card
  → Path modal opens
  → Click "Activate Path"
  → Path activated
  → Click "Start Learning"
  → First channel (/channel/[id])
  → Start practicing
```

### Flow 2: Continue Active Path
```
Home (/)
  → See "Active Paths" section
  → Click "Continue Learning"
  → Navigate to first channel
  → Practice questions
  → Complete questions
  → Return home
  → Progress updated
```

### Flow 3: Resume Incomplete Session
```
Home (/)
  → See "Resume Path" card in "Ready to Level Up"
  → Shows: "Pick up where you left off"
  → Shows: Last question/topic
  → Click "Resume"
  → Navigate to exact question
  → Continue from where left off
```

### Flow 4: Practice Mode
```
Home (/)
  → Click "Voice Interview" (or any practice mode)
  → Practice page
  → Complete session
  → Return home
  → XP updated
```

### Flow 5: Mobile Navigation
```
Home (/)
  → Tap "Learn" in bottom nav
  → Full-screen menu slides up
  → See: Channels, Certifications, My Path
  → Tap "Channels"
  → Channels page
  → Browse topics
  → Select channel
  → Practice
```

---

## Resume Path Feature (NEW)

### What is Resume Path?
A smart feature that detects incomplete learning sessions and offers a quick way to continue.

### When Does It Appear?
- User has active path
- User has started but not completed a question/topic
- Shows in "Ready to Level Up" section as a sub-card

### Resume Card Design
```
┌─────────────────────────────────────┐
│ 🔄 Pick up where you left off       │
│                                     │
│ Last topic: System Design Basics    │
│ Question: Design a URL shortener    │
│                                     │
│ ████████░░░░░░░░ 60% complete       │
│                                     │
│ [Resume Learning →]                 │
└─────────────────────────────────────┘
```

### Implementation
```tsx
// Detect incomplete session
const resumePath = React.useMemo(() => {
  const lastSession = localStorage.getItem('lastSession');
  if (!lastSession) return null;
  
  const session = JSON.parse(lastSession);
  const now = Date.now();
  const hoursSinceLastSession = (now - session.timestamp) / (1000 * 60 * 60);
  
  // Only show if session is less than 24 hours old
  if (hoursSinceLastSession > 24) return null;
  
  return {
    channelId: session.channelId,
    channelName: session.channelName,
    questionId: session.questionId,
    questionTitle: session.questionTitle,
    progress: session.progress,
  };
}, []);

// Save session on question view
useEffect(() => {
  if (currentQuestion) {
    localStorage.setItem('lastSession', JSON.stringify({
      channelId: channel.id,
      channelName: channel.name,
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      progress: completedCount / totalCount,
      timestamp: Date.now(),
    }));
  }
}, [currentQuestion]);
```

---

## Mobile Navigation Structure

### Bottom Navigation (Always Visible)
```
┌─────────────────────────────────────┐
│                                     │
│  [Home]  [Learn]  [Practice]  [Progress]
│   🏠      📚        🎙️         📊   │
│                                     │
└─────────────────────────────────────┘
```

### Learn Menu (Full-Screen)
```
┌─────────────────────────────────────┐
│  ━━━━━━  (drag handle)              │
│                                     │
│  Learn                              │
│  Browse topics and certifications   │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📚 Channels                 │→  │
│  │    Browse by topic          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏆 Certifications           │→  │
│  │    Exam prep                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🧠 My Path            NEW   │→  │
│  │    Your learning journey    │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### Practice Menu (Full-Screen)
```
┌─────────────────────────────────────┐
│  ━━━━━━  (drag handle)              │
│                                     │
│  Practice                           │
│  Choose your practice mode          │
│  ─────────────────────────────────  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎙️ Voice Interview    +10  │→  │
│  │    AI mock interviews       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎯 Quick Tests              │→  │
│  │    Timed challenges         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 💻 Coding                   │→  │
│  │    Code challenges          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔥 SRS Review               │→  │
│  │    Spaced repetition        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## Fixed Issues

### 1. ✅ Theme Toggle Overlap
**Before:** Theme toggle at `bottom-6 left-6` overlapped with mobile nav
**After:** Theme toggle stays at `bottom-6 left-6` (no overlap on left side)

### 2. ✅ AI Companion Button Accessibility
**Before:** AI Companion at `bottom-24 right-6` (96px) was too close to nav bar (80px)
**After:** AI Companion at `bottom-28 right-6` (112px) on mobile, `bottom-6` on desktop

### 3. ✅ Mobile Nav Height
**Before:** Nav bar `h-16` (64px) was too short
**After:** Nav bar `h-20` (80px) for better thumb reach

### 4. ✅ Activate Button Accessibility
**Before:** Hard to reach activate button in modals on mobile
**After:** Full-screen bottom sheet with large touch targets

---

## Z-Index Hierarchy

```
100: Modals (path activation, etc.)
 50: Mobile bottom sheet menus
 40: AI Companion, Theme Toggle
 30: Mobile bottom navigation
 20: Sticky headers
 10: Content overlays
  0: Base content
```

---

## Responsive Breakpoints

```css
/* Mobile First */
default: 0-639px (mobile)
sm: 640px+ (large mobile)
md: 768px+ (tablet)
lg: 1024px+ (desktop)
xl: 1280px+ (large desktop)
```

### Component Behavior
- **Active Path Cards**: 1 column mobile, 2 columns desktop
- **Quick Actions**: 2 columns mobile, 4 columns desktop
- **Stats Grid**: 2 columns mobile, 4 columns desktop
- **Navigation**: Bottom nav mobile, sidebar desktop

---

## Key User Flows Summary

1. **New User → Activate Path → Practice**
2. **Returning User → Continue Path → Complete Questions**
3. **Resume Session → Pick Up Where Left Off**
4. **Practice Mode → Complete Session → Earn XP**
5. **Mobile Navigation → Full-Screen Menu → Select Action**

---

## Next Steps

1. ✅ Fix theme toggle overlap
2. ✅ Fix AI Companion button position
3. ✅ Revamp mobile navigation
4. ⏳ Implement resume path feature
5. ⏳ Add navigation analytics
6. ⏳ Add onboarding tour for new users

---

## Status: In Progress

- [x] Mobile navigation revamp
- [x] Fix button overlaps
- [ ] Resume path implementation
- [ ] Complete navigation flows
- [ ] User journey analytics
