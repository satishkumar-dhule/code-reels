# 📊 LinkedIn Poll Publisher

Automatically post questions from your database as LinkedIn polls to engage your audience and drive traffic to your platform.

## 🎯 Overview

This feature allows you to:
- ✅ Post questions as interactive LinkedIn polls
- ✅ Schedule daily automated posting
- ✅ Filter by channel, difficulty, or specific questions
- ✅ Test with dry run mode before posting
- ✅ Track engagement and build your brand

## 🚀 Quick Start

### 1. Setup (5 minutes)

```bash
# Test your setup
npm run linkedin:poll:test

# If you see errors, follow the setup guide
# docs/LINKEDIN_POLL_SETUP.md
```

### 2. Test (1 minute)

```bash
# Test without posting to LinkedIn
npm run linkedin:poll:dry
```

### 3. Post (30 seconds)

```bash
# Post a random question as a poll
npm run linkedin:poll
```

That's it! 🎉

## 📚 Documentation

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [Setup Guide](./LINKEDIN_POLL_SETUP.md) | Initial configuration | First time setup |
| [Quick Reference](./LINKEDIN_POLL_QUICK_REFERENCE.md) | Commands and tips | Daily usage |
| [Full Documentation](./LINKEDIN_POLL_WORKFLOW.md) | Complete guide | Deep dive |
| [Examples](./LINKEDIN_POLL_EXAMPLE.md) | Working examples | Learning |

## 🎮 Usage

### Basic Commands

```bash
# Test setup
npm run linkedin:poll:test

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
```

### GitHub Actions

1. Go to **Actions** → **LinkedIn Poll Publisher**
2. Click **Run workflow**
3. Configure options and run

Or let it run automatically every day at 10 AM UTC.

## 📋 Requirements

### LinkedIn API
- OAuth 2.0 access token with `w_member_social` scope
- LinkedIn person URN

See [Setup Guide](./LINKEDIN_POLL_SETUP.md) for details.

### Question Format
Questions must have multiple choice options:

```
Question: What is the time complexity?

Answer:
A) O(n)
B) O(log n)
C) O(n log n)
D) O(1)
```

## 🎨 Example Output

Your poll will look like this on LinkedIn:

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
└─────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `LINKEDIN_ACCESS_TOKEN` | OAuth access token | `AQV...` |
| `LINKEDIN_PERSON_URN` | Your person URN | `urn:li:person:XXXXXXXX` |
| `QUESTION_ID` | Specific question | `q-123` |
| `CHANNEL` | Filter by channel | `JavaScript` |
| `DIFFICULTY` | Filter by difficulty | `intermediate` |
| `POLL_DURATION` | Duration in hours | `24` |
| `DRY_RUN` | Test mode | `true` |

### Schedule

Default: Daily at 10:00 AM UTC

Change in `.github/workflows/linkedin-poll.yml`:
```yaml
schedule:
  - cron: '0 10 * * *'
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Setup test fails | Run `npm run linkedin:poll:test` and follow instructions |
| No questions found | Check database has active questions |
| Not suitable for poll | Question needs multiple choice format |
| Token expired | Get new token (expires after 60 days) |
| API error | Check [Setup Guide](./LINKEDIN_POLL_SETUP.md) |

## 💡 Tips

1. **Test First:** Always use `npm run linkedin:poll:dry` before posting
2. **Check Format:** Ensure questions have multiple choice options
3. **Timing:** Post during business hours for max engagement
4. **Frequency:** Once per day is optimal
5. **Respond:** Engage with comments on your polls
6. **Track:** Monitor which topics get most engagement
7. **Rotate:** Mix channels and difficulty levels

## 📊 What Gets Posted

### Poll Content
- 🎯 Engaging intro text
- ❓ Your question (max 140 chars)
- 💡 Call to action
- 🏷️ Relevant hashtags

### Poll Options
- 2-4 multiple choice options
- Extracted automatically from answer
- Duration: 1-168 hours (configurable)

## 🎯 Benefits

### For You
- 📈 Increase LinkedIn engagement
- 🎯 Drive traffic to your platform
- 🏆 Build thought leadership
- 🤝 Grow your network
- 📊 Gather insights from your audience

### For Your Audience
- 🧠 Test their knowledge
- 📚 Learn new concepts
- 🎮 Engage with content
- 🏅 Compare with peers
- 💬 Discuss in comments

## 🔗 Integration

This feature integrates with:
- **Content Pipeline** - Generates questions
- **Hourly Generator** - Adds questions to database
- **Duplicate Check** - Ensures quality
- **Blog Generator** - Creates related content

## 📈 Metrics to Track

After posting polls, monitor:
- 📊 Vote count
- 💬 Comment count
- 🔄 Share count
- 👁️ Profile views
- 👥 Follower growth
- 🔗 Click-through rate

## 🚀 Next Steps

1. ✅ Run setup test: `npm run linkedin:poll:test`
2. ✅ Test with dry run: `npm run linkedin:poll:dry`
3. ✅ Post your first poll: `npm run linkedin:poll`
4. ✅ Enable scheduled posting in GitHub Actions
5. ✅ Monitor engagement and adjust strategy

## 📞 Support

Need help?
1. Run `npm run linkedin:poll:test` to diagnose issues
2. Check [Setup Guide](./LINKEDIN_POLL_SETUP.md)
3. Review [Quick Reference](./LINKEDIN_POLL_QUICK_REFERENCE.md)
4. See [Examples](./LINKEDIN_POLL_EXAMPLE.md)

## 📄 Files

```
script/
├── post-linkedin-poll.js          # Main script
└── test-linkedin-poll-setup.js    # Setup test

.github/workflows/
└── linkedin-poll.yml              # GitHub Actions workflow

docs/
├── LINKEDIN_POLL_README.md        # This file
├── LINKEDIN_POLL_SETUP.md         # Setup guide
├── LINKEDIN_POLL_WORKFLOW.md      # Full documentation
├── LINKEDIN_POLL_EXAMPLE.md       # Examples
└── LINKEDIN_POLL_QUICK_REFERENCE.md # Quick reference
```

## 🎉 Success!

You're now ready to engage your LinkedIn audience with automated tech polls!

**Happy posting! 🚀**

---

**Version:** 1.0.0  
**Last Updated:** January 12, 2026  
**Status:** ✅ Production Ready
