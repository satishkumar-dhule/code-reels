# LinkedIn Post Generation - Quick Start

## TL;DR

LinkedIn posts now use **8 different hook patterns** and include **technical details** so newcomers can understand the concepts. No more repetitive "it was 2am" posts!

## Generate a Post

### Automatic (with AI)
```bash
# Set environment variables
export POST_TITLE="Your Blog Title"
export POST_URL="https://your-blog-url.com"
export POST_EXCERPT="Brief description"
export POST_CHANNEL="kubernetes"  # or frontend, backend, etc.
export POST_TAGS="#kubernetes #devops"

# Generate and publish
node script/publish-to-linkedin.js
```

### Test Without Publishing
```bash
DRY_RUN=true node script/publish-to-linkedin.js
```

### Test Variety (Fallback Templates)
```bash
# Note: AI is always used by default for best results
# Fallback templates are only for when AI fails
SKIP_AI=true node script/test-dynamic-linkedin-posts.js
```

## Hook Patterns

Your posts will automatically use one of these patterns:

| Pattern | Example |
|---------|---------|
| **Question** | "Why do 90% of engineers get X wrong?" |
| **Statistic** | "73% of production outages trace back to this." |
| **Contrarian** | "Everyone optimizes for X. The real bottleneck is Y." |
| **Story** | "Last Tuesday, our API went down. The root cause surprised everyone." |
| **Problem** | "You've seen this error. Here's what it really means." |
| **Insight** | "After 50 interviews, I noticed this pattern." |
| **Trend** | "In 2025, the way we approach X is different." |
| **Mistake** | "I spent 3 days debugging. The fix was one line." |

## What Makes a Good Post

✅ **DO:**
- Include technical terms with brief explanations
- Provide 4-5 concrete, actionable insights
- Explain concepts for newcomers
- Use specific numbers/metrics when possible
- Make it educational AND engaging

❌ **DON'T:**
- Assume readers know all the jargon
- Use the same hook pattern repeatedly
- Skip technical context
- Write vague insights without specifics

## Post Structure

Every post follows this structure:

```
[HOOK - 1-2 lines]
Attention-grabbing opening using one of 8 patterns

[TECHNICAL CONTEXT - 3-4 lines]
What is it? Why does it matter? What problem does it solve?

[KEY INSIGHTS - 4-5 bullet points]
🔍 Specific technical insight with context
⚡ Performance/efficiency gain with numbers
🎯 Best practice or pattern to follow
🛡️ Common pitfall to avoid
💡 Practical takeaway or next step

[TAKEAWAY - 1-2 lines]
Actionable insight that reinforces learning value
```

## Examples

### Question Hook + Kubernetes
```
Why do senior engineers always talk about "idempotency"?

Because distributed systems fail in unpredictable ways. Idempotency 
means an operation produces the same result whether you run it once 
or multiple times. This is critical when network requests can timeout, 
retry, or duplicate.

Key principles:
🔍 Use unique request IDs to detect and skip duplicate operations
⚡ Design APIs where POST /orders with same ID returns existing order
🎯 Database upserts (INSERT ... ON CONFLICT UPDATE) are your friend
🛡️ Avoid incrementing counters directly - use SET operations instead
💡 Test retry scenarios explicitly - they will happen in production

The best systems assume failure and handle it gracefully.
```

### Statistic Hook + Kubernetes
```
67% of Kubernetes clusters are misconfigured in production.

The issue? Most teams focus on deployment but overlook resource limits 
and requests. These settings control how the scheduler allocates pods 
across nodes. Without proper configuration, you get cascading failures 
during traffic spikes.

Here's what actually matters:
🔍 Requests define minimum guaranteed resources
⚡ Limits cap maximum usage - balance cost vs performance
🎯 Use Vertical Pod Autoscaler to discover optimal values
🛡️ Always set memory limits - OOM kills are harder to debug
💡 Start with conservative requests, tune based on P95 metrics

Proper resource management is the difference between stable and chaotic.
```

## Troubleshooting

### Posts Look Similar
- Verify OpenAI is working: `opencode run --model gpt-4o "test"`
- Run test suite to see AI-generated variety: `node script/test-dynamic-linkedin-posts.js`
- Check hook patterns are configured: `grep "HOOK_PATTERNS" script/ai/prompts/templates/linkedin-story.js`

### Not Enough Technical Detail
- Update the excerpt to include more context
- Check the channel is set correctly (affects trending detection)
- Review the AI prompt template in `script/ai/prompts/templates/linkedin-story.js`

### URL Validation Fails
- Ensure the blog post URL is accessible
- Check for typos in the URL
- Verify the site is not blocking the LinkedIn bot user agent

## Testing

```bash
# Test with AI generation (requires opencode)
node script/test-dynamic-linkedin-posts.js

# Test variety with AI
node script/demo-linkedin-variety.js

# Test specific post without publishing
DRY_RUN=true POST_TITLE="Test" POST_URL="https://example.com" \
  node script/publish-to-linkedin.js
```

## Files to Know

- `script/ai/prompts/templates/linkedin-story.js` - AI prompt with hook patterns
- `script/ai/graphs/linkedin-graph.js` - Post generation pipeline
- `script/publish-to-linkedin.js` - Publishing script
- `script/test-dynamic-linkedin-posts.js` - Test suite

## Need Help?

See full documentation: `docs/LINKEDIN_POST_IMPROVEMENTS.md`
