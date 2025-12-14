# Question Generation Bots - Quick Reference

## Available Bots

### 1. Question Generator V1 (Legacy)
**File**: `script/generate-question.js`  
**Workflow**: `.github/workflows/daily-question.yml`  
**Schedule**: Daily at 00:00 UTC  
**Status**: ✅ Active (will be phased out)

```bash
# Run locally
node script/generate-question.js

# Manual trigger
gh workflow run daily-question.yml
```

### 2. Question Generator V2 (Enhanced) ⭐
**File**: `script/generate-question-v2.js`  
**Workflow**: `.github/workflows/daily-question-v2.yml`  
**Schedule**: Daily at 00:00 UTC  
**Status**: ✅ Active (recommended)

**Features**:
- Interview-style questions
- Context-aware generation
- Better validation
- Practical scenarios

```bash
# Run locally
INPUT_CHANNEL=algorithms INPUT_DIFFICULTY=intermediate \
node script/generate-question-v2.js

# Manual trigger
gh workflow run daily-question-v2.yml \
  -f channel=algorithms \
  -f difficulty=intermediate
```

### 3. Question Improvement Bot V1 (Legacy)
**File**: `script/improve-question.js`  
**Workflow**: `.github/workflows/improve-question.yml`  
**Schedule**: Daily at 06:00 UTC  
**Status**: ✅ Active (will be phased out)

```bash
# Run locally
node script/improve-question.js

# Manual trigger
gh workflow run improve-question.yml
```

### 4. Question Improvement Bot V2 (Enhanced) ⭐
**File**: `script/improve-question-v2.js`  
**Workflow**: `.github/workflows/improve-question-v2.yml`  
**Schedule**: Daily at 06:00 UTC  
**Status**: ✅ Active (recommended)

**Features**:
- 10+ quality checks
- Interview-style improvements
- Code example validation
- Better prompts

```bash
# Run locally
node script/improve-question-v2.js

# Manual trigger
gh workflow run improve-question-v2.yml
```

### 5. Diagram Conversion Bot 🆕
**File**: `script/convert-diagrams.js`  
**Workflow**: `.github/workflows/convert-diagrams.yml`  
**Schedule**: Weekly on Sunday at 12:00 UTC  
**Status**: ✅ Active (new)

**Features**:
- Converts Mermaid → D3.js/Google Charts
- Backward compatible
- Preserves original diagrams
- Gradual migration

```bash
# Run locally
node script/convert-diagrams.js

# Manual trigger
gh workflow run convert-diagrams.yml
```

## Quick Commands

### Generate Questions
```bash
# V1 (legacy)
node script/generate-question.js

# V2 (recommended)
node script/generate-question-v2.js

# With specific channel
INPUT_CHANNEL=devops node script/generate-question-v2.js

# With specific difficulty
INPUT_DIFFICULTY=advanced node script/generate-question-v2.js
```

### Improve Questions
```bash
# V1 (legacy)
node script/improve-question.js

# V2 (recommended)
node script/improve-question-v2.js
```

### Convert Diagrams
```bash
# Convert diagrams
node script/convert-diagrams.js
```

### Validate Questions
```bash
# Check for duplicates
node script/deduplicate-questions.js

# Validate all questions
node script/validate-questions.js
```

## Workflow Schedules

| Bot | Schedule | Frequency | Time (UTC) |
|-----|----------|-----------|------------|
| Generator V1 | Daily | Every day | 00:00 |
| Generator V2 | Daily | Every day | 00:00 |
| Improver V1 | Daily | Every day | 06:00 |
| Improver V2 | Daily | Every day | 06:00 |
| Diagram Converter | Weekly | Sunday | 12:00 |

## Bot Priorities

### High Priority (Run Daily)
1. ⭐ Question Generator V2
2. ⭐ Question Improvement Bot V2

### Medium Priority (Run Weekly)
3. 📊 Diagram Conversion Bot

### Low Priority (Phase Out)
4. Question Generator V1
5. Question Improvement Bot V1

## Monitoring

### Check Bot Status
```bash
# View recent workflow runs
gh run list --workflow=daily-question-v2.yml --limit=5

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

### Check Question Quality
```bash
# Count questions by channel
ls -la client/src/lib/questions/*.json | wc -l

# View recent questions
git log --oneline --grep="Add\|Improve" --since="1 week ago"

# Check for issues
grep -r "TODO\|FIXME" client/src/lib/questions/
```

## Troubleshooting

### Bot Failed
```bash
# Check workflow logs
gh run view --log

# Common issues:
# - OpenCode timeout → Retry manually
# - Invalid JSON → Check prompt format
# - Duplicate detected → Normal, skip
# - Git conflict → Pull and retry
```

### Question Quality Issues
```bash
# Run improvement bot
node script/improve-question-v2.js

# Or manually fix in:
client/src/lib/questions/<channel>.json
```

### Diagram Issues
```bash
# Run conversion bot
node script/convert-diagrams.js

# Or keep as Mermaid (fallback)
```

## Best Practices

### When to Use V1
- ❌ Don't use V1 for new questions
- ✅ Keep for backward compatibility
- ✅ Will be phased out in 2-3 months

### When to Use V2
- ✅ All new question generation
- ✅ Question improvements
- ✅ Interview-style questions
- ✅ Production use

### When to Convert Diagrams
- ✅ Performance metrics → Google Charts
- ✅ System architecture → D3.js Force
- ✅ Flowcharts → D3.js Hierarchy
- ✅ Sequences → D3.js Timeline
- ❌ Simple diagrams → Keep Mermaid

## Configuration

### Environment Variables
```bash
# Question generation
INPUT_CHANNEL=algorithms    # or random
INPUT_DIFFICULTY=advanced   # or random

# OpenCode settings (in utils.js)
MAX_RETRIES=3
RETRY_DELAY_MS=10000
TIMEOUT_MS=120000
```

### GitHub Secrets
```bash
# Required secrets:
GITHUB_TOKEN  # Auto-provided
GH_TOKEN      # For triggering deploy
```

## Migration Timeline

### Phase 1: Now - 1 month
- ✅ V1 and V2 run in parallel
- ✅ Monitor V2 quality
- ✅ Gradual diagram conversion

### Phase 2: 1-2 months
- ⏳ Increase V2 rate
- ⏳ Decrease V1 rate
- ⏳ More diagram conversions

### Phase 3: 2-3 months
- ⏳ Disable V1 workflows
- ⏳ V2 only
- ⏳ Most diagrams converted

### Phase 4: 3-6 months
- ⏳ Remove V1 code
- ⏳ All diagrams converted
- ⏳ Full D3.js/Google Charts support

## Support

### Documentation
- `QUESTION_GENERATION_V2.md` - Full documentation
- `BOTS_QUICK_REFERENCE.md` - This file
- `README.md` - Project overview

### Help
- GitHub Issues - Bug reports
- GitHub Discussions - Questions
- Workflow logs - Debugging

---

**Last Updated**: December 14, 2024  
**Version**: 2.0  
**Status**: Production Ready
