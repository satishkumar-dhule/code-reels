# GitHub Pages Deployment

This project includes a feature to deploy the client application to GitHub Pages, including the ability to deploy to a different repository.

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   pnpm install
   ```

2. **Deploy to GitHub Pages** (configured for reel-interview.github.io):
   ```bash
   pnpm run deploy:pages
   ```

3. **Deploy to a different repository** (override default):
   ```bash
   DEPLOY_REPO=username/target-repo pnpm run deploy:pages
   ```

## Configuration Options

### Environment Variables

- `DEPLOY_REPO`: Target repository (required) - format: `username/repo-name`
- `DEPLOY_BRANCH`: Target branch (default: `gh-pages`)
- `DEPLOY_MESSAGE`: Commit message (default: current timestamp)
- `DEPLOY_CNAME`: Custom domain for GitHub Pages
- `DEPLOY_BASE_URL`: Base URL for the app (useful for repo subdirectories)
- `GIT_USER_NAME`: Git user name for commits
- `GIT_USER_EMAIL`: Git user email for commits

### Configuration File

Create a `deploy.config.json` file in the project root:

```json
{
  "targetRepo": "username/repo-name",
  "branch": "gh-pages",
  "message": "Deploy from main branch",
  "cname": "example.com",
  "baseUrl": "/repo-name/"
}
```

## Usage Examples

### Deploy to another repository
```bash
DEPLOY_REPO=myusername/my-pages-repo pnpm run deploy:pages
```

### Deploy with custom domain
```bash
DEPLOY_REPO=myusername/my-pages-repo DEPLOY_CNAME=mydomain.com pnpm run deploy:pages
```

### Deploy to subdirectory
```bash
DEPLOY_REPO=myusername/my-pages-repo DEPLOY_BASE_URL=/my-app/ pnpm run deploy:pages
```

## GitHub Actions Setup

The project includes a GitHub Actions workflow for automated deployment.

### Setup Steps:

1. **Ensure pnpm-lock.yaml is committed**:
   ```bash
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "Add pnpm lockfile"
   ```

2. **Create repository secrets** in your source repository:
   - `TARGET_REPO`: The target repository (e.g., `username/pages-repo`)
   - `CUSTOM_DOMAIN`: (Optional) Your custom domain
   - `BASE_URL`: (Optional) Base URL if deploying to a subdirectory

3. **Generate a Personal Access Token**:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Create a token with `repo` permissions
   - Add it as a secret named `GITHUB_TOKEN` (usually available by default)

4. **Configure the target repository**:
   - Go to the target repository settings
   - Enable GitHub Pages
   - Set source to "Deploy from a branch"
   - Select the `main` branch (for .github.io repos)

### Manual Trigger

You can manually trigger the deployment from the Actions tab in your repository.

## Authentication

For deployment to work, you need to authenticate with GitHub. The script uses:

1. **GitHub token** from environment or git credentials
2. **Git configuration** for user name and email

Make sure you have push access to the target repository.

## Troubleshooting

### Common Issues:

1. **Permission denied**: Ensure you have push access to the target repository
2. **Build fails**: Check that `pnpm run build:client` works locally
3. **Wrong base URL**: Set `DEPLOY_BASE_URL` if deploying to a subdirectory
4. **Custom domain not working**: Ensure DNS is configured and CNAME file is correct
5. **pnpm lockfile missing**: Ensure `pnpm-lock.yaml` is committed to the repository
6. **Corporate npm registry**: The `.npmrc` file forces use of public registry

### Debug Mode:

Add `DEBUG=gh-pages` to see detailed logs:
```bash
DEBUG=gh-pages DEPLOY_REPO=username/repo pnpm run deploy:pages
```

## Files Created During Deployment

- `.nojekyll`: Prevents Jekyll processing
- `CNAME`: Custom domain configuration (if specified)
- All built assets from `dist/public/`