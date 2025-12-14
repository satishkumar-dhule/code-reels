# API Testing Guide

## Quick Test Commands

After starting the server, test these endpoints:

### 1. Get Channel Stats
```bash
curl http://localhost:5000/api/stats
```

Expected: Array of channel stats with counts

### 2. Get Questions for a Channel
```bash
curl http://localhost:5000/api/questions/system-design
```

Expected: Array of question IDs with metadata

### 3. Get Questions with Filters
```bash
curl "http://localhost:5000/api/questions/algorithms?difficulty=beginner"
```

Expected: Filtered array of question IDs

### 4. Get Single Question
```bash
curl http://localhost:5000/api/question/sd-001
```

Expected: Complete question object with answer and explanation

### 5. Get Subchannels
```bash
curl http://localhost:5000/api/subchannels/database
```

Expected: Array of subchannel names

## Browser Testing

1. Start the dev server: `npm run dev`
2. Open browser console
3. Test API calls:

```javascript
// Test fetching question list
fetch('/api/questions/system-design')
  .then(r => r.json())
  .then(console.log);

// Test fetching single question
fetch('/api/question/sd-001')
  .then(r => r.json())
  .then(console.log);

// Test stats
fetch('/api/stats')
  .then(r => r.json())
  .then(console.log);
```

## Integration Testing

Test the new hooks in a component:

```typescript
import { useQuestionsWithPrefetch } from '../hooks/use-questions';

function TestComponent() {
  const { question, loading, error } = useQuestionsWithPrefetch('algorithms', 0);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!question) return <div>No question found</div>;
  
  return <div>{question.question}</div>;
}
```

## Performance Testing

Check network tab to verify:
- Only one question loads at a time
- Adjacent questions are prefetched
- Cached questions don't trigger new requests
- Response times are < 50ms for cached data

## Expected Behavior

1. Initial page load: Fetches question list (IDs only)
2. First question: Fetches full question data
3. Navigation: Prefetches next/previous questions
4. Filter change: Fetches new question list
5. Revisiting question: Served from cache (no network request)
