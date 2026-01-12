#!/usr/bin/env node
/**
 * Check GitHub workflow status and recent runs
 * Helps debug why issues might not be processing
 */

import 'dotenv/config';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'open-interview/open-interview';

if (!GITHUB_TOKEN) {
  console.log('❌ GITHUB_TOKEN or GH_TOKEN environment variable not set');
  process.exit(1);
}

async function githubApi(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'open-interview-bot'
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function checkWorkflowStatus() {
  console.log('🔍 Checking GitHub Workflow Status\n');
  console.log(`Repository: ${GITHUB_REPO}`);
  console.log('');

  try {
    // Check recent workflow runs
    console.log('📊 Recent Workflow Runs:');
    const workflows = await githubApi('/actions/runs?per_page=10');
    
    for (const run of workflows.workflow_runs) {
      const status = run.status === 'completed' ? 
        (run.conclusion === 'success' ? '✅' : '❌') : '🔄';
      
      console.log(`   ${status} ${run.name} - ${run.status} (${run.conclusion || 'running'})`);
      console.log(`      Triggered: ${new Date(run.created_at).toLocaleString()}`);
      console.log(`      URL: ${run.html_url}`);
      console.log('');
    }

    // Check recent issues with bot:processor label
    console.log('🏷️  Recent Issues with bot:processor label:');
    try {
      const issues = await githubApi('/issues?labels=bot:processor&state=all&per_page=5');
      
      if (issues.length === 0) {
        console.log('   No issues found with bot:processor label');
      } else {
        for (const issue of issues) {
          const labels = issue.labels.map(l => l.name).join(', ');
          console.log(`   #${issue.number}: ${issue.title}`);
          console.log(`      State: ${issue.state}`);
          console.log(`      Labels: ${labels}`);
          console.log(`      Created: ${new Date(issue.created_at).toLocaleString()}`);
          console.log('');
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch issues: ${error.message}`);
    }

    // Check repository labels
    console.log('🏷️  Repository Labels:');
    try {
      const labels = await githubApi('/labels');
      const botLabels = labels.filter(l => l.name.startsWith('bot:') || l.name.startsWith('feedback:'));
      
      if (botLabels.length === 0) {
        console.log('   ❌ No bot or feedback labels found!');
        console.log('   💡 Run the "Setup Repository Labels" workflow to create them');
      } else {
        for (const label of botLabels) {
          console.log(`   ✅ ${label.name} (#${label.color}) - ${label.description || 'No description'}`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch labels: ${error.message}`);
    }

  } catch (error) {
    console.log(`❌ Error checking workflow status: ${error.message}`);
    
    if (error.message.includes('401')) {
      console.log('💡 Check that GITHUB_TOKEN has the correct permissions');
    }
  }
}

checkWorkflowStatus().catch(console.error);