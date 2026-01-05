#!/usr/bin/env node
/**
 * Publish to LinkedIn
 * Generates engaging story-style posts using LangGraph pipeline
 * Publishes immediately after blog is published
 * 
 * Required secrets:
 * - LINKEDIN_ACCESS_TOKEN: OAuth 2.0 access token with w_member_social scope
 * - LINKEDIN_PERSON_URN: Your LinkedIn person URN (urn:li:person:XXXXXXXX)
 */

import 'dotenv/config';
import { generateLinkedInPost } from './ai/graphs/linkedin-graph.js';

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2/ugcPosts';

const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
const personUrn = process.env.LINKEDIN_PERSON_URN;
const postTitle = process.env.POST_TITLE;
const postUrl = process.env.POST_URL;
const postExcerpt = process.env.POST_EXCERPT;
const postTags = process.env.POST_TAGS;
const postChannel = process.env.POST_CHANNEL;

if (!accessToken || !personUrn) {
  console.error('❌ Missing LinkedIn credentials');
  console.error('   Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN secrets');
  process.exit(1);
}

if (!postTitle || !postUrl) {
  console.error('❌ Missing post details');
  process.exit(1);
}

/**
 * Publish content to LinkedIn
 */
async function publishToLinkedIn(content) {
  console.log('\n📤 Publishing to LinkedIn...');
  
  const payload = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: 'ARTICLE',
        media: [
          {
            status: 'READY',
            originalUrl: postUrl,
            title: {
              text: postTitle
            },
            description: {
              text: postExcerpt || 'Technical interview preparation article'
            }
          }
        ]
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };
  
  const response = await fetch(LINKEDIN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

async function main() {
  console.log('📢 Publishing to LinkedIn with LangGraph Pipeline...\n');
  
  // Run LangGraph pipeline to generate content
  const result = await generateLinkedInPost({
    title: postTitle,
    url: postUrl,
    excerpt: postExcerpt,
    channel: postChannel,
    tags: postTags
  });
  
  if (!result.success) {
    console.error('❌ Failed to generate LinkedIn post:', result.error);
    process.exit(1);
  }
  
  const content = result.content;
  
  console.log('\nFinal post content:');
  console.log('─'.repeat(50));
  console.log(content);
  console.log('─'.repeat(50));
  console.log(`Character count: ${content.length}/3000\n`);
  
  // Publish immediately
  try {
    const linkedInResult = await publishToLinkedIn(content);
    console.log('✅ Successfully published to LinkedIn!');
    console.log(`   Post ID: ${linkedInResult.id}`);
    
    // Output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const fs = await import('fs');
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `published=true\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `linkedin_post_id=${linkedInResult.id}\n`);
    }
  } catch (error) {
    console.error('❌ Failed to publish to LinkedIn:', error.message);
    console.log('⚠️ Continuing despite error...');
  }
}

main().catch(console.error);
