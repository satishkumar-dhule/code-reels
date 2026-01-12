# LinkedIn Poll Workflow

Automated workflow to post questions from your database as LinkedIn polls.

## Overview

This workflow fetches questions from your test database and posts them as interactive LinkedIn polls. It's perfect for:
- Engaging your LinkedIn audience with technical questions
- Testing knowledge in your network
- Driving traffic to your platform
- Building brand awareness

## Features

- ✅ Automatic question selection from database
- ✅ Filter by channel, difficulty, or specific question ID
- ✅ Configurable poll duration (1-168 hours)
- ✅ Dry run mode for testing
- ✅ Scheduled daily posting
- ✅ Manual trigger with custom parameters

## Setup

### 1. LinkedIn API Credentials

You need to obtain LinkedIn API credentials:

1. **Create a LinkedIn App**
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
   - Create a new app
   - Request access to the "Share on LinkedIn" product
   - Add the `w_member_social` permission

2. **Get Access Token**
   - Use OAuth 2.0 to get an access token
   - The token should have `w_member_social` scope
   - Store it as a GitHub secret: `LINKEDIN_ACCESS_TOKEN`

3. **Get Person URN**
   - Your LinkedIn person URN format: `urn:li:person:XXXXXXXX`
   - You can find this by making a test API call to `/v2/me`
   - Store it as a GitHub secret: `LINKEDIN_PERSON_URN`

### 2. GitHub Secrets

Add these secrets to your repository:

```
Settings → Secrets and variables → Actions → New repository secret
```

Required secrets:
- `LINKEDIN_ACCESS_TOKEN` - Your LinkedIn OAuth access token
- `LINKEDIN_PERSON_URN` - Your LinkedIn person URN
- `TURSO_DATABASE_URL` - Your database URL (should already exist)
- `TURSO_AUTH_TOKEN` - Your database auth token (should already exist)

### 3. Question Format

For a question to be posted as a poll, it must have multiple choice options in the answer field:

**Supported formats:**

```
A) Option 1
B) Option 2
C) Option 3
D) Option 4
```

or

```
1. Option 1
2. Option 2
3. Option 3
4. Option 4
```

The workflow will automatically extract these options and create a LinkedIn poll.

## Usage

### Automatic (Scheduled)

The workflow runs automatically every day at 10:00 AM UTC. It will:
1. Select a random question from the database
2. Format it as a LinkedIn poll
3. Post it to your LinkedIn profile

### Manual Trigger

You can manually trigger the workflow with custom parameters:

1. Go to **Actions** → **LinkedIn Poll Publisher**
2. Click **Run workflow**
3. Configure options:
   - **Question ID**: Specific question to post (leave empty for random)
   - **Channel**: Filter by channel (e.g., "JavaScript", "Python")
   - **Difficulty**: Filter by difficulty (beginner/intermediate/advanced)
   - **Poll Duration**: How long the poll stays open (1-168 hours, default 24)
   - **Dry Run**: Test without actually posting

### Command Line (Local Testing)

Test the script locally:

```bash
# Test with dry run
DRY_RUN=true node script/post-linkedin-poll.js

# Post a random question
node script/post-linkedin-poll.js

# Post a specific question
QUESTION_ID=q-123 node script/post-linkedin-poll.js

# Filter by channel
CHANNEL=JavaScript node script/post-linkedin-poll.js

# Filter by difficulty
DIFFICULTY=intermediate node script/post-linkedin-poll.js

# Custom poll duration (48 hours)
POLL_DURATION=48 node script/post-linkedin-poll.js
```

## Poll Format

The workflow creates engaging polls with this format:

```
🎯 Quick Tech Quiz!

[Your question text]

💡 Test your knowledge and see how you compare with others!

#TechInterview #[Channel] #CodingInterview
```

The poll will include 2-4 options extracted from the answer field.

## Monitoring

### GitHub Actions

Check the workflow status:
1. Go to **Actions** → **LinkedIn Poll Publisher**
2. View recent runs and their status
3. Check the summary for details about posted polls

### LinkedIn

Monitor poll performance:
1. Check your LinkedIn profile for the posted poll
2. View engagement metrics (votes, comments, shares)
3. Respond to comments to increase engagement

## Troubleshooting

### "No questions found matching criteria"

- Check that your database has questions with the specified filters
- Verify questions have `status = "active"`
- Try removing filters (channel, difficulty)

### "Question is not suitable for a poll"

- The question doesn't have multiple choice options in the answer
- Add options in format: `A) Option 1\nB) Option 2\n...`
- Or select a different question

### "LinkedIn API error"

- Check that your access token is valid and not expired
- Verify the token has `w_member_social` permission
- Ensure your LinkedIn app is approved for posting

### "LINKEDIN_ACCESS_TOKEN is required"

- Add the secret to GitHub repository settings
- Make sure the secret name matches exactly
- Re-run the workflow after adding the secret

## Best Practices

1. **Question Selection**
   - Use questions with clear, concise options
   - Avoid overly complex or lengthy questions
   - Test questions in dry run mode first

2. **Posting Schedule**
   - Post during business hours for maximum engagement
   - Adjust the cron schedule to your audience's timezone
   - Don't post too frequently (once per day is good)

3. **Engagement**
   - Respond to comments on your polls
   - Share the correct answer after the poll closes
   - Link to your platform for more questions

4. **Content Mix**
   - Rotate between different channels
   - Mix difficulty levels
   - Use trending topics when relevant

## Advanced Configuration

### Custom Posting Schedule

Edit `.github/workflows/linkedin-poll.yml`:

```yaml
on:
  schedule:
    # Post twice daily at 9 AM and 5 PM UTC
    - cron: '0 9 * * *'
    - cron: '0 17 * * *'
```

### Filter by Multiple Criteria

Modify the script to add more filters:

```javascript
// In script/post-linkedin-poll.js
if (tags) {
  sql += ' AND tags LIKE ?';
  args.push(`%${tags}%`);
}
```

### Track Posted Questions

Add a column to track posted questions:

```sql
ALTER TABLE questions ADD COLUMN posted_as_poll INTEGER DEFAULT 0;
```

Then update the script to mark questions as posted and avoid duplicates.

## Related Workflows

- **Content Pipeline** (`.github/workflows/content-pipeline.yml`) - Generates new questions
- **Hourly Generator** (`.github/workflows/hourly-generator.yml`) - Adds questions to database
- **Duplicate Check** (`.github/workflows/duplicate-check.yml`) - Ensures quality

## Support

For issues or questions:
1. Check the workflow logs in GitHub Actions
2. Review the script output for error messages
3. Test locally with dry run mode
4. Verify all secrets are configured correctly

## License

This workflow is part of your project and follows the same license.
