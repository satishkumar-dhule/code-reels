# Quick Start: API-Based Question Loading

## 🚀 What Changed?

Questions are now loaded **one at a time** from the server instead of bundling all JSONs on the client.

## ✅ Benefits

- 90% smaller initial bundle
- Faster page loads
- Lower memory usage
- Smooth navigation with prefetching

## 🎯 How to Use

### Option 1: Use the New Hook (Recommended)

```typescript
import { useQuestionsWithPrefetch } from '../hooks/use-questions';

function MyComponent() {
  const { 
    question,        // Current question
    questionIds,     // All IDs
    totalQuestions,  // Count
    loading,         // Loading state
    error           // Error state
  } = useQuestionsWithPrefetch(
    'algorithms',    // Channel
    0,              // Index
    'all',          // Subchannel
    'all'           // Difficulty
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!question) return <div>No questions</div>;

  return <div>{question.question}</div>;
}
```

### Option 2: Use Individual Hooks

```typescript
import { useQuestions, useQuestion } from '../hooks/use-questions';

function MyComponent() {
  // Get question IDs
  const { questionIds } = useQuestions('algorithms');
  
  // Get specific question
  const { question } = useQuestion(questionIds[0]);
  
  return <div>{question?.question}</div>;
}
```

### Option 3: Use API Directly

```typescript
import { fetchQuestion, fetchQuestionList } from '../lib/api';

async function loadData() {
  // Get question IDs
  const ids = await fetchQuestionList('algorithms');
  
  // Get specific question
  const question = await fetchQuestion(ids[0].id);
  
  console.log(question);
}
```

## 🧪 Test It

### 1. Start Server
```bash
npm run dev
```

### 2. Test API
```bash
# Get stats
curl http://localhost:5000/api/stats

# Get questions
curl http://localhost:5000/api/questions/algorithms

# Get single question (replace with actual ID from above)
curl http://localhost:5000/api/question/algo-001
```

### 3. Test in Browser
Open console and run:
```javascript
fetch('/api/stats').then(r => r.json()).then(console.log);
```

## 📝 Migration Checklist

To migrate an existing component:

1. **Replace imports**
   ```typescript
   // Old
   import { getQuestions } from '../lib/data';
   
   // New
   import { useQuestionsWithPrefetch } from '../hooks/use-questions';
   ```

2. **Replace data fetching**
   ```typescript
   // Old
   const questions = getQuestions(channelId);
   const current = questions[index];
   
   // New
   const { question, loading, error } = useQuestionsWithPrefetch(channelId, index);
   ```

3. **Add loading state**
   ```typescript
   if (loading) return <LoadingSpinner />;
   ```

4. **Add error handling**
   ```typescript
   if (error) return <ErrorMessage error={error} />;
   ```

5. **Update question access**
   ```typescript
   // Old
   current.question
   
   // New
   question?.question
   ```

## 🎨 Example Component

See `client/src/pages/ReelsRedesignedNew.tsx` for a complete example.

## 📚 Documentation

- `API_IMPLEMENTATION_SUMMARY.md` - Overview and status
- `API_MIGRATION_GUIDE.md` - Detailed migration steps
- `ARCHITECTURE_CHANGES.md` - Technical details
- `TEST_API.md` - Testing guide

## 🐛 Troubleshooting

**Questions not loading?**
- Check server is running
- Check browser console for errors
- Test API: `curl http://localhost:5000/api/stats`

**TypeScript errors?**
- Run `npm run check`
- Ensure hooks are imported correctly
- Check return types match usage

**Slow navigation?**
- Check network tab for prefetch requests
- Verify caching (no duplicate requests)
- Check console for warnings

## 💡 Tips

1. **Prefetching**: Adjacent questions load automatically in background
2. **Caching**: Questions cached after first fetch (no redundant requests)
3. **Filters**: Applied server-side for better performance
4. **Loading**: Always handle loading and error states
5. **TypeScript**: Use provided types for type safety

## 🎯 Next Steps

1. Migrate your components using the guide above
2. Test navigation and filters
3. Verify loading states work
4. Check prefetching in network tab
5. Remove old `getQuestions()` calls

---

**Need Help?** Check the detailed guides in the documentation files above.
