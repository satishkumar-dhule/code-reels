# Blog Quality Gates

## Overview

The blog generation system now includes comprehensive quality gates to ensure all generated content is logical, coherent, and high-quality. These gates validate multiple aspects of the content before it's published.

**Blog Generation Scope**: Blogs are only generated for the following channels:

**Infrastructure & Platform:**
- **SRE** (Site Reliability Engineering)
- **DevOps** (Development Operations)
- **Kubernetes** (Container orchestration)
- **AWS** (Amazon Web Services)
- **Terraform** (Infrastructure as Code)
- **Docker** (Containerization)
- **Linux** (Linux systems)
- **Unix** (Unix systems)

**AI & Machine Learning:**
- **Generative AI** (GenAI applications)
- **LLM Ops** (Large Language Model Operations)
- **Machine Learning** (ML engineering)
- **Prompt Engineering** (Prompt design)

This focused approach ensures deep, high-quality content in these critical production domains.

## Quality Dimensions

### 1. Structure Validation (Weight: 25%)

Ensures the blog has proper organization and appropriate length:

- **Section Count**: 3-8 sections required
- **Section Length**: 150-2000 characters per section
- **Introduction**: 100-600 characters
- **Conclusion**: 100-500 characters

**Why it matters**: Proper structure makes content scannable and digestible. Too few sections means shallow coverage; too many means unfocused content.

### 2. Readability Validation (Weight: 25%)

Checks if the content is easy to read and understand:

- **Average Sentence Length**: 10-25 words
- **Consecutive Long Sentences**: Max 3 in a row
- **First-Person Usage**: Zero tolerance for "I", "my", "me", "we" (as author)

**Why it matters**: Technical content should be accessible. Long, complex sentences and first-person narrative reduce professionalism and clarity.

### 3. Coherence Validation (Weight: 25%)

Validates logical flow and topic consistency:

- **Transition Words**: Minimum 5 (however, therefore, moreover, etc.)
- **Keyword Density**: 1-5% of content should be topic keywords
- **Topic Consistency**: Introduction and conclusion must mention main topic
- **Logical Flow**: Sections should connect to each other

**Why it matters**: Coherent content tells a story. Without transitions and consistent themes, blogs feel like disconnected facts.

### 4. Technical Accuracy (Weight: 25%)

Ensures technical depth and credibility:

- **Real-World Example**: Must include company name, scenario, and lesson
- **Diagram**: Required, minimum 50 characters
- **Glossary**: At least 1 term defined
- **Quick Reference**: Minimum 3 key takeaways

**Why it matters**: Technical blogs need concrete examples and visual aids. Abstract theory without real-world grounding isn't useful.

### 5. Source Quality (Critical Gate)

Validates citations and references:

- **Minimum Sources**: 8 valid, working URLs
- **Valid Source Percentage**: 85% of sources must return 200 OK
- **Inline Citations**: Minimum 5 throughout content
- **Citation Density**: ~1 citation per 500 characters
- **Citation Distribution**: Max 30% of sections can lack citations

**Why it matters**: Credibility comes from sources. Dead links and missing citations undermine trust.

## Quality Thresholds

```javascript
{
  minOverallScore: 70,      // Must score 70/100 overall
  minCoherenceScore: 60,    // Coherence must be 60+
  minReadabilityScore: 60,  // Readability must be 60+
  minTechnicalScore: 70,    // Technical depth must be 70+
  minSources: 8,            // At least 8 valid sources
  minInlineCitations: 5     // At least 5 inline citations
}
```

## Validation Flow

```
Blog Generation
    ↓
Generate Content
    ↓
Validate Citations
    ↓
🚦 QUALITY GATES 🚦
    ├─ Structure Check
    ├─ Readability Check
    ├─ Coherence Check
    ├─ Technical Check
    └─ Source Validation
    ↓
Pass? → Generate Images → Publish
Fail? → Reject with detailed feedback
```

## Common Failure Reasons

### 1. Poor Coherence (Most Common)
- **Issue**: Sections don't flow logically
- **Fix**: Add transition words, connect ideas between sections
- **Example**: "Building on this concept..." or "However, there's a catch..."

### 2. Insufficient Sources
- **Issue**: Less than 8 valid sources or too many 404s
- **Fix**: Use stable URLs (Wikipedia, GitHub, official docs)
- **Avoid**: Company blog URLs that frequently change

### 3. Missing Citations
- **Issue**: Facts stated without inline citations [1], [2]
- **Fix**: Add [1], [2] references after claims
- **Example**: "Netflix handles 200M users [1] using microservices [2]"

### 4. First-Person Usage
- **Issue**: Using "I", "my", "we" in content
- **Fix**: Use "you", "developers", "teams" instead
- **Example**: ❌ "I think microservices are..." → ✅ "Microservices are..."

### 5. Weak Real-World Example
- **Issue**: Generic or missing company case study
- **Fix**: Include specific company, scenario, and measurable outcome
- **Example**: "Netflix reduced latency by 40% after migrating to microservices"

## Testing Quality Gates

Run the test script to see quality gates in action:

```bash
node script/test-blog-quality-gates.js
```

This will validate both good and poor content examples, showing:
- Individual dimension scores
- Overall pass/fail status
- Specific issues found
- Comparison metrics

## Integration

Quality gates are automatically run in the blog generation pipeline:

```javascript
import { validateBlogQuality } from './ai/services/blog-quality-gates.js';

const results = await validateBlogQuality(blogContent, {
  question: "How do you scale microservices?",
  channel: "system-design",
  tags: ["microservices", "scalability"]
});

if (!results.passed) {
  console.log('Quality issues:', results.issues);
  // Reject or retry generation
}
```

## Metrics Dashboard

After validation, you'll see:

```
📊 Quality Scores:
   Overall: 85.3/100 ✅
   Structure: 90/100
   Readability: 85/100
   Coherence: 80/100
   Technical: 86/100
   Sources: 9/9 valid
   Citations: 12 inline

✅ PASSED - Ready to publish
```

## Continuous Improvement

The quality gates are designed to evolve. Current focus areas:

1. **Logical Flow Detection**: Analyzing section-to-section transitions
2. **Technical Depth Scoring**: Measuring code examples and diagrams
3. **Engagement Metrics**: Predicting reader engagement
4. **Duplicate Detection**: Ensuring content uniqueness

## Configuration

Thresholds can be adjusted in `script/ai/services/blog-quality-gates.js`:

```javascript
const QUALITY_THRESHOLDS = {
  minSections: 3,
  minSources: 8,
  minInlineCitations: 5,
  minOverallScore: 70,
  // ... more thresholds
};
```

## Best Practices

1. **Write for Humans**: Quality gates enforce readability, not just correctness
2. **Show, Don't Tell**: Real examples score higher than abstract theory
3. **Connect Ideas**: Use transitions to create narrative flow
4. **Cite Everything**: Back claims with sources
5. **Stay Objective**: Avoid first-person, maintain professional tone

## Troubleshooting

### "Too few transition words"
Add connecting phrases between paragraphs and sections.

### "Keyword density too low"
Ensure the main topic is mentioned throughout, not just in the intro.

### "First-person violations"
Search for "I", "my", "me", "we" and rephrase objectively.

### "Insufficient valid sources"
Use stable URLs from Wikipedia, GitHub, official docs, not blog posts.

### "Missing inline citations"
Add [1], [2] references after factual claims throughout the content.

## Impact

Since implementing quality gates:
- ✅ Coherence improved by ensuring logical flow
- ✅ Credibility increased with proper citations
- ✅ Readability enhanced with sentence length limits
- ✅ Technical depth maintained with required examples
- ✅ Source quality improved with URL validation

The gates ensure every published blog meets professional standards.
