#!/usr/bin/env node
/**
 * Unified Content Bot
 * 
 * Orchestrates content generation across ALL content types:
 * - Questions (interview Q&A)
 * - Coding Challenges (with test cases)
 * - Certification MCQs (exam-aligned)
 * - Tests (quick quiz MCQs)
 * - Voice Sessions (from related questions)
 * - Blog Posts (from questions)
 * 
 * Usage:
 *   node script/bots/unified-content-bot.js --type=question --channel=system-design
 *   node script/bots/unified-content-bot.js --type=challenge --category=arrays
 *   node script/bots/unified-content-bot.js --type=certification --cert=aws-saa
 *   node script/bots/unified-content-bot.js --type=test --channel=devops
 *   node script/bots/unified-content-bot.js --type=all --count=5
 */

import 'dotenv/config';
import { getDb, initBotTables } from './shared/db.js';
import { logAction } from './shared/ledger.js';
import { addToQueue } from './shared/queue.js';
import { startRun, completeRun, failRun, updateRunStats } from './shared/runs.js';

const BOT_NAME = 'unified-content';
const db = getDb();

// ============================================
// CONTENT TYPE CONFIGURATIONS
// ============================================

const CONTENT_TYPES = {
  question: {
    name: 'Interview Question',
    generator: './creator-bot.js',
    verifier: 'verifier',
    processor: 'processor',
    channels: ['system-design', 'algorithms', 'frontend', 'backend', 'devops', 'sre', 'database', 'security', 'ml-ai']
  },
  challenge: {
    name: 'Coding Challenge',
    generator: '../ai/graphs/coding-challenge-graph.js',
    verifier: 'verifier', // TODO: Add challenge-specific verification
    processor: 'processor',
    categories: ['arrays', 'strings', 'trees', 'graphs', 'dp', 'sorting', 'searching']
  },
  certification: {
    name: 'Certification MCQ',
    generator: '../ai/graphs/certification-question-graph.js',
    verifier: 'verifier',
    processor: 'processor',
    certifications: ['aws-saa', 'aws-sap', 'cka', 'ckad', 'terraform-associate', 'gcp-ace']
  },
  test: {
    name: 'Quick Test MCQ',
    generator: null, // Will implement inline
    verifier: 'verifier',
    processor: 'processor',
    channels: ['system-design', 'algorithms', 'frontend', 'backend', 'devops']
  },
  voice: {
    name: 'Voice Session',
    generator: './session-builder-bot.js',
    verifier: null, // Sessions don't need verification
    processor: null
  },
  blog: {
    name: 'Blog Post',
    generator: '../ai/graphs/blog-graph.js',
    verifier: null,
    processor: null
  }
};

// ============================================
// GENERATORS
// ============================================

async function generateQuestion(options) {
  const { runPipeline } = await import('./creator-bot.js');
  return runPipeline(options.topic || options.input, {
    type: 'question',
    channel: options.channel,
    difficulty: options.difficulty
  });
}

async function generateChallenge(options) {
  const { generateCodingChallenge } = await import('../ai/graphs/coding-challenge-graph.js');
  return generateCodingChallenge({
    difficulty: options.difficulty || 'medium',
    category: options.category || 'arrays',
    companies: options.companies || ['Google', 'Meta', 'Amazon'],
    existingTitles: []
  });
}

async function generateCertificationMCQ(options) {
  const { generateCertificationQuestions } = await import('../ai/graphs/certification-question-graph.js');
  return generateCertificationQuestions({
    certificationId: options.certification || 'aws-saa',
    domain: options.domain,
    difficulty: options.difficulty || 'intermediate',
    count: options.count || 5
  });
}

async function generateTestMCQ(options) {
  const { runWithRetries, parseJson } = await import('../utils.js');
  
  const prompt = `Create a multiple-choice test question for ${options.channel} interviews.

Difficulty: ${options.difficulty || 'intermediate'}
Topic: ${options.topic || 'general concepts'}

Return ONLY valid JSON:
{
  "question": "Clear question ending with ?",
  "options": [
    { "id": "a", "text": "Option A", "isCorrect": false },
    { "id": "b", "text": "Option B", "isCorrect": true },
    { "id": "c", "text": "Option C", "isCorrect": false },
    { "id": "d", "text": "Option D", "isCorrect": false }
  ],
  "explanation": "Why the correct answer is correct",
  "difficulty": "${options.difficulty || 'intermediate'}",
  "tags": ["tag1", "tag2"]
}

CRITICAL REQUIREMENTS:
- Exactly 4 options with exactly 1 correct answer
- Question should test practical knowledge
- Explanation should be educational
- ALL OPTIONS MUST BE SIMILAR IN LENGTH (within 20% of each other)
- The correct answer should NOT be noticeably longer or more detailed than incorrect options
- Make incorrect options equally detailed and plausible
- NEVER use "All of the above", "None of the above", or "Both A and B" style options`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (!result || !result.question) {
    return { success: false, error: 'Failed to generate test question' };
  }
  
  // Validate option length balance
  if (result.options && result.options.length >= 4) {
    const lengths = result.options.map(o => o.text?.length || 0);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const correctOpt = result.options.find(o => o.isCorrect);
    const correctLength = correctOpt?.text?.length || 0;
    
    // Warn if correct answer is significantly longer
    if (correctLength > avgLength * 1.3) {
      console.log(`   ⚠️ Warning: Correct answer is ${Math.round((correctLength / avgLength - 1) * 100)}% longer than average`);
    }
  }
  
  return {
    success: true,
    question: {
      id: `test-${options.channel}-${Date.now()}`,
      channelId: options.channel,
      ...result
    }
  };
}

async function generateVoiceSessions() {
  const { buildSessions } = await import('./session-builder-bot.js');
  return buildSessions();
}

async function generateBlogPost(options) {
  const { generateBlogPost } = await import('../ai/graphs/blog-graph.js');
  return generateBlogPost(options);
}

// ============================================
// UNIFIED PIPELINE
// ============================================

async function runUnifiedPipeline(contentType, options = {}) {
  const config = CONTENT_TYPES[contentType];
  if (!config) {
    throw new Error(`Unknown content type: ${contentType}`);
  }
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 GENERATING: ${config.name}`);
  console.log(`${'═'.repeat(60)}`);
  
  let result = null;
  
  // Generate content
  switch (contentType) {
    case 'question':
      result = await generateQuestion(options);
      break;
    case 'challenge':
      result = await generateChallenge(options);
      break;
    case 'certification':
      result = await generateCertificationMCQ(options);
      break;
    case 'test':
      result = await generateTestMCQ(options);
      break;
    case 'voice':
      result = await generateVoiceSessions();
      break;
    case 'blog':
      result = await generateBlogPost(options);
      break;
  }
  
  if (!result || (!result.success && !result.savedId)) {
    console.log(`❌ Generation failed for ${contentType}`);
    return { success: false, contentType, error: result?.error || 'Unknown error' };
  }
  
  // Queue for verification if applicable
  if (config.verifier && result.savedId) {
    await addToQueue({
      itemType: contentType,
      itemId: result.savedId,
      action: 'verify',
      priority: 3,
      createdBy: BOT_NAME,
      assignedTo: config.verifier
    });
    console.log(`📋 Queued for verification: ${result.savedId}`);
  }
  
  // Log to ledger
  await logAction({
    botName: BOT_NAME,
    action: 'create',
    itemType: contentType,
    itemId: result.savedId || result.id || `${contentType}-${Date.now()}`,
    afterState: { contentType, options },
    reason: `Generated ${config.name}`
  });
  
  console.log(`✅ ${config.name} generated successfully`);
  return { success: true, contentType, result };
}

// ============================================
// BATCH GENERATION
// ============================================

async function runBatchGeneration(options = {}) {
  const { types = ['question'], count = 1 } = options;
  const results = { success: 0, failed: 0, byType: {} };
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log('🔄 BATCH CONTENT GENERATION');
  console.log(`${'═'.repeat(60)}`);
  console.log(`Types: ${types.join(', ')}`);
  console.log(`Count per type: ${count}`);
  
  for (const type of types) {
    results.byType[type] = { success: 0, failed: 0 };
    
    for (let i = 0; i < count; i++) {
      try {
        const typeOptions = { ...options };
        
        // Randomize options for variety
        if (type === 'question') {
          const channels = CONTENT_TYPES.question.channels;
          typeOptions.channel = typeOptions.channel || channels[Math.floor(Math.random() * channels.length)];
        } else if (type === 'challenge') {
          const categories = CONTENT_TYPES.challenge.categories;
          typeOptions.category = typeOptions.category || categories[Math.floor(Math.random() * categories.length)];
        } else if (type === 'certification') {
          const certs = CONTENT_TYPES.certification.certifications;
          typeOptions.certification = typeOptions.certification || certs[Math.floor(Math.random() * certs.length)];
        }
        
        const result = await runUnifiedPipeline(type, typeOptions);
        
        if (result.success) {
          results.success++;
          results.byType[type].success++;
        } else {
          results.failed++;
          results.byType[type].failed++;
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 2000));
        
      } catch (error) {
        console.error(`Error generating ${type}: ${error.message}`);
        results.failed++;
        results.byType[type].failed++;
      }
    }
  }
  
  return results;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== 🤖 Unified Content Bot ===\n');
  
  await initBotTables();
  
  const run = await startRun(BOT_NAME);
  const stats = { processed: 0, created: 0, updated: 0, deleted: 0 };
  
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    const getArg = (name) => {
      const arg = args.find(a => a.startsWith(`--${name}=`));
      return arg ? arg.split('=')[1] : null;
    };
    
    const contentType = getArg('type') || 'question';
    const count = parseInt(getArg('count') || '1');
    const channel = getArg('channel');
    const category = getArg('category');
    const certification = getArg('cert');
    const difficulty = getArg('difficulty');
    const topic = getArg('topic');
    
    const options = {
      channel,
      category,
      certification,
      difficulty,
      topic,
      count
    };
    
    let results;
    
    if (contentType === 'all') {
      // Generate all content types
      results = await runBatchGeneration({
        types: ['question', 'challenge', 'certification', 'test'],
        count,
        ...options
      });
    } else {
      // Generate specific content type
      for (let i = 0; i < count; i++) {
        const result = await runUnifiedPipeline(contentType, options);
        stats.processed++;
        if (result.success) stats.created++;
        
        if (i < count - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      results = { success: stats.created, failed: stats.processed - stats.created };
    }
    
    await updateRunStats(run.id, stats);
    await completeRun(run.id, stats, { results });
    
    console.log('\n=== Summary ===');
    console.log(`Processed: ${stats.processed}`);
    console.log(`Created: ${stats.created}`);
    if (results.byType) {
      console.log('By Type:');
      for (const [type, typeStats] of Object.entries(results.byType)) {
        console.log(`  ${type}: ${typeStats.success} success, ${typeStats.failed} failed`);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    await failRun(run.id, error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}

export { runUnifiedPipeline, runBatchGeneration, CONTENT_TYPES };
export default { runUnifiedPipeline, runBatchGeneration, CONTENT_TYPES };
