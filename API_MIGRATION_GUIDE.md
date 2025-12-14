# API Migration Guide: Client-Side to Server-Side Question Loading

## Overview

The application has been refactored to load questions on-demand from the server instead of bundling all JSON files on the client side. This significantly reduces initial bundle size and improves performance.

## Architecture Changes

### Before
- All question JSON files were imported on the client
- Questions were filtered client-side
- Large initial bundle size (~several MB)

### After
- Questions are fetched from API endpoints as needed
- Only one question loaded at a time
- Adjacent questions are prefetched for smooth navigation
- Intelligent caching prevents redundant requests

## New API Endpoints

### 1. Get Question List (IDs only)
```
GET /api/questions/:channelId?subChannel=:subChannel&difficulty=:difficulty
```
Returns array of question IDs with basic metadata (no full content).

### 2. Get Single Question
```
GET /api/question/:questionId
```
Returns complete question data including answer, explanation, and diagram.

### 3. Get Channel Stats
```
GET /api/stats
```
Returns question counts by channel and difficulty.

### 4. Get Subchannels
```
GET /api/subchannels/:channelId
```
Returns list of subchannels for a given channel.

## New Hooks

### `useQuestions(channelId, subChannel, difficulty)`
Fetches the list of question IDs for a channel with optional filters.

```typescript
const { questionIds, loading, error } = useQuestions('system-design', 'all', 'all');
```

### `useQuestion(questionId)`
Fetches a single question by ID.

```typescript
const { question, loading, error } = useQuestion('sd-001');
```

### `useQuestionsWithPrefetch(channelId, currentIndex, subChannel, difficulty)`
Combined hook that manages question list, current question, and prefetching.

```typescript
const { 
  question, 
  questionIds, 
  totalQuestions, 
  loading, 
  error 
} = useQuestionsWithPrefetch('algorithms', 0, 'all', 'all');
```

### `useChannelStats()`
Fetches statistics for all channels.

```typescript
const { stats, loading, error } = useChannelStats();
```

## Migration Steps

### Step 1: Update Component Imports
Replace:
```typescript
import { getQuestions, getAllQuestions } from '../lib/data';
```

With:
```typescript
import { useQuestionsWithPrefetch } from '../hooks/use-questions';
```

### Step 2: Replace Data Fetching Logic
Replace:
```typescript
const channelQuestions = getQuestions(channelId, subChannel, difficulty);
const currentQuestion = channelQuestions[currentIndex];
```

With:
```typescript
const { question, questionIds, totalQuestions, loading, error } = 
  useQuestionsWithPrefetch(channelId, currentIndex, subChannel, difficulty);
```

### Step 3: Handle Loading and Error States
Add loading and error handling:
```typescript
if (loading && !question) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorMessage error={error} />;
}

if (!question) {
  return <NoQuestionsFound />;
}
```

### Step 4: Update Stats Components
Replace:
```typescript
import { getStatsByChannel } from '../lib/data';
const stats = getStatsByChannel();
```

With:
```typescript
import { useChannelStats } from '../hooks/use-stats';
const { stats, loading, error } = useChannelStats();
```

## Performance Benefits

1. **Reduced Initial Bundle**: ~90% reduction in initial JavaScript bundle size
2. **Faster Page Load**: Questions load on-demand instead of upfront
3. **Better Caching**: Questions are cached after first fetch
4. **Prefetching**: Adjacent questions load in background for smooth navigation
5. **Lower Memory Usage**: Only active questions kept in memory

## Caching Strategy

- Question lists are cached by channel + filters
- Individual questions are cached by ID
- Adjacent questions (±1, ±2) are prefetched automatically
- Cache persists for the session
- Use `clearQuestionCache()` to manually clear cache

## Backwards Compatibility

The old `getQuestions()` and `getAllQuestions()` functions still exist but:
- Return empty arrays
- Log deprecation warnings
- Should be replaced with new hooks

## Testing

1. Test question navigation (forward/backward)
2. Verify filters work correctly
3. Check loading states appear briefly
4. Confirm prefetching works (no delay on navigation)
5. Test error handling (disconnect network)

## Example: Complete Component Migration

See `client/src/pages/ReelsRedesignedNew.tsx` for a complete example of the new pattern.

## Rollback Plan

If issues arise:
1. Revert `server/routes.ts` to empty state
2. Restore old `client/src/lib/data.ts` implementation
3. Remove new hooks from `client/src/hooks/`
4. Update components to use old `getQuestions()` pattern

## Next Steps

1. Update all components using `getQuestions()` to use new hooks
2. Remove deprecated functions after migration complete
3. Add request rate limiting on server
4. Implement Redis caching for production
5. Add analytics for API performance monitoring
