#!/usr/bin/env node
/**
 * Post Question as LinkedIn Poll
 * Fetches a random question from the database and posts it as a LinkedIn poll
 * 
 * Required secrets:
 * - LINKEDIN_ACCESS_TOKEN: OAuth 2.0 access token with w_member_social scope
 * - LINKEDIN_PERSON_URN: Your LinkedIn person URN (urn:li:person:XXXXXXXX)
 * 
 * Environment variables:
 * - QUESTION_ID: Specific question ID to post (optional, random if not provided)
 * - CHANNEL: Filter by channel (optional)
 * - DIFFICULTY: Filter by difficulty (optional)
 * - DRY_RUN: Set to 'true' to generate content without publishing
 * - POLL_DURATION: Poll duration in hours (default: 24, max: 168)
 */

import 'dotenv/config';
import { dbClient } from './utils.js';

// Constants
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2/ugcPosts';
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const MAX_POLL_QUESTION_LENGTH = 140;
const MAX_POLL_OPTIONS = 4;
const MIN_POLL_DURATION_HOURS = 1;
const MAX_POLL_DURATION_HOURS = 168; // 7 days

// Environment variables
const accessToken = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
const personUrn = process.env.LINKEDIN_PERSON_URN?.trim();
const questionId = process.env.QUESTION_ID?.trim();
const channel = process.env.CHANNEL?.trim();
const difficulty = process.env.DIFFICULTY?.trim();
const dryRun = process.env.DRY_RUN === 'true';
const pollDuration = Math.min(Math.max(parseInt(process.env.POLL_DURATION || '24'), MIN_POLL_DURATION_HOURS), MAX_POLL_DURATION_HOURS);

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const errors = [];
  
  if (!accessToken) {
    errors.push('LINKEDIN_ACCESS_TOKEN is required');
  } else if (accessToken.length < 20) {
    errors.push('LINKEDIN_ACCESS_TOKEN appears invalid (too short)');
  }
  
  if (!personUrn) {
    errors.push('LINKEDIN_PERSON_URN is required');
  } else if (!personUrn.startsWith('urn:li:person:')) {
    errors.push('LINKEDIN_PERSON_URN must start with "urn:li:person:"');
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }
  
  console.log('✅ Environment validation passed');
}

/**
 * Parse question row from database
 */
function parseQuestionRow(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    difficulty: row.difficulty,
    tags: row.tags ? JSON.parse(row.tags) : [],
    channel: row.channel,
    subChannel: row.sub_channel,
  };
}

/**
 * Fetch a question from the database
 */
async function fetchQuestion() {
  console.log('🔍 Fetching question from database...');
  
  let sql = 'SELECT * FROM questions WHERE status = "active"';
  const args = [];
  
  if (questionId) {
    sql += ' AND id = ?';
    args.push(questionId);
  }
  
  if (channel) {
    sql += ' AND channel = ?';
    args.push(channel);
  }
  
  if (difficulty) {
    sql += ' AND difficulty = ?';
    args.push(difficulty);
  }
  
  // Get random question
  sql += ' ORDER BY RANDOM() LIMIT 1';
  
  const result = await dbClient.execute({ sql, args });
  
  if (result.rows.length === 0) {
    throw new Error('No questions found matching criteria');
  }
  
  const question = parseQuestionRow(result.rows[0]);
  console.log(`   ✅ Found question: ${question.id}`);
  console.log(`   Channel: ${question.channel}`);
  console.log(`   Difficulty: ${question.difficulty}`);
  console.log(`   Question: ${question.question.substring(0, 100)}...`);
  
  return question;
}

/**
 * Extract poll options from answer
 * Looks for multiple choice format in the answer
 */
function extractPollOptions(answer) {
  // Try to extract options from common formats:
  // A) Option 1
  // B) Option 2
  // or
  // 1. Option 1
  // 2. Option 2
  
  const patterns = [
    /^([A-D])\)\s*(.+?)(?=\n[A-D]\)|$)/gm,
    /^([A-D])\.\s*(.+?)(?=\n[A-D]\.|$)/gm,
    /^([1-4])\)\s*(.+?)(?=\n[1-4]\)|$)/gm,
    /^([1-4])\.\s*(.+?)(?=\n[1-4]\.|$)/gm,
  ];
  
  for (const pattern of patterns) {
    const matches = [...answer.matchAll(pattern)];
    if (matches.length >= 2 && matches.length <= MAX_POLL_OPTIONS) {
      return matches.map(m => m[2].trim()).slice(0, MAX_POLL_OPTIONS);
    }
  }
  
  return null;
}

/**
 * Format question for LinkedIn poll
 */
function formatPollContent(question) {
  const options = extractPollOptions(question.answer);
  
  if (!options || options.length < 2) {
    throw new Error('Question does not have valid multiple choice options');
  }
  
  // Truncate question if too long
  let pollQuestion = question.question;
  if (pollQuestion.length > MAX_POLL_QUESTION_LENGTH) {
    pollQuestion = pollQuestion.substring(0, MAX_POLL_QUESTION_LENGTH - 3) + '...';
  }
  
  // Create engaging intro text
  const intro = `🎯 Quick Tech Quiz!\n\n${pollQuestion}\n\n💡 Test your knowledge and see how you compare with others!\n\n#TechInterview #${question.channel.replace(/[^a-zA-Z0-9]/g, '')} #CodingInterview`;
  
  return {
    text: intro,
    question: pollQuestion,
    options: options.slice(0, MAX_POLL_OPTIONS),
  };
}

/**
 * Fetch with timeout and retry
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      const isLastAttempt = attempt === retries;
      const isRetryable = error.name === 'AbortError' || 
                          error.code === 'ECONNRESET' || 
                          error.code === 'ETIMEDOUT';
      
      if (isLastAttempt || !isRetryable) {
        throw error;
      }
      
      console.log(`   ⚠️ Attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

/**
 * Parse LinkedIn API error response
 */
async function parseLinkedInError(response) {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.error || text;
    } catch {
      return text;
    }
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Publish poll to LinkedIn
 */
async function publishPollToLinkedIn(content) {
  console.log('\n📤 Publishing poll to LinkedIn...');
  
  // Calculate poll end time
  const pollEndTime = Date.now() + (pollDuration * 60 * 60 * 1000);
  
  const payload = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content.text
        },
        shareMediaCategory: 'POLL',
        poll: {
          question: content.question,
          options: content.options.map(option => ({ text: option })),
          settings: {
            duration: {
              durationInHours: pollDuration
            }
          }
        }
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  };
  
  console.log('📋 Poll payload:');
  console.log(JSON.stringify(payload, null, 2));
  
  const response = await fetchWithRetry(LINKEDIN_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorMsg = await parseLinkedInError(response);
    throw new Error(`LinkedIn API error (${response.status}): ${errorMsg}`);
  }
  
  const result = await response.json();
  
  if (!result.id) {
    throw new Error('Invalid response: missing post ID');
  }
  
  return result;
}

/**
 * Mark question as shared
 */
async function markQuestionShared(questionId, postId) {
  // You could add a 'shared_on_linkedin' column to track this
  console.log(`   📝 Question ${questionId} shared as poll ${postId}`);
}

async function main() {
  console.log('═'.repeat(60));
  console.log('📊 LinkedIn Poll Publisher');
  console.log('═'.repeat(60));
  console.log(`Question ID: ${questionId || 'Random'}`);
  console.log(`Channel: ${channel || 'Any'}`);
  console.log(`Difficulty: ${difficulty || 'Any'}`);
  console.log(`Poll Duration: ${pollDuration} hours`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('─'.repeat(60));
  
  // Validate environment
  validateEnvironment();
  
  // Fetch question
  const question = await fetchQuestion();
  
  // Format as poll
  let pollContent;
  try {
    pollContent = formatPollContent(question);
  } catch (error) {
    console.error('❌ Failed to format poll:', error.message);
    console.log('   This question is not suitable for a poll (no multiple choice options)');
    process.exit(1);
  }
  
  console.log('\n📋 Poll content:');
  console.log('─'.repeat(50));
  console.log(pollContent.text);
  console.log('─'.repeat(50));
  console.log(`Question: ${pollContent.question}`);
  console.log('Options:');
  pollContent.options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
  console.log('─'.repeat(50));
  
  // Dry run - don't actually publish
  if (dryRun) {
    console.log('\n🏃 DRY RUN - Skipping actual publish');
    console.log('\n✅ Dry run complete');
    return;
  }
  
  // Publish to LinkedIn
  let linkedInResult;
  try {
    linkedInResult = await publishPollToLinkedIn(pollContent);
    console.log('\n✅ Successfully published poll to LinkedIn!');
    console.log(`   Post ID: ${linkedInResult.id}`);
    
    // Mark question as shared
    await markQuestionShared(question.id, linkedInResult.id);
  } catch (error) {
    console.error('❌ Publish failed:', error.message);
    process.exit(1);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Done!');
  console.log('═'.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
