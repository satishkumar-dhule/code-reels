#!/usr/bin/env node
/**
 * GitHub Analytics Bot
 * Fetches traffic data from GitHub API and stores it in Turso
 * Runs daily via GitHub Actions to collect:
 * - Page views (unique and total)
 * - Clone counts
 * - Top referrers
 * - Popular content paths
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER || 'satishkumar-dhule';
const REPO_NAME = process.env.REPO_NAME || 'code-reels';

// Also track the deployed site repo
const PAGES_REPO_OWNER = process.env.PAGES_REPO_OWNER || 'open-interview';
const PAGES_REPO_NAME = process.env.PAGES_REPO_NAME || 'open-interview.github.io';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initializeTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS github_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      repo TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      metric_name TEXT,
      count INTEGER DEFAULT 0,
      uniques INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, repo, metric_type, metric_name)
    )
  `);
  console.log('✓ github_analytics table ready');
}

async function fetchGitHubAPI(endpoint, repo = `${REPO_OWNER}/${REPO_NAME}`) {
  const url = `https://api.github.com/repos/${repo}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }
  
  return response.json();
}

async function collectTrafficViews(repo) {
  console.log(`\n📊 Fetching page views for ${repo}...`);
  const data = await fetchGitHubAPI('/traffic/views', repo);
  
  for (const view of data.views || []) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO github_analytics (date, repo, metric_type, metric_name, count, uniques)
            VALUES (?, ?, 'views', 'daily', ?, ?)`,
      args: [view.timestamp.split('T')[0], repo, view.count, view.uniques]
    });
  }
  
  console.log(`  ✓ ${data.views?.length || 0} days of view data saved`);
  return data;
}

async function collectTrafficClones(repo) {
  console.log(`📥 Fetching clone data for ${repo}...`);
  const data = await fetchGitHubAPI('/traffic/clones', repo);
  
  for (const clone of data.clones || []) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO github_analytics (date, repo, metric_type, metric_name, count, uniques)
            VALUES (?, ?, 'clones', 'daily', ?, ?)`,
      args: [clone.timestamp.split('T')[0], repo, clone.count, clone.uniques]
    });
  }
  
  console.log(`  ✓ ${data.clones?.length || 0} days of clone data saved`);
  return data;
}

async function collectReferrers(repo) {
  console.log(`🔗 Fetching top referrers for ${repo}...`);
  const data = await fetchGitHubAPI('/traffic/popular/referrers', repo);
  const today = new Date().toISOString().split('T')[0];
  
  for (const ref of data || []) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO github_analytics (date, repo, metric_type, metric_name, count, uniques)
            VALUES (?, ?, 'referrer', ?, ?, ?)`,
      args: [today, repo, ref.referrer, ref.count, ref.uniques]
    });
  }
  
  console.log(`  ✓ ${data?.length || 0} referrers saved`);
  return data;
}

async function collectPopularPaths(repo) {
  console.log(`📄 Fetching popular paths for ${repo}...`);
  const data = await fetchGitHubAPI('/traffic/popular/paths', repo);
  const today = new Date().toISOString().split('T')[0];
  
  for (const path of data || []) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO github_analytics (date, repo, metric_type, metric_name, count, uniques)
            VALUES (?, ?, 'path', ?, ?, ?)`,
      args: [today, repo, path.path, path.count, path.uniques]
    });
  }
  
  console.log(`  ✓ ${data?.length || 0} popular paths saved`);
  return data;
}

async function collectRepoStats(repo) {
  console.log(`⭐ Fetching repo stats for ${repo}...`);
  const data = await fetchGitHubAPI('', repo);
  const today = new Date().toISOString().split('T')[0];
  
  const stats = [
    { name: 'stars', count: data.stargazers_count },
    { name: 'forks', count: data.forks_count },
    { name: 'watchers', count: data.subscribers_count },
    { name: 'open_issues', count: data.open_issues_count },
    { name: 'size_kb', count: data.size },
  ];
  
  for (const stat of stats) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO github_analytics (date, repo, metric_type, metric_name, count, uniques)
            VALUES (?, ?, 'repo_stat', ?, ?, 0)`,
      args: [today, repo, stat.name, stat.count]
    });
  }
  
  console.log(`  ✓ Repo stats saved (⭐${data.stargazers_count} 🍴${data.forks_count})`);
  return data;
}

async function main() {
  console.log('🚀 GitHub Analytics Bot Starting...\n');
  
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN or GH_TOKEN is required');
    process.exit(1);
  }
  
  try {
    await initializeTable();
    
    const repos = [
      `${REPO_OWNER}/${REPO_NAME}`,
      `${PAGES_REPO_OWNER}/${PAGES_REPO_NAME}`
    ];
    
    const summary = { views: 0, clones: 0, referrers: 0, paths: 0 };
    
    for (const repo of repos) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Processing: ${repo}`);
      console.log('='.repeat(50));
      
      try {
        const views = await collectTrafficViews(repo);
        summary.views += views.count || 0;
        
        const clones = await collectTrafficClones(repo);
        summary.clones += clones.count || 0;
        
        const referrers = await collectReferrers(repo);
        summary.referrers += referrers?.length || 0;
        
        const paths = await collectPopularPaths(repo);
        summary.paths += paths?.length || 0;
        
        await collectRepoStats(repo);
      } catch (err) {
        console.error(`  ⚠️ Error processing ${repo}: ${err.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📈 Summary');
    console.log('='.repeat(50));
    console.log(`  Total Views (14d): ${summary.views}`);
    console.log(`  Total Clones (14d): ${summary.clones}`);
    console.log(`  Referrers tracked: ${summary.referrers}`);
    console.log(`  Popular paths: ${summary.paths}`);
    console.log('\n✅ GitHub Analytics collection complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
