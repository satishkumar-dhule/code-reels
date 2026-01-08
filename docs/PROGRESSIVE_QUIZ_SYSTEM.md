# Progressive Quiz System with RAG-based Question Selection

## Overview

The entire application now uses a progressive difficulty system with RAG-based (Retrieval-Augmented Generation) question selection. Questions are selected based on semantic similarity and adaptive difficulty across all quiz interfaces.

## Key Improvements

### 1. Longer Wrong Answer Delay
- **Before**: 1500ms delay on wrong answers
- **After**: 3500ms delay on wrong answers
- **Benefit**: Users have more time to read and understand the explanation

### 2. Progressive Difficulty Adaptation
The system now tracks user performance and adjusts difficulty dynamically:

- **Beginner** → Start here for first 2 questions
- **Intermediate** → Move up if accuracy > 70%
- **Advanced** → Move up if consistently performing well
- **Adaptive Down** → Drop difficulty if accuracy < 40%

### 3. Semantic Question Selection (RAG-based)
Questions are selected based on:
- **Keyword similarity** to previous questions
- **Difficulty progression** based on performance
- **Topic continuity** for better learning flow

## Where It's Applied

Progressive RAG-based selection is now used in:

1. **Quick Quiz** (`MobileHomeFocused.tsx`) - Home page quick quiz
2. **Test Sessions** (`TestSession.tsx`) - Channel-specific test sessions
3. **Certification Practice** (`CertificationPractice.tsx`) - Certification practice questions
4. **Certification Exams** (`CertificationExam.tsx`) - Full certification exam simulations
5. **All Test Questions** (`tests.ts`) - Core `getSessionQuestions()` function

## Implementation Details

### Client-Side Architecture
Since this is a static website deployed on GitHub Pages, all logic runs client-side:

```typescript
// Progressive quiz session tracking
interface QuizSession {
  questions: TestQuestion[];
  currentIndex: number;
  correctCount: number;
  totalAnswered: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  performanceHistory: boolean[];
}
```

### Question Selection Algorithm

1. **Calculate Performance**: Track last 3 answers to determine recent accuracy
2. **Determine Target Difficulty**: Adjust based on performance
3. **Calculate Relevance**: Use keyword matching to find related questions
4. **Select Question**: Pick from top 5 most relevant to add variety

### Keyword Matching
Instead of vector embeddings (which require a backend), we use:
- Stop word filtering
- Keyword extraction from question text
- Overlap scoring between questions
- Length similarity for complexity matching

### Core Functions

#### `getSessionQuestions(test, count)` - tests.ts
Main function used everywhere for test question selection. Now uses progressive RAG internally.

#### `generateProgressiveSequence(questions, count)` - progressive-quiz.ts
Generic function that works with any question type (Question, TestQuestion, CertificationQuestion).

#### `selectNextQuestion(tests, session, previousQuestion)` - progressive-quiz.ts
Selects the next question based on session state and semantic similarity.

## User Experience

### Visual Indicators
- **Difficulty Badge**: Shows current difficulty level (beginner/intermediate/advanced)
- **Performance Stats**: Displays correct/total answered
- **Credit Changes**: Animated feedback for earned/lost credits

### Timing
- **Correct Answer**: 800ms delay → next question
- **Wrong Answer**: 3500ms delay → shows explanation → next question

### Progressive Flow
1. Start with beginner questions
2. Gradually increase difficulty as user succeeds
3. Select related questions for topic continuity
4. Drop difficulty if user struggles
5. Complete session with adaptive questions
6. Auto-refresh with new progressive set

## Files Modified

### New Files
- `client/src/lib/progressive-quiz.ts` - Progressive quiz logic and question selection
- `docs/PROGRESSIVE_QUIZ_SYSTEM.md` - This documentation

### Modified Files
- `client/src/lib/tests.ts` - Updated `getSessionQuestions()` to use RAG-based selection
- `client/src/lib/certification-questions.ts` - Updated `generatePracticeSession()` to use progressive selection
- `client/src/components/mobile/MobileHomeFocused.tsx` - Updated QuickQuizCard component
  - Added quiz session state tracking
  - Increased wrong answer delay to 3500ms
  - Integrated progressive question selection
  - Added difficulty level indicator
- `client/src/pages/CertificationPractice.tsx` - Uses `generateProgressiveSequence()` for question ordering
- `client/src/pages/TestSession.tsx` - Automatically uses progressive selection via `getSessionQuestions()`
- `client/src/pages/CertificationExam.tsx` - Automatically uses progressive selection via `generatePracticeSession()`

## Benefits

1. **Better Learning**: Related questions help reinforce concepts
2. **Adaptive Difficulty**: Matches user's current skill level
3. **More Time to Learn**: Longer delay on wrong answers
4. **Engaging Experience**: Progressive challenge keeps users motivated
5. **Static-Friendly**: No backend required, works on GitHub Pages
6. **Consistent Experience**: Same progressive logic everywhere questions appear

## Algorithm Details

### Similarity Scoring
```typescript
score = 0
+ 0.2 if same difficulty
+ 0.5 * (keyword overlap ratio)
+ 0.3 * (length similarity ratio)
```

### Difficulty Progression
```typescript
if (accuracy > 70%) → increase difficulty
if (accuracy < 40%) → decrease difficulty
else → maintain current level
```

### Question Selection
1. Filter by target difficulty
2. Calculate similarity with previous question
3. Sort by similarity score
4. Pick randomly from top 5 candidates (adds variety)

## Future Enhancements

Potential improvements for future iterations:

1. **Pre-computed Embeddings**: Generate question embeddings at build time and include in static JSON
2. **Topic Clustering**: Group questions by topic for better progression
3. **Spaced Repetition Integration**: Use SRS data to inform difficulty selection
4. **Performance Analytics**: Track long-term learning patterns
5. **Custom Learning Paths**: Allow users to focus on specific topics
6. **Machine Learning**: Train models on user performance data

## Testing

The system has been tested with:
- TypeScript compilation ✓
- Vite build process ✓
- Multiple channel subscriptions ✓
- Progressive difficulty transitions ✓
- All quiz interfaces ✓

## Configuration

Current settings:
```typescript
// Timing
const correctDelay = 800; // ms
const wrongDelay = 3500; // ms

// Session
const maxQuestions = 10; // per session
const recentPerformanceWindow = 3; // last N answers

// Thresholds
const highPerformanceThreshold = 0.7; // 70% accuracy
const lowPerformanceThreshold = 0.4; // 40% accuracy

// Selection
const topCandidates = 5; // pick from top N similar questions
```

These can be adjusted based on user feedback and analytics.
