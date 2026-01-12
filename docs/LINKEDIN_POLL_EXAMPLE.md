# LinkedIn Poll Example

This document shows a complete example of how the LinkedIn Poll workflow works.

## Example Question from Database

```json
{
  "id": "q-123",
  "question": "What is the time complexity of binary search?",
  "answer": "A) O(n)\nB) O(log n)\nC) O(n log n)\nD) O(1)",
  "explanation": "Binary search has O(log n) time complexity because it divides the search space in half with each iteration.",
  "difficulty": "intermediate",
  "channel": "Algorithms",
  "subChannel": "Search Algorithms",
  "status": "active"
}
```

## How It Gets Posted

### 1. Script Fetches Question
```bash
$ npm run linkedin:poll:dry

🔍 Fetching question from database...
   ✅ Found question: q-123
   Channel: Algorithms
   Difficulty: intermediate
   Question: What is the time complexity of binary search?
```

### 2. Script Extracts Poll Options
```bash
📋 Poll content:
──────────────────────────────────────────────────
🎯 Quick Tech Quiz!

What is the time complexity of binary search?

💡 Test your knowledge and see how you compare with others!

#TechInterview #Algorithms #CodingInterview
──────────────────────────────────────────────────
Question: What is the time complexity of binary search?
Options:
  1. O(n)
  2. O(log n)
  3. O(n log n)
  4. O(1)
──────────────────────────────────────────────────
```

### 3. Script Posts to LinkedIn

The poll appears on LinkedIn as:

```
┌─────────────────────────────────────────────────┐
│ Your Name                                       │
│ Your Title • 2h                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🎯 Quick Tech Quiz!                            │
│                                                 │
│ What is the time complexity of binary search?  │
│                                                 │
│ 💡 Test your knowledge and see how you         │
│ compare with others!                            │
│                                                 │
│ #TechInterview #Algorithms #CodingInterview    │
│                                                 │
├─────────────────────────────────────────────────┤
│ Poll • 24 hours left                            │
│                                                 │
│ ○ O(n)                                    15%   │
│ ● O(log n)                                65%   │
│ ○ O(n log n)                              12%   │
│ ○ O(1)                                     8%   │
│                                                 │
│ 127 votes                                       │
├─────────────────────────────────────────────────┤
│ 👍 Like  💬 Comment  🔄 Repost  📤 Send        │
└─────────────────────────────────────────────────┘
```

## Workflow Execution

### GitHub Actions Output

```yaml
📊 LinkedIn Poll Publisher

Question ID: Random
Channel: Any
Difficulty: Any
Poll Duration: 24 hours
Dry Run: false
──────────────────────────────────────────────────

✅ Environment validation passed

🔍 Fetching question from database...
   ✅ Found question: q-123
   Channel: Algorithms
   Difficulty: intermediate
   Question: What is the time complexity of binary search?

📋 Poll content:
──────────────────────────────────────────────────
🎯 Quick Tech Quiz!

What is the time complexity of binary search?

💡 Test your knowledge and see how you compare with others!

#TechInterview #Algorithms #CodingInterview
──────────────────────────────────────────────────
Question: What is the time complexity of binary search?
Options:
  1. O(n)
  2. O(log n)
  3. O(n log n)
  4. O(1)
──────────────────────────────────────────────────

📤 Publishing poll to LinkedIn...

✅ Successfully published poll to LinkedIn!
   Post ID: urn:li:share:1234567890
   📝 Question q-123 shared as poll urn:li:share:1234567890

════════════════════════════════════════════════════
🎉 Done!
════════════════════════════════════════════════════
```

## Manual Trigger with Filters

### Example 1: Post JavaScript Question

```bash
# In GitHub Actions UI
Question ID: [leave empty]
Channel: JavaScript
Difficulty: intermediate
Poll Duration: 24
Dry Run: false
```

Result: Posts a random intermediate JavaScript question

### Example 2: Post Specific Question

```bash
# In GitHub Actions UI
Question ID: q-456
Channel: [leave empty]
Difficulty: [leave empty]
Poll Duration: 48
Dry Run: false
```

Result: Posts question q-456 with 48-hour poll duration

### Example 3: Test Without Posting

```bash
# In GitHub Actions UI
Question ID: [leave empty]
Channel: Python
Difficulty: beginner
Poll Duration: 24
Dry Run: true
```

Result: Shows what would be posted but doesn't actually post

## Local Testing

### Test with Dry Run

```bash
$ export LINKEDIN_ACCESS_TOKEN="your_token"
$ export LINKEDIN_PERSON_URN="urn:li:person:XXXXXXXX"
$ npm run linkedin:poll:dry

🔍 Fetching question from database...
   ✅ Found question: q-789
   Channel: System Design
   Difficulty: advanced

📋 Poll content:
──────────────────────────────────────────────────
🎯 Quick Tech Quiz!

Which pattern is best for handling high traffic?

💡 Test your knowledge and see how you compare with others!

#TechInterview #SystemDesign #CodingInterview
──────────────────────────────────────────────────
Question: Which pattern is best for handling high traffic?
Options:
  1. Load Balancing
  2. Caching
  3. Database Sharding
  4. All of the above
──────────────────────────────────────────────────

🏃 DRY RUN - Skipping actual publish

✅ Dry run complete
```

### Post Real Poll

```bash
$ npm run linkedin:poll

# Same output as above, but actually posts to LinkedIn
✅ Successfully published poll to LinkedIn!
   Post ID: urn:li:share:9876543210
```

## Scheduled Execution

The workflow runs automatically every day at 10:00 AM UTC:

```
Day 1 - 10:00 AM UTC: Posts random question
Day 2 - 10:00 AM UTC: Posts random question
Day 3 - 10:00 AM UTC: Posts random question
...
```

Each day, it:
1. Selects a random active question from database
2. Checks if it has multiple choice options
3. Formats it as a LinkedIn poll
4. Posts to your LinkedIn profile
5. Logs the result

## Error Handling Examples

### Error: No Multiple Choice Options

```bash
❌ Failed to format poll: Question does not have valid multiple choice options
   This question is not suitable for a poll (no multiple choice options)
```

**Solution:** Select a different question or update the question format

### Error: Invalid Credentials

```bash
❌ Environment validation failed:
   - LINKEDIN_ACCESS_TOKEN is required
```

**Solution:** Add the secret to GitHub or set environment variable

### Error: API Rate Limit

```bash
❌ LinkedIn API error (429): Too Many Requests
```

**Solution:** Wait before posting again, or reduce posting frequency

## Best Practices

### 1. Question Selection
- Use questions with clear, concise options
- Avoid overly technical jargon in poll text
- Test questions in dry run mode first

### 2. Posting Schedule
- Post during business hours for maximum engagement
- Don't post too frequently (once per day is good)
- Adjust schedule to your audience's timezone

### 3. Engagement
- Respond to comments on your polls
- Share the correct answer after poll closes
- Link to your platform for more questions

### 4. Content Mix
- Rotate between different channels
- Mix difficulty levels
- Use trending topics when relevant

## Metrics to Track

After posting polls, monitor:
- **Votes:** How many people participated
- **Comments:** Discussion and engagement
- **Shares:** How many people shared your poll
- **Profile Views:** Increase in profile visibility
- **Follower Growth:** New followers from polls

## Next Steps

1. Set up LinkedIn API credentials
2. Add GitHub secrets
3. Test locally with dry run
4. Run manual workflow test
5. Enable scheduled posting
6. Monitor engagement and adjust strategy

## Resources

- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [OAuth 2.0 Guide](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [LinkedIn Poll Best Practices](https://www.linkedin.com/help/linkedin/answer/a522735)
