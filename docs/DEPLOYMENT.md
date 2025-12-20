# Deployment Guide

## Overview

Code Reels uses a staged deployment process with manual approval for production releases.

```
┌─────────┐     ┌─────────┐     ┌──────────────┐     ┌────────────┐
│  Push   │ ──▶ │  Tests  │ ──▶ │   Staging    │ ──▶ │ Production │
│ to main │     │  (E2E)  │     │ (Auto-deploy)│     │ (Approval) │
└─────────┘     └─────────┘     └──────────────┘     └────────────┘
```

## Environments

### Staging
- **URL:** https://stage-reel-interview.github.io
- **Repository:** `stage-reel-interview/stage-reel-interview.github.io`
- **Deployment:** Automatic after tests pass
- **Purpose:** Preview and validate changes before production

### Production
- **URL:** https://reel-interview.github.io
- **Repository:** `reel-interview/reel-interview.github.io`
- **Deployment:** Requires manual approval
- **Purpose:** Live site for end users

## Setup Instructions

### 1. Create the Staging Repository

1. Go to GitHub and create a new repository: `stage-reel-interview/stage-reel-interview.github.io`
2. Initialize with a README or leave empty
3. Enable GitHub Pages in repository settings:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root`

### 2. Configure GitHub Environments

In your main repository (`satishkumar-dhule/code-reels`):

1. Go to **Settings** → **Environments**

2. Create **staging** environment:
   - Click "New environment"
   - Name: `staging`
   - No protection rules needed (auto-deploy)

3. Create **production** environment:
   - Click "New environment"
   - Name: `production`
   - Enable **Required reviewers**
   - Add yourself or team members as reviewers
   - Optionally set **Wait timer** (e.g., 5 minutes)

### 3. Configure Secrets

Ensure these secrets are available at the repository level:

| Secret | Description |
|--------|-------------|
| `GH_TOKEN` | Personal Access Token with `repo` scope |
| `TURSO_DATABASE_URL_RO` | Turso read-only database URL |
| `TURSO_AUTH_TOKEN_RO` | Turso read-only auth token |
| `TURSO_DATABASE_URL` | Turso database URL (for write operations) |
| `TURSO_AUTH_TOKEN` | Turso auth token (for write operations) |

### 4. Grant Token Access

The `GH_TOKEN` needs access to push to both repositories:
- `stage-reel-interview/stage-reel-interview.github.io`
- `reel-interview/reel-interview.github.io`

If using a Fine-grained PAT, ensure it has:
- Repository access to both repos
- Permissions: Contents (Read and write)

## Deployment Workflow

### Automatic Flow

1. **Push to main** → Triggers workflow
2. **Tests run** → E2E tests with Playwright
3. **Deploy to staging** → Automatic if tests pass
4. **Review staging** → Verify changes at staging URL
5. **Approve production** → Click "Review deployments" in GitHub Actions
6. **Deploy to production** → Automatic after approval

### Manual Deployment

You can also trigger the workflow manually:

1. Go to **Actions** → **Deploy to GitHub Pages**
2. Click **Run workflow**
3. Select branch and click **Run workflow**

## Approving Production Deployment

When staging deployment completes:

1. Go to the workflow run in GitHub Actions
2. You'll see "Waiting for review" on the production job
3. Click **Review deployments**
4. Select the `production` environment
5. Add an optional comment
6. Click **Approve and deploy**

## Rollback

To rollback to a previous version:

1. Find the last successful production deployment in Actions
2. Click on the workflow run
3. Click **Re-run all jobs** or manually deploy the previous commit

## Environment Variables

### Staging-specific

The staging build sets `VITE_STAGING=true`. You can use this in your code:

```typescript
const isStaging = import.meta.env.VITE_STAGING === 'true';

if (isStaging) {
  console.log('Running in staging environment');
}
```

### Adding a Staging Banner

You can add a visual indicator for staging:

```tsx
// In App.tsx or a layout component
{import.meta.env.VITE_STAGING === 'true' && (
  <div className="bg-yellow-500 text-black text-center py-1 text-sm font-bold">
    ⚠️ STAGING ENVIRONMENT - Not for production use
  </div>
)}
```

## Troubleshooting

### Deployment fails with permission error

- Verify `GH_TOKEN` has access to the target repository
- Check if the token has expired
- Ensure the token has `repo` scope

### Staging site shows 404

- Verify GitHub Pages is enabled in the staging repository
- Check that the `main` branch has content
- Wait a few minutes for GitHub Pages to build

### Production approval not showing

- Ensure the `production` environment exists
- Verify you're listed as a required reviewer
- Check that the staging job completed successfully

## Best Practices

1. **Always review staging** before approving production
2. **Test critical flows** on staging (navigation, search, questions)
3. **Check mobile responsiveness** on staging
4. **Monitor for errors** after production deployment
5. **Keep staging and production in sync** - don't leave staging ahead for too long
