# Bot Optimization Summary

## Changes Made

### 1. BaseBotRunner Class (utils.js)
A reusable base class that handles common bot patterns:
- State management (load/save to database)
- Work queue integration
- Rate limiting
- Batch processing
- Summary output

**Benefits:** Reduces each bot from ~200 lines to ~80 lines, easier maintenance.

### 2. Circuit Breaker (utils.js)
Protects against cascade failures when OpenCode CLI is down:
- Opens after 5 consecutive failures
- Auto-resets after 5 minutes
- Prevents wasted API calls

**Usage:** `runWithCircuitBreaker(prompt)` instead of `runWithRetries(prompt)`

### 3. Targeted Database Queries (utils.js)
New optimized queries that avoid fetching all questions:
- `getQuestionsNeedingEli5(limit)` - Questions missing ELI5
- `getQuestionsNeedingTldr(limit)` - Questions missing TLDR
- `getQuestionsNeedingCompanies(limit)` - Questions with <3 companies

**Benefits:** Faster execution, less memory usage.

### 4. Parallel Work Item Creation (classify-bot.js)
Work items are now created in parallel using `Promise.all()`:
```javascript
await Promise.all([
  addWorkItem(id, 'video', ...),
  addWorkItem(id, 'mermaid', ...),
  addWorkItem(id, 'company', ...),
]);
```

### 5. Consolidated Deploy Workflow
New `batch-deploy.yml` runs once at 20:00 UTC instead of after each bot.

**Old:** 8 deploys/day (one per bot)
**New:** 1 deploy/day (consolidated)

### 6. Optimized Schedule

| Time (UTC) | Bots |
|------------|------|
| 00:00 | Creator Bot |
| 04:00 | Ranker Bot |
| 05:00 | Inspirer Bot |
| 08:00 | Simplify Bot + Quickshot Bot (parallel) |
| 12:00 | Sorter Bot (orchestrator) |
| 16:00 | Visualizer Bot + Recruiter Bot (parallel) |
| 20:00 | Batch Deploy |

## Refactored Bots

The following bots now use `BaseBotRunner`:
- ✅ eli5-bot.js
- ✅ tldr-bot.js
- ✅ company-bot.js
- ✅ mermaid-bot.js

## Files Changed

### Scripts
- `script/utils.js` - Added BaseBotRunner, circuit breaker, targeted queries
- `script/eli5-bot.js` - Refactored to use BaseBotRunner
- `script/tldr-bot.js` - Refactored to use BaseBotRunner
- `script/company-bot.js` - Refactored to use BaseBotRunner
- `script/mermaid-bot.js` - Refactored to use BaseBotRunner
- `script/classify-bot.js` - Parallel work item creation, circuit breaker

### Workflows
- `.github/workflows/batch-deploy.yml` - NEW: Consolidated deploy
- `.github/workflows/eli5-bot.yml` - Removed deploy trigger, added timeout
- `.github/workflows/tldr-bot.yml` - Removed deploy trigger, new schedule
- `.github/workflows/company-bot.yml` - Removed deploy trigger, added timeout
- `.github/workflows/mermaid-bot.yml` - Removed deploy trigger, new schedule
- `.github/workflows/classify-bot.yml` - Removed deploy trigger, new schedule

## Future Improvements

1. **Motivation Bot** - Move quotes to database instead of JSON file
2. **Remaining Bots** - Refactor to use BaseBotRunner:
   - relevance-bot.js
   - improve-question.js
   - generate-question.js
   - coding-challenge-bot.js
