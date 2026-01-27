# 🤖 AI Agent - Quick Reference

**For Developers**: How to integrate the intelligent agent

---

## 🚀 Quick Integration

### Basic Setup

```typescript
import { AICompanion } from '../components/AICompanion';

<AICompanion
  pageContent={{
    type: 'question',
    title: 'Binary Search',
    question: currentQuestion.question,
    answer: currentQuestion.answer,
  }}
  onNavigate={(path) => setLocation(path)}
  onAction={(action, data) => handleAction(action, data)}
  availableActions={['nextQuestion', 'showAnswer', 'bookmark']}
/>
```

---

## 📋 Props

### pageContent (optional)
```typescript
{
  type?: string;           // 'question' | 'blog' | 'certification'
  title?: string;          // Page title
  question?: string;       // Question text
  answer?: string;         // Answer text
  explanation?: string;    // Explanation
  code?: string;          // Code snippet
  tags?: string[];        // Topic tags
  difficulty?: string;    // 'easy' | 'medium' | 'hard'
  content?: string;       // General content
}
```

### onNavigate (optional)
```typescript
(path: string) => void

// Example
onNavigate={(path) => setLocation(path)}
```

### onAction (optional)
```typescript
(action: string, data?: any) => void

// Example
onAction={(action, data) => {
  switch (action) {
    case 'nextQuestion':
      handleNext();
      break;
    case 'showAnswer':
      setShowAnswer(true);
      break;
  }
}}
```

### availableActions (optional)
```typescript
string[]

// Example
availableActions={[
  'nextQuestion',
  'previousQuestion',
  'showAnswer',
  'bookmark',
]}
```

---

## 🎯 Action Format

### Navigation
```json
{
  "type": "navigate",
  "path": "/learning-paths",
  "label": "Learning Paths"
}
```

### Action
```json
{
  "type": "action",
  "name": "showAnswer",
  "data": {},
  "description": "Revealing the answer"
}
```

### Suggestion
```json
{
  "type": "suggest",
  "message": "Try practice mode!"
}
```

---

## 💡 Common Actions

### Question Page
- `nextQuestion` - Next question
- `previousQuestion` - Previous question
- `showAnswer` - Show answer
- `hideAnswer` - Hide answer
- `bookmark` - Bookmark question
- `addToSRS` - Add to spaced repetition
- `share` - Share question
- `showSearch` - Open search
- `filterByDifficulty` - Filter by difficulty
- `filterBySubChannel` - Filter by topic
- `clearFilters` - Clear all filters

### Learning Paths Page
- `activatePath` - Activate learning path
- `deactivatePath` - Deactivate path
- `showPathDetails` - Show path details
- `startPath` - Start learning path

### Certifications Page
- `startCertification` - Start certification
- `viewProgress` - View progress
- `takePracticeTest` - Take practice test

---

## 🔧 Example Implementations

### Question Viewer

```typescript
<AICompanion
  pageContent={{
    type: 'question',
    title: channel.name,
    question: currentQuestion.question,
    answer: currentQuestion.answer,
    explanation: currentQuestion.explanation,
    tags: currentQuestion.tags,
    difficulty: currentQuestion.difficulty,
  }}
  onNavigate={(path) => setLocation(path)}
  onAction={(action, data) => {
    switch (action) {
      case 'nextQuestion':
        handleNext();
        break;
      case 'previousQuestion':
        handlePrevious();
        break;
      case 'showAnswer':
        setShowAnswer(true);
        break;
      case 'hideAnswer':
        setShowAnswer(false);
        break;
      case 'bookmark':
        handleBookmark();
        break;
      case 'addToSRS':
        handleAddToSRS();
        break;
      case 'share':
        handleShare();
        break;
      case 'showSearch':
        setShowSearchModal(true);
        break;
      case 'filterByDifficulty':
        if (data?.difficulty) {
          setDifficultyFilter(data.difficulty);
        }
        break;
      case 'filterBySubChannel':
        if (data?.subChannel) {
          setSelectedSubChannel(data.subChannel);
        }
        break;
      case 'clearFilters':
        setDifficultyFilter('all');
        setSelectedSubChannel('all');
        break;
    }
  }}
  availableActions={[
    'nextQuestion',
    'previousQuestion',
    'showAnswer',
    'hideAnswer',
    'bookmark',
    'addToSRS',
    'share',
    'showSearch',
    'filterByDifficulty',
    'filterBySubChannel',
    'clearFilters',
  ]}
/>
```

### Learning Paths Page

```typescript
<AICompanion
  pageContent={{
    type: 'learning-path',
    title: 'Learning Paths',
    content: 'Browse and activate learning paths',
  }}
  onNavigate={(path) => setLocation(path)}
  onAction={(action, data) => {
    switch (action) {
      case 'activatePath':
        if (data?.pathId) {
          handleActivatePath(data.pathId);
        }
        break;
      case 'deactivatePath':
        if (data?.pathId) {
          handleDeactivatePath(data.pathId);
        }
        break;
      case 'showPathDetails':
        if (data?.pathId) {
          setSelectedPath(data.pathId);
          setShowModal(true);
        }
        break;
      case 'startPath':
        if (data?.pathId) {
          handleStartPath(data.pathId);
        }
        break;
    }
  }}
  availableActions={[
    'activatePath',
    'deactivatePath',
    'showPathDetails',
    'startPath',
  ]}
/>
```

### Blog Page

```typescript
<AICompanion
  pageContent={{
    type: 'blog',
    title: post.title,
    content: post.content,
    tags: post.tags,
  }}
  onNavigate={(path) => setLocation(path)}
  onAction={(action, data) => {
    switch (action) {
      case 'relatedPosts':
        setShowRelated(true);
        break;
      case 'bookmark':
        handleBookmark();
        break;
      case 'share':
        handleShare();
        break;
    }
  }}
  availableActions={[
    'relatedPosts',
    'bookmark',
    'share',
  ]}
/>
```

---

## 🎨 Customization

### Disable Agent Mode

```typescript
// Don't provide onNavigate or onAction
<AICompanion
  pageContent={content}
  // No onNavigate
  // No onAction
  // No availableActions
/>
```

### Navigation Only

```typescript
<AICompanion
  pageContent={content}
  onNavigate={(path) => setLocation(path)}
  // No onAction
  // No availableActions
/>
```

### Actions Only

```typescript
<AICompanion
  pageContent={content}
  // No onNavigate
  onAction={(action, data) => handleAction(action, data)}
  availableActions={['action1', 'action2']}
/>
```

---

## 🐛 Troubleshooting

### Actions not working

**Check**:
1. `onAction` prop provided?
2. Action name in `availableActions`?
3. Handler implemented in `onAction`?
4. Console for errors?

### Navigation not working

**Check**:
1. `onNavigate` prop provided?
2. Path is valid?
3. Router setup correct?
4. Console for errors?

### AI not using actions

**Check**:
1. Agent mode enabled? (auto-enabled if props provided)
2. AI provider configured?
3. API key valid?
4. Prompt includes agent capabilities?

---

## 📊 Best Practices

### 1. Provide Context

```typescript
// Good - Rich context
pageContent={{
  type: 'question',
  title: 'Binary Search',
  question: 'Explain binary search',
  answer: 'Binary search is...',
  tags: ['algorithms', 'search'],
  difficulty: 'medium',
}}

// Bad - Minimal context
pageContent={{
  type: 'question',
}}
```

### 2. Handle All Actions

```typescript
// Good - All actions handled
onAction={(action, data) => {
  switch (action) {
    case 'nextQuestion':
      handleNext();
      break;
    case 'showAnswer':
      setShowAnswer(true);
      break;
    default:
      console.warn('Unhandled action:', action);
  }
}}

// Bad - Missing handlers
onAction={(action) => {
  if (action === 'nextQuestion') {
    handleNext();
  }
  // Other actions ignored
}}
```

### 3. List Available Actions

```typescript
// Good - Explicit list
availableActions={[
  'nextQuestion',
  'showAnswer',
  'bookmark',
]}

// Bad - Empty or missing
availableActions={[]}
```

### 4. Validate Data

```typescript
// Good - Validate data
onAction={(action, data) => {
  if (action === 'filterByDifficulty') {
    if (data?.difficulty && ['easy', 'medium', 'hard'].includes(data.difficulty)) {
      setDifficultyFilter(data.difficulty);
    } else {
      console.warn('Invalid difficulty:', data?.difficulty);
    }
  }
}}

// Bad - No validation
onAction={(action, data) => {
  if (action === 'filterByDifficulty') {
    setDifficultyFilter(data.difficulty); // May be undefined or invalid
  }
}}
```

---

## ✅ Checklist

### Integration

- [ ] Import AICompanion
- [ ] Add to page component
- [ ] Provide pageContent
- [ ] Implement onNavigate (if needed)
- [ ] Implement onAction (if needed)
- [ ] List availableActions
- [ ] Test navigation
- [ ] Test actions
- [ ] Handle errors

### Testing

- [ ] AI can navigate
- [ ] AI can perform actions
- [ ] Actions execute correctly
- [ ] Toast notifications appear
- [ ] No console errors
- [ ] Works with voice mode
- [ ] Works on mobile

---

**Status**: ✅ READY TO USE  
**Difficulty**: ⭐⭐ Easy  
**Time to Integrate**: 5-10 minutes

---

*Quick reference for AI Agent integration!* 🤖
