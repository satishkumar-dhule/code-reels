# Blog Quality Gates - Quick Reference

## ✅ Quality Checklist

Before a blog is published, it must pass ALL these checks:

### Structure ✓
- [ ] 3-8 sections
- [ ] Each section 150-2000 characters
- [ ] Introduction 100-600 characters
- [ ] Conclusion 100-500 characters

### Readability ✓
- [ ] Average sentence length 10-25 words
- [ ] Max 3 consecutive long sentences
- [ ] Zero first-person words (I, my, me, we)

### Coherence ✓
- [ ] At least 5 transition words (however, therefore, moreover...)
- [ ] Topic keywords appear 1-5% of the time
- [ ] Introduction mentions main topic
- [ ] Conclusion ties back to main topic

### Technical Depth ✓
- [ ] Real-world example with company name
- [ ] Diagram included (50+ characters)
- [ ] At least 1 glossary term
- [ ] At least 3 quick reference items

### Sources ✓
- [ ] Minimum 8 valid sources
- [ ] 85%+ sources return 200 OK
- [ ] At least 5 inline citations [1], [2]
- [ ] Citations distributed across sections

## 🎯 Minimum Scores

| Dimension | Minimum Score |
|-----------|---------------|
| Overall | 70/100 |
| Structure | 60/100 |
| Readability | 60/100 |
| Coherence | 60/100 |
| Technical | 70/100 |

## 🚫 Common Failures

### 1. First-Person Usage
❌ "I think microservices are great"
✅ "Microservices offer several advantages"

### 2. Missing Transitions
❌ Section ends. New section starts.
✅ "Building on this concept, the next challenge is..."

### 3. Weak Citations
❌ "Netflix uses microservices."
✅ "Netflix uses microservices [1] to handle 200M users [2]."

### 4. Generic Examples
❌ "Companies use this approach."
✅ "Netflix reduced latency by 40% using this approach [1]."

### 5. Dead Links
❌ https://company-blog.com/post-from-2015
✅ https://en.wikipedia.org/wiki/Microservices

## 📊 Score Calculation

```
Overall Score = (Structure + Readability + Coherence + Technical) / 4

Each dimension starts at 100 and loses points for issues:
- Critical issue: -20 points
- Major issue: -15 points
- Minor issue: -10 points
- Warning: -5 points
```

## 🔧 Quick Fixes

| Issue | Fix |
|-------|-----|
| Too few sections | Break content into logical chunks |
| Long sentences | Split at commas or conjunctions |
| First-person | Replace "I/we" with "you/developers" |
| No transitions | Add "however", "therefore", "moreover" |
| Missing citations | Add [1], [2] after facts |
| Dead sources | Use Wikipedia, GitHub, official docs |
| No real example | Find company case study with metrics |
| Missing diagram | Add Mermaid flowchart/sequence diagram |

## 🧪 Test Your Content

```bash
node script/test-blog-quality-gates.js
```

## 📈 Interpreting Results

### Score 90-100: Excellent ⭐⭐⭐⭐⭐
Ready to publish. Minor improvements possible.

### Score 70-89: Good ⭐⭐⭐⭐
Passes quality gates. Consider addressing warnings.

### Score 50-69: Needs Work ⭐⭐⭐
Fails quality gates. Review issues and revise.

### Score 0-49: Poor ⭐⭐
Major issues. Significant revision needed.

## 🎓 Best Practices

1. **Start with Structure**: Outline sections before writing
2. **Write Objectively**: Avoid "I", "my", "we" throughout
3. **Connect Ideas**: Use transitions between paragraphs
4. **Show Examples**: Real companies, real numbers
5. **Cite Sources**: Back every claim with [1], [2]
6. **Use Stable URLs**: Wikipedia > Company blogs
7. **Add Visuals**: Diagrams make concepts clear
8. **Define Terms**: Glossary for technical jargon

## 🔍 Validation Output

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

## 📞 Need Help?

See full documentation: `docs/BLOG_QUALITY_GATES.md`
