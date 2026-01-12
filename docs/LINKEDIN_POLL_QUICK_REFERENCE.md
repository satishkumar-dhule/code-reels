# LinkedIn Poll Quick Reference

Quick commands and tips for posting questions as LinkedIn polls.

## 🚀 Quick Commands

```bash
# Test without posting
npm run linkedin:poll:dry

# Post random question
npm run linkedin:poll

# Post specific question
QUESTION_ID=q-123 npm run linkedin:poll

# Filter by channel
CHANNEL=JavaScript npm run linkedin:poll

# Filter by difficulty
DIFFICULTY=intermediate npm run linkedin:poll

# Custom poll duration (48 hours)
POLL_DURATION=48 npm run linkedin:poll

# Combine filters
CHANNEL=Python DIFFICULTY=beginner POLL_DURATION=72 npm run linkedin:poll
```

## 📋 Required Secrets

Add to GitHub: `Settings → Secrets → Actions`

| Secret Name | Description | Example |
|------------|-------------|---------|
| `LINKEDIN_ACCESS_TOKEN` | OAuth 2.0 access token | `AQV...` |
| `LINKEDIN_PERSON_URN` | Your LinkedIn person URN | `urn:li:person:XXXXXXXX` |

## 🎯 Question Format

### ✅ Valid (Multiple Choice)
```
Question: What is the time complexity?

Answer:
A) O(n)
B) O(log n)
C) O(n log n)
D) O(1)
```

### ❌ Invalid (No Options)
```
Question: Explain binary search.

Answer: Binary search is an algorithm...
```

## ⚙️ Workflow Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `question_id` | `q-123` or empty | Random | Specific question to post |
| `channel` | `JavaScript`, `Python`, etc. | Any | Filter by channel |
| `difficulty` | `beginner`, `intermediate`, `advanced` | Any | Filter by difficulty |
| `poll_duration` | `1-168` | `24` | Poll duration in hours |
| `dry_run` | `true`, `false` | `false` | Test without posting |

## 🕐 Schedule

Default: Daily at 10:00 AM UTC

To change, edit `.github/workflows/linkedin-poll.yml`:
```yaml
schedule:
  - cron: '0 10 * * *'  # 10 AM UTC
```

Common schedules:
- `0 9 * * *` - 9 AM UTC daily
- `0 9,17 * * *` - 9 AM and 5 PM UTC daily
- `0 10 * * 1-5` - 10 AM UTC weekdays only

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| "LINKEDIN_ACCESS_TOKEN is required" | Add secret to GitHub |
| "No questions found" | Check database, remove filters |
| "Not suitable for poll" | Question needs multiple choice options |
| "LinkedIn API error (401)" | Token expired, get new token |
| "LinkedIn API error (403)" | Request "Share on LinkedIn" access |

## 📊 Poll Limits

| Limit | Value |
|-------|-------|
| Question length | 140 characters |
| Options | 2-4 |
| Duration | 1-168 hours (1 week) |
| Option length | ~30 characters recommended |

## 🎨 Customization

### Change Poll Text
Edit `script/post-linkedin-poll.js`:
```javascript
const intro = `🎯 Quick Tech Quiz!\n\n${pollQuestion}\n\n💡 Test your knowledge!\n\n#TechInterview`;
```

### Change Hashtags
```javascript
#TechInterview #${question.channel} #CodingInterview
```

### Track Posted Questions
Add to database:
```sql
ALTER TABLE questions ADD COLUMN posted_as_poll INTEGER DEFAULT 0;
```

## 📚 Documentation

- [Setup Guide](./LINKEDIN_POLL_SETUP.md) - Initial setup
- [Full Documentation](./LINKEDIN_POLL_WORKFLOW.md) - Complete guide
- [Example](./LINKEDIN_POLL_EXAMPLE.md) - Working example

## 🔗 Useful Links

- [LinkedIn Developers](https://www.linkedin.com/developers/)
- [OAuth 2.0 Guide](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [API Documentation](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api)

## 💡 Tips

1. **Test First:** Always use dry run before posting
2. **Check Format:** Ensure questions have multiple choice options
3. **Timing:** Post during business hours for max engagement
4. **Frequency:** Once per day is optimal
5. **Respond:** Engage with comments on your polls
6. **Track:** Monitor which topics get most engagement
7. **Rotate:** Mix channels and difficulty levels
8. **Update:** Refresh access token every 60 days

## 🆘 Quick Help

```bash
# Check if question is suitable
node script/post-linkedin-poll.js --dry-run

# View workflow logs
# GitHub → Actions → LinkedIn Poll Publisher → Latest run

# Test database connection
node -e "import('./script/utils.js').then(m => m.dbClient.execute('SELECT COUNT(*) FROM questions').then(r => console.log('Questions:', r.rows[0])))"

# Check question format
node -e "import('./script/utils.js').then(m => m.dbClient.execute({sql: 'SELECT * FROM questions WHERE id = ?', args: ['q-123']}).then(r => console.log(r.rows[0])))"
```

## 📞 Support

1. Check workflow logs in GitHub Actions
2. Test locally with dry run mode
3. Verify secrets are configured
4. Review question format
5. Check LinkedIn API status
