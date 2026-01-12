#!/usr/bin/env node
/**
 * Setup required repository labels for the issue processor system
 * Creates labels needed for QuestionFeedback component and processor bot
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
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

async function setupLabels() {
  console.log('🏷️  Setting up repository labels...\n');
  console.log(`Repository: ${GITHUB_REPO}`);
  console.log('');

  const labels = [
    {
      name: 'bot:processor',
      color: '0052cc',
      description: 'Issue created by QuestionFeedback component for processing'
    },
    {
      name: 'bot:in-progress',
      color: 'fbca04',
      description: 'Issue is currently being processed by the bot'
    },
    {
      name: 'bot:completed',
      color: '0e8a16',
      description: 'Issue has been successfully processed by the bot'
    },
    {
      name: 'bot:failed',
      color: 'd93f0b',
      description: 'Issue processing failed'
    },
    {
      name: 'feedback:improve',
      color: '1d76db',
      description: 'Request to improve existing question content'
    },
    {
      name: 'feedback:rewrite',
      color: 'f9d0c4',
      description: 'Request to completely rewrite question content'
    },
    {
      name: 'feedback:disable',
      color: 'b60205',
      description: 'Request to disable/remove question'
    }
  ];

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const label of labels) {
    try {
      // Try to get existing label
      await githubApi(`/labels/${encodeURIComponent(label.name)}`);
      
      // Label exists, update it
      await githubApi(`/labels/${encodeURIComponent(label.name)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          color: label.color,
          description: label.description
        })
      });
      
      console.log(`✅ Updated: ${label.name}`);
      updated++;
      
    } catch (error) {
      if (error.message.includes('404')) {
        // Label doesn't exist, create it
        try {
          await githubApi('/labels', {
            method: 'POST',
            body: JSON.stringify({
              name: label.name,
              color: label.color,
              description: label.description
            })
          });
          
          console.log(`🆕 Created: ${label.name}`);
          created++;
        } catch (createError) {
          console.log(`❌ Failed to create ${label.name}: ${createError.message}`);
          errors++;
        }
      } else {
        console.log(`❌ Error with ${label.name}: ${error.message}`);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 LABEL SETUP SUMMARY');
  console.log('='.repeat(50));
  console.log(`   🆕 Created: ${created}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));

  if (created > 0 || updated > 0) {
    console.log('\n✅ Labels setup complete!');
    console.log('\n🔍 Next steps:');
    console.log('1. Test creating an issue with the QuestionFeedback component');
    console.log('2. Verify the issue gets the correct labels');
    console.log('3. Check that the issue processor workflow triggers');
  }

  if (errors > 0) {
    console.log('\n⚠️  Some labels had errors. Check the messages above.');
    console.log('💡 Make sure the GITHUB_TOKEN has "Issues" write permissions.');
  }
}

setupLabels().catch(console.error);