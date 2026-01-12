# LinkedIn Poll Setup Guide

Quick setup guide for posting questions from your database as LinkedIn polls.

## 🚀 Quick Start

### 1. Get LinkedIn API Credentials

#### Step 1: Create LinkedIn App
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in app details:
   - App name: "Your App Name"
   - LinkedIn Page: Select your company page
   - App logo: Upload a logo
4. Click "Create app"

#### Step 2: Request API Access
1. In your app, go to "Products" tab
2. Request access to "Share on LinkedIn" product
3. Wait for approval (usually instant for personal use)

#### Step 3: Get Access Token
1. Go to "Auth" tab
2. Note your Client ID and Client Secret
3. Add redirect URL: `http://localhost:3000/auth/linkedin/callback`
4. Use OAuth 2.0 flow to get access token with `w_member_social` scope

**Quick OAuth Flow:**
```bash
# Step 1: Get authorization code
# Visit this URL in browser (replace CLIENT_ID):
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/auth/linkedin/callback&scope=w_member_social

# Step 2: Exchange code for token
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/auth/linkedin/callback"
```

#### Step 4: Get Person URN
```bash
# Use your access token to get your person URN
curl -X GET https://api.linkedin.com/v2/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Response will include: "id": "XXXXXXXX"
# Your URN is: urn:li:person:XXXXXXXX
```

### 2. Add GitHub Secrets

Go to your repository:
```
Settings → Secrets and variables → Actions → New repository secret
```

Add these secrets:
- **Name:** `LINKEDIN_ACCESS_TOKEN`  
  **Value:** Your OAuth access token from Step 3

- **Name:** `LINKEDIN_PERSON_URN`  
  **Value:** `urn:li:person:XXXXXXXX` from Step 4

### 3. Test Locally

```bash
# Set environment variables
export LINKEDIN_ACCESS_TOKEN="your_token"
export LINKEDIN_PERSON_URN="urn:li:person:XXXXXXXX"

# Test with dry run (doesn't post)
npm run linkedin:poll:dry

# Post a real poll
npm run linkedin:poll
```

### 4. Run Workflow

#### Manual Trigger
1. Go to **Actions** → **LinkedIn Poll Publisher**
2. Click **Run workflow**
3. Configure options and click **Run workflow**

#### Automatic (Daily)
The workflow runs automatically every day at 10:00 AM UTC.

## 📋 Question Format Requirements

For a question to work as a poll, it must have multiple choice options:

### ✅ Valid Format

```
Question: What is the time complexity of binary search?

Answer:
A) O(n)
B) O(log n)
C) O(n log n)
D) O(1)
```

or

```
Question: Which HTTP method is idempotent?

Answer:
1. POST
2. GET
3. PATCH
4. All of the above
```

### ❌ Invalid Format

```
Question: Explain binary search.

Answer: Binary search is an algorithm that finds the position of a target value...
```

## 🎯 Usage Examples

### Post Random Question
```bash
npm run linkedin:poll
```

### Post Specific Question
```bash
QUESTION_ID=q-123 npm run linkedin:poll
```

### Filter by Channel
```bash
CHANNEL=JavaScript npm run linkedin:poll
```

### Filter by Difficulty
```bash
DIFFICULTY=intermediate npm run linkedin:poll
```

### Custom Poll Duration (48 hours)
```bash
POLL_DURATION=48 npm run linkedin:poll
```

### Test Without Posting
```bash
npm run linkedin:poll:dry
```

## 🔧 Troubleshooting

### Error: "LINKEDIN_ACCESS_TOKEN is required"
- Add the secret to GitHub repository settings
- For local testing, set environment variable

### Error: "No questions found matching criteria"
- Check your database has active questions
- Remove filters (channel, difficulty)
- Verify database connection

### Error: "Question is not suitable for a poll"
- Question doesn't have multiple choice options
- Update question format or select different question

### Error: "LinkedIn API error (401)"
- Access token expired (LinkedIn tokens expire after 60 days)
- Get a new access token using OAuth flow
- Update GitHub secret

### Error: "LinkedIn API error (403)"
- App doesn't have "Share on LinkedIn" product access
- Request access in LinkedIn Developer Portal
- Wait for approval

## 📊 Monitoring

### Check Workflow Status
1. Go to **Actions** → **LinkedIn Poll Publisher**
2. View recent runs
3. Check logs for details

### View Posted Polls
1. Visit your LinkedIn profile
2. Check recent posts
3. Monitor engagement (votes, comments)

## 🎨 Customization

### Change Posting Schedule

Edit `.github/workflows/linkedin-poll.yml`:

```yaml
on:
  schedule:
    # Post at 9 AM and 5 PM UTC
    - cron: '0 9 * * *'
    - cron: '0 17 * * *'
```

### Customize Poll Text

Edit `script/post-linkedin-poll.js`:

```javascript
const intro = `🎯 Quick Tech Quiz!\n\n${pollQuestion}\n\n💡 Test your knowledge!\n\n#TechInterview`;
```

### Add Question Tracking

Track which questions have been posted:

```sql
-- Add column to questions table
ALTER TABLE questions ADD COLUMN posted_as_poll INTEGER DEFAULT 0;
ALTER TABLE questions ADD COLUMN posted_at TEXT;
```

Then update the script to mark questions and avoid duplicates.

## 📚 Related Documentation

- [LinkedIn Poll Workflow](./LINKEDIN_POLL_WORKFLOW.md) - Detailed workflow documentation
- [Content Pipeline](./CONTENT_QUALITY_SYSTEM.md) - Question generation system
- [Duplicate Prevention](./DUPLICATE_PREVENTION.md) - Quality control

## 🆘 Support

If you encounter issues:
1. Check workflow logs in GitHub Actions
2. Test locally with dry run mode
3. Verify all secrets are configured
4. Check LinkedIn API status

## 📝 Notes

- LinkedIn access tokens expire after 60 days
- Polls can run for 1-168 hours (1 week max)
- Maximum 4 poll options
- Poll question limited to 140 characters
- You can only post to your own profile (not company pages with this setup)

## 🔐 Security

- Never commit access tokens to git
- Use GitHub Secrets for sensitive data
- Rotate tokens regularly
- Use read-only database credentials when possible
