# 🔍 Analysis Bot

The Analysis Bot detects content quality issues, channel mismatches, and enrichment opportunities. It creates work items for the Processor Bot to fix.

## Overview

**Role**: Detection & Queue Management  
**Does NOT**: Fix issues directly  
**Creates**: Work items for Processor Bot

## Architecture

```
Analysis Bot → Detects Issues → Creates Work Items → Processor Bot Fixes
```

## What It Analyzes

### 1. Content Quality
- Missing/truncated content
- Short answers/explanations
- Placeholder content
- Formatting issues
- Question clarity

### 2. Channel Mapping (RAG-based)
- Semantic similarity to questions in other channels
- Keyword alignment with channel patterns
- Confidence-based remapping suggestions

### 3. Enrichment Opportunities
- Missing tags, companies, diagrams
- Missing videos
- Incomplete metadata

### 4. Voice Interview Readiness
- Answer length optimization
- Voice-specific keywords
- Conversational tone

### 5. Duplicate Detection
- High similarity detection (>90%)
- Potential duplicates (>80%)
- Cross-channel duplicate identification

## Usage

```bash
# Analyze all questions
node script/bots/analysis-bot.js

# Analyze specific channel
node script/bots/analysis-bot.js --channel=aws

# Limit number of questions
node script/bots/analysis-bot.js --limit=100

# Focus on specific analysis type
node script/bots/analysis-bot.js --focus=channels
node script/bots/analysis-bot.js --focus=quality
node script/bots/analysis-bot.js --focus=enrichment
node script/bots/analysis-bot.js --focus=voice
node script/bots/analysis-bot.js --focus=duplicates

# Combine options
node script/bots/analysis-bot.js --channel=kubernetes --focus=channels --limit=50
```

## Issue Types & Priorities

### Critical (Priority 1)
- `missing_question` - Question text is missing
- `missing_answer` - Answer text is missing

### High (Priority 2)
- `truncated_answer` - Answer ends with "..."
- `truncated_explanation` - Explanation ends with "..."
- `short_answer` - Answer < 100 characters
- `placeholder_content` - Contains TODO/TBD
- `likely_duplicate` - >90% similarity to another question

### Medium (Priority 3)
- `short_explanation` - Explanation < 50 characters
- `channel_mismatch` - RAG suggests different channel (>70% confidence)
- `low_channel_relevance` - No keyword matches for current channel
- `potential_duplicate` - >80% similarity to another question
- `missing_diagram` - System design question without diagram
- `missing_voice_keywords` - No voice-related tags

### Low (Priority 4)
- `missing_question_mark` - Question doesn't end with "?"

### Info (Priority 5)
- `missing_tags` - No tags present
- `insufficient_tags` - < 3 tags
- `missing_companies` - No companies listed
- `missing_videos` - No video links
- `verbose_for_voice` - Answer > 1000 characters

## Channel Mapping Logic

The bot uses RAG (Retrieval-Augmented Generation) to analyze channel fit:

1. **Semantic Search**: Finds 15 most similar questions
2. **Channel Distribution**: Analyzes which channels contain similar questions
3. **Confidence Calculation**: Computes confidence score based on similarity
4. **Threshold**: Only suggests remapping if confidence > 70%
5. **Keyword Validation**: Checks keyword alignment with channel patterns

### Channel Patterns

Each channel has associated keywords:
- `system-design`: scalability, distributed, microservices, caching
- `algorithms`: time complexity, big-o, sorting, dynamic programming
- `frontend`: react, vue, css, dom, webpack
- `kubernetes`: pod, deployment, service, helm
- `aws`: ec2, s3, lambda, rds, vpc
- etc.

## Work Item Creation

For each detected issue, the bot creates a work item with:

```javascript
{
  botName: 'processor',
  action: 'channel_mismatch',  // Issue type
  itemType: 'question',
  itemId: 'q-123',
  priority: 3,
  metadata: {
    severity: 'medium',
    detectedBy: 'analysis',
    currentChannel: 'frontend',
    suggestedChannel: 'react',
    confidence: 85,
    similarCount: 12
  }
}
```

## Integration with Processor Bot

The Processor Bot picks up work items and applies fixes:

```
Analysis Bot                    Processor Bot
    ↓                               ↓
Detect: channel_mismatch    →   Remap to suggested channel
Detect: truncated_answer    →   Complete answer using AI
Detect: missing_diagram     →   Generate diagram
Detect: likely_duplicate    →   Merge or differentiate
```

## Performance

- **Speed**: ~1 question/second (with RAG)
- **Batch Size**: Recommended 100-500 questions per run
- **Focus Mode**: 2-3x faster when using `--focus`

## Best Practices

### 1. Start with Quality Analysis
```bash
node script/bots/analysis-bot.js --focus=quality --limit=1000
```

### 2. Then Check Channel Mappings
```bash
node script/bots/analysis-bot.js --focus=channels --limit=500
```

### 3. Run Enrichment Periodically
```bash
node script/bots/analysis-bot.js --focus=enrichment
```

### 4. Check Specific Channels
```bash
node script/bots/analysis-bot.js --channel=aws --focus=channels
```

## Monitoring

Check analysis results:

```sql
-- Recent analysis runs
SELECT * FROM bot_runs 
WHERE botName = 'analysis' 
ORDER BY startedAt DESC 
LIMIT 10;

-- Work items created
SELECT action, COUNT(*) as count 
FROM work_queue 
WHERE metadata LIKE '%"detectedBy":"analysis"%'
GROUP BY action 
ORDER BY count DESC;

-- Issues by severity
SELECT 
  json_extract(metadata, '$.severity') as severity,
  COUNT(*) as count
FROM work_queue
WHERE botName = 'processor'
GROUP BY severity;
```

## Automation

The Analysis Bot is integrated into the Content Pipeline workflow:

### Daily Pipeline (2 AM UTC)

```
Creator Bot → Analysis Bot → Verifier Bot → Processor Bot → Blog Generator
```

**Analysis Bot runs automatically:**
- Analyzes up to 100 questions
- Runs comprehensive analysis (all focus areas)
- Creates work items for Processor Bot
- Runs after Creator Bot (to analyze new content)
- Runs before Verifier Bot (to queue issues early)

### Manual Trigger

You can run specific stages via GitHub Actions:

```yaml
# Run only analysis
workflow_dispatch:
  stage: analysis
  count: 200
  analysis_focus: channels

# Run full pipeline
workflow_dispatch:
  stage: all
  count: 50
  analysis_focus: all
```

### Focus Areas

Choose what to analyze:
- `all` - Comprehensive analysis (default)
- `quality` - Content quality only
- `channels` - Channel mapping only
- `enrichment` - Missing metadata only
- `voice` - Voice readiness only
- `duplicates` - Duplicate detection only

## Comparison with Old Reconciliation Bot

| Feature | Reconciliation Bot | Analysis Bot |
|---------|-------------------|--------------|
| **Action** | Fixes issues directly | Detects & queues only |
| **Scope** | Channel remapping only | All quality issues |
| **Integration** | Standalone | Works with Processor |
| **Flexibility** | Limited | Highly modular |
| **Audit Trail** | Basic | Comprehensive |
| **Rollback** | Difficult | Easy (via work queue) |

## Troubleshooting

### No Issues Found
- Check if questions are already high quality
- Try different focus areas
- Lower confidence thresholds in code

### Too Many Issues
- Use `--focus` to target specific areas
- Increase priority thresholds
- Filter by severity in Processor Bot

### RAG Errors
- Ensure Qdrant is running
- Check vector DB is populated
- Verify API keys in `.env`

## Future Enhancements

- [ ] ML-based quality scoring
- [ ] Automated difficulty assessment
- [ ] Cross-language duplicate detection
- [ ] Sentiment analysis for tone
- [ ] Readability scoring
- [ ] SEO optimization checks
