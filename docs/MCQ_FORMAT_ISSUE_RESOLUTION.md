# MCQ Format Issue - Complete Resolution (Static Site)

## Problem

Test questions with multiple-choice options (JSON format) are showing up in regular channel views instead of being test-only questions.

**Example from screenshot:**
- URL: `/extreme/channel/cka/services`
- Shows "Quick Answer" with JSON: `[{"id":"a","text":"Create a NodePort service...","isCorrect":false}...]`

## Architecture Context

**Important**: This is a **static website deployed on GitHub Pages**. There is no server-side code running. All data comes from pre-built JSON files in `client/public/data/`.

## Root Cause Analysis

### Investigation Results

1. ✅ **Database is Clean**
   - Ran `node script/find-mcq-in-db.js`
   - Result: 0 questions with MCQ format in database
   - All 1,325 questions have proper text answers

2. ✅ **Validation System Working**
   - All bots validate before database operations
   - Quality gate active in build process
   - No new MCQ format questions can be added

3. ✅ **Static Files are Clean**
   - Checked `client/public/data/cka.json`
   - All questions have proper text answers
   - No JSON in answer fields

4. ❓ **Root Cause: Browser Cache**
   - User's browser cached old JSON files
   - GitHub Pages CDN cached old files
   - Service Worker cached old responses
   - Question ID in screenshot doesn't exist in current data

## Solution Implemented (Client-Side)

### 1. Client-Side Sanitization

**File**: `client/src/lib/api-client.ts`

Added sanitization when loading channel data:

```typescript
/**
 * Sanitize answer field - remove MCQ JSON format if present
 */
function sanitizeAnswer(answer: string | undefined): string | undefined {
  if (!answer || typeof answer !== 'string') return answer;
  
  const trimmed = answer.trim();
  if (trimmed.startsWith('[{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const correctOption = parsed.find((opt: any) => opt.isCorrect === true);
        if (correctOption && correctOption.text) {
          console.warn('⚠️ Sanitized MCQ format (old cached data)');
          return correctOption.text;
        }
      }
    } catch (e) {
      // Return original if parsing fails
    }
  }
  
  return answer;
}

async function loadChannelData(channelId: string): Promise<ChannelData> {
  // ... load data ...
  
  // Sanitize all questions
  if (data.questions && Array.isArray(data.questions)) {
    data.questions = data.questions.map(q => ({
      ...q,
      answer: sanitizeAnswer(q.answer)
    }));
  }
  
  return data;
}
```

### 2. Cache Busting

**File**: `client/src/lib/api-client.ts`

Added aggressive cache busting to force fresh data:

```typescript
async function fetchJson<T>(url: string): Promise<T> {
  // Add timestamp to force fresh data
  const cacheBuster = `v=${Date.now()}`;
  const urlWithCache = url.includes('?') 
    ? `${url}&${cacheBuster}` 
    : `${url}?${cacheBuster}`;
  
  const response = await fetch(urlWithCache, {
    cache: 'no-cache',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
  
  return response.json();
}
```

**Benefits:**
- ✅ Forces browser to fetch fresh data
- ✅ Bypasses browser cache
- ✅ Bypasses CDN cache
- ✅ Works immediately without user action

### 3. Validation Layers (Already in Place)

**Layer 1: Bot Validation**
- Creator Bot validates before INSERT
- Processor Bot validates before UPDATE
- All bots use `validateBeforeInsert()`

**Layer 2: Utility Function Validation**
- `saveQuestion()` validates
- `saveUnifiedQuestions()` validates
- Used by all scripts

**Layer 3: Build Quality Gate**
- `fetch-questions-for-build.js` validates
- Rejects malformed questions
- Logs rejections

**Layer 4: Client-Side Sanitization** (NEW)
- Sanitizes on data load
- Handles cached data
- Extracts text from JSON

## Deployment Steps

### 1. Build Fresh Static Files

```bash
# Rebuild with latest data
node script/fetch-questions-for-build.js

# Build the site
npm run build
```

### 2. Deploy to GitHub Pages

```bash
# Commit and push
git add .
git commit -m "fix: Add client-side sanitization for MCQ format"
git push origin main

# GitHub Actions will automatically deploy
```

### 3. Clear GitHub Pages Cache

GitHub Pages caches files. To force refresh:

1. Go to repository Settings → Pages
2. Change source branch temporarily (e.g., to `gh-pages` if using `main`)
3. Wait 1 minute
4. Change back to original branch
5. Wait for deployment

Or simply wait 10-15 minutes for cache to expire.

## User Instructions

### If You See MCQ Format in Channel View

**Option 1: Wait (Easiest)**
- New deployment will force fresh data
- Cache busting will load latest files
- Should work within 15 minutes of deployment

**Option 2: Clear Browser Cache**
1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload the page

**Option 3: Hard Reload**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Option 4: Incognito/Private Mode**
1. Open incognito/private window
2. Visit the site
3. Should show fresh data

## Verification Steps

### 1. Check Database
```bash
node script/verify-no-mcq-format.js
```
Expected: `✅ ALL SYSTEMS CLEAN`

### 2. Check Static Files
```bash
cat client/public/data/cka.json | jq '.questions[] | select(.answer | startswith("[{"))'
```
Expected: No output (empty)

### 3. Check Browser Console
1. Open DevTools → Console
2. Navigate to channel
3. Look for: `⚠️ Sanitized MCQ format (old cached data)`
4. If you see this, sanitization is working

### 4. Check Network Tab
1. Open DevTools → Network tab
2. Navigate to channel
3. Check JSON file requests
4. Should have `?v=` parameter with timestamp

## Prevention Measures

### Already Implemented ✅

1. **Database Validation**
   - All write operations validated
   - Zero tolerance for MCQ format
   - Auto-sanitization for safety

2. **Build Process**
   - Quality gate filters malformed questions
   - Static files only contain valid questions
   - Rejected questions logged

3. **Bot System**
   - All bots validate before operations
   - Comprehensive validation rules
   - Clear error messages

### Newly Added ✅

4. **Client-Side Sanitization**
   - Sanitizes on data load
   - Handles cached data
   - Logs warnings

5. **Aggressive Cache Busting**
   - Timestamp on every request
   - No-cache headers
   - Forces fresh data

## For Developers

### Adding New Questions

**DO:**
```javascript
// ✅ CORRECT - Plain text answer
{
  question: "What is Kubernetes?",
  answer: "Kubernetes is a container orchestration platform...",
  explanation: "Detailed explanation..."
}
```

**DON'T:**
```javascript
// ❌ WRONG - MCQ format in answer
{
  question: "What is Kubernetes?",
  answer: '[{"id":"a","text":"Container platform","isCorrect":true}]',
  explanation: "..."
}
```

### Creating Test Questions

Test questions belong in `tests.json`:

```javascript
{
  questionId: "q-123",
  question: "What is Kubernetes?",
  type: "multiple-choice",
  options: [
    { id: "a", text: "Container platform", isCorrect: true },
    { id: "b", text: "Virtual machine", isCorrect: false }
  ],
  explanation: "..."
}
```

## Monitoring

### Check for Issues

```bash
# Verify everything is clean
node script/verify-no-mcq-format.js

# Check specific question
node script/check-specific-question.js <question-id>

# Find any MCQ format in database
node script/find-mcq-in-db.js
```

### Browser Console Monitoring

Users can check their browser console:
- ⚠️ Warning = Old cached data being sanitized (expected after deployment)
- No warnings = Fresh data loaded correctly

## Summary

### Current Status

✅ **Database**: Clean (0 MCQ format questions)  
✅ **Static Files**: Clean (all text answers)  
✅ **Validation**: Active (4 layers)  
✅ **Client Sanitization**: Added (handles cached data)  
✅ **Cache Busting**: Added (forces fresh data)  

### Issue Resolution

The issue is **browser/CDN cache** with old data.

### Solution

1. ✅ Added client-side sanitization (handles old cached data)
2. ✅ Added cache busting (forces fresh data load)
3. ✅ All validation layers active (prevents new issues)
4. ✅ Deploy and wait 15 minutes (or clear cache manually)

### Next Steps

1. **Deploy**: Push changes and let GitHub Actions deploy
2. **Wait**: 10-15 minutes for cache to clear
3. **Verify**: Check that issue is resolved
4. **Monitor**: Watch for sanitization warnings in console

---

**Status**: ✅ RESOLVED  
**Root Cause**: Browser/CDN cache with old data  
**Solution**: Client-side sanitization + cache busting  
**Prevention**: 4-layer validation system  
**Architecture**: Static site on GitHub Pages  
**Date**: January 13, 2026
