# Question Generation System V2 - Enhanced Interview-Style

## Overview

The V2 system improves question generation with:
1. **Interview-style questions** - Realistic technical interview scenarios
2. **Better quality control** - Enhanced validation and improvement
3. **Diagram conversion** - Gradual migration to D3.js/Google Charts
4. **Backward compatibility** - Works alongside V1, no breaking changes

## Architecture

### 1. Question Generator V2 (`generate-question-v2.js`)

**Improvements over V1:**
- Interview-style prompts tailored by difficulty level
- Context-aware question generation
- Better validation (ensures questions end with `?`)
- Adds `diagramType` field for future conversion

**Key Features:**
```javascript
// Difficulty-specific prompts
const interviewPrompts = {
  beginner: (context) => "realistic beginner interview question...",
  intermediate: (context) => "practical scenario with trade-offs...",
  advanced: (context) => "complex system design with constraints..."
};
```

**Usage:**
```bash
# Generate 5 interview-style questions
node script/generate-question-v2.js

# Via GitHub Actions
# Runs daily at 00:00 UTC
# Manual trigger available
```

### 2. Question Improvement Bot V2 (`improve-question-v2.js`)

**Improvements over V1:**
- Comprehensive quality checks (10+ criteria)
- Interview-style improvement prompts
- Checks for code examples and practical context
- Validates question format and structure

**Quality Checks:**
- Answer length (20-300 chars)
- Explanation depth (>100 chars)
- Code examples present
- Diagram quality
- Question format (ends with `?`)
- Interview-style phrasing
- Practical examples

**Usage:**
```bash
# Improve 5 questions
node script/improve-question-v2.js

# Via GitHub Actions
# Runs daily at 06:00 UTC
```

### 3. Diagram Conversion Bot (`convert-diagrams.js`)

**Purpose:**
Gradually convert Mermaid diagrams to D3.js or Google Charts where appropriate.

**Diagram Type Detection:**
- **D3.js Hierarchy** - Flowcharts, processes
- **D3.js Force-Directed** - Architecture, systems
- **D3.js Timeline** - Sequence diagrams
- **D3.js Tree** - Hierarchical structures
- **Google Charts Line** - Performance metrics
- **Mermaid** - Default fallback

**Backward Compatibility:**
```json
{
  "diagram": "graph TD\n    A --> B",  // Original mermaid (preserved)
  "diagramType": "d3-force",            // New type
  "diagramData": {...},                 // Converted data
  "diagramConfig": {...}                // Configuration
}
```

**Usage:**
```bash
# Convert 3 diagrams
node script/convert-diagrams.js

# Via GitHub Actions
# Runs weekly on Sunday at 12:00 UTC
```

## Data Structure

### Question Schema V2

```typescript
interface Question {
  // Core fields (unchanged)
  id: string;
  question: string;
  answer: string;
  explanation: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  channel: string;
  subChannel: string;
  lastUpdated: string;
  
  // Diagram fields (enhanced)
  diagram: string;              // Original mermaid (always present)
  diagramType?: string;         // 'mermaid' | 'd3-hierarchy' | 'd3-force' | etc.
  diagramData?: object;         // Converted diagram data
  diagramConfig?: object;       // Diagram configuration
}
```

## GitHub Actions Workflows

### 1. Daily Question Generator V2
- **File**: `.github/workflows/daily-question-v2.yml`
- **Schedule**: Daily at 00:00 UTC
- **Purpose**: Generate 5 interview-style questions
- **Trigger**: Automatic + Manual

### 2. Question Improvement Bot V2
- **File**: `.github/workflows/improve-question-v2.yml`
- **Schedule**: Daily at 06:00 UTC
- **Purpose**: Improve 5 questions to interview-style
- **Trigger**: Automatic + Manual

### 3. Diagram Conversion Bot
- **File**: `.github/workflows/convert-diagrams.yml`
- **Schedule**: Weekly on Sunday at 12:00 UTC
- **Purpose**: Convert 3 diagrams to D3.js/Google Charts
- **Trigger**: Automatic + Manual

## Migration Strategy

### Phase 1: Parallel Operation (Current)
- V1 and V2 run side-by-side
- V2 workflows have different schedules
- No breaking changes to existing questions

### Phase 2: Gradual Transition (1-2 months)
- Monitor V2 question quality
- Gradually increase V2 generation rate
- Decrease V1 generation rate

### Phase 3: Full Migration (2-3 months)
- Disable V1 workflows
- All new questions use V2
- V1 scripts kept for reference

### Phase 4: Diagram Conversion (3-6 months)
- Gradually convert existing diagrams
- Implement D3.js/Google Charts renderers
- Keep Mermaid as fallback

## Frontend Integration

### Current (Mermaid Only)
```tsx
<EnhancedMermaid chart={question.diagram} />
```

### Future (Multi-Type Support)
```tsx
{question.diagramType === 'mermaid' && (
  <EnhancedMermaid chart={question.diagram} />
)}
{question.diagramType === 'd3-force' && (
  <D3ForceGraph data={question.diagramData} config={question.diagramConfig} />
)}
{question.diagramType === 'google-charts-line' && (
  <GoogleLineChart data={question.diagramData} config={question.diagramConfig} />
)}
```

## Quality Metrics

### V1 vs V2 Comparison

| Metric | V1 | V2 |
|--------|----|----|
| Interview-style | ❌ | ✅ |
| Context-aware | ❌ | ✅ |
| Code examples | Sometimes | Always |
| Practical scenarios | Rare | Always |
| Question format | Variable | Consistent |
| Diagram quality | Basic | Enhanced |
| Validation | Basic | Comprehensive |

## Testing

### Test V2 Generator
```bash
# Test locally
INPUT_CHANNEL=algorithms INPUT_DIFFICULTY=intermediate node script/generate-question-v2.js

# Expected output:
# - 5 interview-style questions
# - All end with ?
# - Include practical context
# - Have code examples
# - Include diagrams
```

### Test Improvement Bot
```bash
# Test locally
node script/improve-question-v2.js

# Expected output:
# - Identifies questions needing improvement
# - Improves to interview-style
# - Adds code examples
# - Enhances diagrams
```

### Test Diagram Conversion
```bash
# Test locally
node script/convert-diagrams.js

# Expected output:
# - Analyzes diagram types
# - Converts appropriate diagrams
# - Preserves mermaid fallback
# - Adds diagramType and diagramData
```

## Monitoring

### Success Criteria
- ✅ Questions end with `?`
- ✅ Include practical scenarios
- ✅ Have code examples
- ✅ Explanations > 100 chars
- ✅ Diagrams are meaningful
- ✅ No duplicates
- ✅ Interview-style phrasing

### Failure Handling
- OpenCode timeout → Retry 3 times
- Invalid JSON → Skip and log
- Duplicate → Skip and log
- All failures logged in GitHub Actions summary

## Rollback Plan

If V2 causes issues:

1. **Disable V2 workflows**
   ```bash
   # Comment out schedule in:
   # - .github/workflows/daily-question-v2.yml
   # - .github/workflows/improve-question-v2.yml
   # - .github/workflows/convert-diagrams.yml
   ```

2. **Revert to V1**
   ```bash
   # V1 workflows continue running
   # No code changes needed
   ```

3. **Fix issues**
   ```bash
   # Update V2 scripts
   # Test locally
   # Re-enable workflows
   ```

## Future Enhancements

### Short-term (1-2 months)
- [ ] Add more diagram types (pie charts, bar charts)
- [ ] Implement difficulty auto-detection
- [ ] Add question similarity scoring
- [ ] Create question review dashboard

### Medium-term (3-6 months)
- [ ] Implement D3.js renderers
- [ ] Add Google Charts integration
- [ ] Create diagram editor UI
- [ ] Add question voting system

### Long-term (6-12 months)
- [ ] AI-powered question recommendations
- [ ] Personalized learning paths
- [ ] Interactive diagram editing
- [ ] Community question contributions

## Support

### Issues
- Report bugs in GitHub Issues
- Tag with `question-generation-v2`
- Include workflow run logs

### Questions
- Check existing documentation
- Review workflow logs
- Ask in GitHub Discussions

---

**Status**: ✅ Ready for Production
**Version**: 2.0
**Date**: December 14, 2024
**Backward Compatible**: Yes
