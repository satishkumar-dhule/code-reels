import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import ghpages from "gh-pages";

interface DeployConfig {
  targetRepo?: string;
  branch?: string;
  message?: string;
  cname?: string;
  baseUrl?: string;
}

async function deployToGitHubPages() {
  // Load configuration
  const configPath = join(process.cwd(), "deploy.config.json");
  let config: DeployConfig = {};
  
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  }

  // Get configuration from environment variables or config file
  const targetRepo = process.env.DEPLOY_REPO || config.targetRepo;
  const branch = process.env.DEPLOY_BRANCH || config.branch || "gh-pages";
  const message = process.env.DEPLOY_MESSAGE || config.message || `Deploy ${new Date().toISOString()}`;
  const cname = process.env.DEPLOY_CNAME || config.cname;
  const baseUrl = process.env.DEPLOY_BASE_URL || config.baseUrl;

  if (!targetRepo) {
    console.error("❌ Target repository not specified!");
    console.log("Set DEPLOY_REPO environment variable or create deploy.config.json");
    console.log("Example: DEPLOY_REPO=username/repo-name npm run deploy:pages");
    process.exit(1);
  }

  console.log("🏗️  Building client for production...");
  
  // Build the client with proper base URL if specified
  if (baseUrl) {
    process.env.VITE_BASE_URL = baseUrl;
  } else {
    // For .github.io repos, ensure base URL is root
    const repoName = targetRepo.split('/')[1];
    if (repoName.endsWith('.github.io')) {
      process.env.VITE_BASE_URL = '/';
    }
  }
  
  execSync("pnpm run build:client", { stdio: "inherit" });

  const distPath = join(process.cwd(), "dist/public");
  
  if (!existsSync(distPath)) {
    console.error("❌ Build output not found at dist/public");
    process.exit(1);
  }

  // Add CNAME file if specified
  if (cname) {
    console.log(`📝 Adding CNAME file for ${cname}`);
    writeFileSync(join(distPath, "CNAME"), cname);
  }

  // Add .nojekyll file to prevent Jekyll processing
  writeFileSync(join(distPath, ".nojekyll"), "");

  // Copy index.html to 404.html for SPA routing support on GitHub Pages
  // This ensures direct URL access works (e.g., /channel/devops)
  const indexPath = join(distPath, "index.html");
  if (existsSync(indexPath)) {
    const indexContent = readFileSync(indexPath, "utf-8");
    writeFileSync(join(distPath, "404.html"), indexContent);
    console.log("📝 Created 404.html for SPA routing support");
  }

  console.log(`🚀 Deploying to ${targetRepo} on branch ${branch}...`);

  try {
    const repoUrl = process.env.GITHUB_TOKEN 
      ? `https://${process.env.GITHUB_TOKEN}@github.com/${targetRepo}.git`
      : `https://github.com/${targetRepo}.git`;

    await new Promise<void>((resolve, reject) => {
      ghpages.publish(distPath, {
        repo: repoUrl,
        branch: branch,
        message: message,
        user: {
          name: process.env.GIT_USER_NAME || "GitHub Actions",
          email: process.env.GIT_USER_EMAIL || "actions@github.com"
        },
        silent: false
      }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log("✅ Successfully deployed to GitHub Pages!");
    const repoName = targetRepo.split('/')[1];
    if (repoName.endsWith('.github.io')) {
      console.log(`🌐 Your site should be available at: https://${repoName}/`);
    } else {
      console.log(`🌐 Your site should be available at: https://${targetRepo.split('/')[0]}.github.io/${repoName}/`);
    }
    
    if (cname) {
      console.log(`🌐 Custom domain: https://${cname}`);
    }
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

deployToGitHubPages().catch((err) => {
  console.error(err);
  process.exit(1);
});