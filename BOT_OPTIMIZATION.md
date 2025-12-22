# Bot Optimization Summary

## Changes Made

### 1. AI Framework (script/ai/)
A centralized GenAI framework for consistent AI operations across all bots:

**Structure:**
```
script/ai/
├── index.js              # Main entry point - ai.run('taskType', context)
├── config.js             # Central configuration (retry, cache, rate limits)
├── providers/
│   └── opencode.js       # OpenCode CLI provider
├── middleware/
│   ├── circuit-breaker.js
│   ├── retry.js
│   ├── cache.js
│   ├── validator.js
│   └── metrics.js
└── prompts/templates/
    ├── base.js           # Shared prompt components
    ├── eli5.js           # ELI5 explanations
    ├── tldr.js           # TLDR summaries
    ├── diagram.js        # Mermaid diagrams
    ├── company.js        # Company finder
    ├── classify.js       # Question classification
    ├── improve.js        # Question improvement
    ├── generate.js       # Question generation
    ├── relevance.js      # Relevance scoring
    └── coding-challenge.js # Coding challenges
```

**Usage:**
```javascript
import ai from './ai/index.js';

// Simple unified interface
const result = await ai.run('eli5', { question, answer });
const result = await ai.run('company', { question, tags, difficulty });
const result = await ai.run('classify', { question, answer, tags });
```

**Benefits:**
- Single source of truth for all prompts
- Consistent retry, caching, and circuit breaker behavior
- Centralized metrics and logging
- Easy to add new task types
- Validation built-in

### 2. BaseBotRunner Class (utils.js)
A reusable base class that handles common bot patterns:
- State management (load/save to database)
- Work queue integration
- Rate limiting
- Batch processing
- Summary output

**Benefits:** Reduces each bot from ~200 lines to ~80 lines, easier maintenance.

### 3. Circuit Breaker (utils.js + ai/middleware/)
Protects against cascade failures when OpenCode CLI is down:
- Opens after 5 consecutive failures
- Auto-resets after 5 minutes
- Prevents wasted API calls

**Usage:** `runWithCircuitBreaker(prompt)` or via AI framework (automatic)

### 4. Targeted Database Queries (utils.js)
New optimized queries that avoid fetching all questions:
- `getQuestionsNeedingEli5(limit)` - Questions missing ELI5
- `getQuestionsNeedingTldr(limit)` - Questions missing TLDR
- `getQuestionsNeedingCompanies(limit)` - Questions with <3 companies

**Benefits:** Faster execution, less memory usage.

### 5. Parallel Work Item Creation (classify-bot.js)
Work items are now created in parallel using `Promise.all()`:
```javascript
await Promise.all([
  addWorkItem(id, 'video', ...),
  addWorkItem(id, 'mermaid', ...),
  addWorkItem(id, 'company', ...),
]);
```

### 6. Consolidated Deploy Workflow
New `batch-deploy.yml` runs once at 20:00 UTC instead of after each bot.

**Old:** 8 deploys/day (one per bot)
**New:** 1 deploy/day (consolidated)

### 7. Optimized Schedule

| Time (UTC) | Bots |
|------------|------|
| 00:00 | Creator Bot |
| 04:00 | Ranker Bot |
| 05:00 | Inspirer Bot |
| 08:00 | Simplify Bot + Quickshot Bot (parallel) |
| 12:00 | Sorter Bot (orchestrator) |
| 16:00 | Visualizer Bot + Recruiter Bot (parallel) |
| 20:00 | Batch Deploy |

## Bots Using AI Framework

All bots now use the centralized AI framework:
- ✅ eli5-bot.js - `ai.run('eli5', ...)`
- ✅ tldr-bot.js - `ai.run('tldr', ...)`
- ✅ mermaid-bot.js - `ai.run('diagram', ...)`
- ✅ company-bot.js - `ai.run('company', ...)`
- ✅ classify-bot.js - `ai.run('classify', ...)`
- ✅ improve-question.js - `ai.run('improve', ...)`
- ✅ relevance-bot.js - `ai.run('relevance', ...)`
- ✅ generate-question.js - `ai.run('generate', ...)`
- ✅ coding-challenge-bot.js - `ai.run('coding-challenge', ...)`

## Bots Using BaseBotRunner

The following bots use `BaseBotRunner` for state/queue management:
- ✅ eli5-bot.js
- ✅ tldr-bot.js
- ✅ company-bot.js
- ✅ mermaid-bot.js

## Files Changed

### AI Framework (NEW)
- `script/ai/index.js` - Main entry point
- `script/ai/config.js` - Central configuration
- `script/ai/providers/opencode.js` - OpenCode CLI provider
- `script/ai/middleware/*.js` - Circuit breaker, retry, cache, validator, metrics
- `script/ai/prompts/templates/*.js` - All prompt templates

### Scripts
- `script/utils.js` - Added BaseBotRunner, circuit breaker, targeted queries
- `script/eli5-bot.js` - Uses AI framework + BaseBotRunner
- `script/tldr-bot.js` - Uses AI framework + BaseBotRunner
- `script/company-bot.js` - Uses AI framework + BaseBotRunner
- `script/mermaid-bot.js` - Uses AI framework + BaseBotRunner
- `script/classify-bot.js` - Uses AI framework, parallel work items
- `script/improve-question.js` - Uses AI framework
- `script/relevance-bot.js` - Uses AI framework
- `script/generate-question.js` - Uses AI framework
- `script/coding-challenge-bot.js` - Uses AI framework

### Workflows
- `.github/workflows/batch-deploy.yml` - NEW: Consolidated deploy
- `.github/workflows/eli5-bot.yml` - Removed deploy trigger, added timeout
- `.github/workflows/tldr-bot.yml` - Removed deploy trigger, new schedule
- `.github/workflows/company-bot.yml` - Removed deploy trigger, added timeout
- `.github/workflows/mermaid-bot.yml` - Removed deploy trigger, new schedule
- `.github/workflows/classify-bot.yml` - Removed deploy trigger, new schedule

## Adding New AI Tasks

To add a new AI task type:

1. Create template in `script/ai/prompts/templates/newtask.js`:
```javascript
export const schema = { /* expected output */ };
export const guidelines = [ /* rules */ ];
export function build(context) { /* return prompt string */ }
export default { schema, guidelines, build };
```

2. Register in `script/ai/index.js`:
```javascript
import newtaskTemplate from './prompts/templates/newtask.js';
const templates = { ..., newtask: newtaskTemplate };
```

3. Use in bot:
```javascript
const result = await ai.run('newtask', { ...context });
```
