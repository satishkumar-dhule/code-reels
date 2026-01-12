#!/usr/bin/env node
/**
 * Analysis Bot - Content Quality & Channel Analysis
 * 
 * Analyzes questions for various issues and creates work items for processor bot:
 * - Content quality issues (truncation, completeness, clarity)
 * - Channel/certification mismatches using RAG
 * - Missing enrichments (diagrams, videos, companies)
 * - Voice interview readiness
 * - Duplicate detection
 * 
 * This bot DOES NOT fix issues - it only detects and queues them.
 * The processor bot handles all fixes.
 * 
 * Usage:
 *   node script/bots/analysis-bot.js                    # Analyze all questions
 *   node script/bots/analysis-bot.js --channel=aws      # Analyze specific channel
 *   node script/bots/analysis-bot.js --limit=100        # Limit number of questions
 *   node script/bots/analysis-bot.js --focus=channels   # Only check channel mappings
 */

import 'dotenv/config';
import { getDb, initBotTables } from './shared/db.js';
import { logAction } from './shared/ledger.js';
import { addWorkItem } from './shared/queue.js';
import { startRun, completeRun, failRun, updateRunStats } from './shared/runs.js';

const BOT_NAME = 'analysis';
const db = getDb();

// Parse CLI arguments
const args = process.argv.slice(2);
const targetChannel = args.find(a => a.startsWith('--channel='))?.split('=')[1];
const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const focus = args.find(a => a.startsWith('--focus='))?.split('=')[1]; // 'channels', 'quality', 'enrichment'

// ============================================
// CHANNEL ANALYSIS PATTERNS
// ============================================

const CHANNEL_PATTERNS = {
  'system-design': ['scalability', 'distributed', 'microservices', 'load balancing', 'caching', 'cdn', 'sharding', 'replication'],
  'algorithms': ['time complexity', 'space complexity', 'big-o', 'sorting', 'searching', 'tree', 'graph', 'dynamic programming'],
  'frontend': ['react', 'vue', 'angular', 'css', 'html', 'dom', 'browser', 'webpack', 'performance'],
  'backend': ['api', 'rest', 'graphql', 'microservices', 'authentication', 'authorization', 'middleware'],
  'database': ['sql', 'nosql', 'indexing', 'query optimization', 'transactions', 'acid', 'normalization'],
  'devops': ['ci/cd', 'jenkins', 'docker', 'containerization', 'automation', 'deployment', 'pipeline'],
  'kubernetes': ['pod', 'deployment', 'service', 'ingress', 'configmap', 'secret', 'namespace', 'helm'],
  'aws': ['ec2', 's3', 'lambda', 'rds', 'dynamodb', 'cloudformation', 'cloudwatch', 'iam', 'vpc'],
  'security': ['encryption', 'authentication', 'authorization', 'owasp', 'xss', 'csrf', 'sql injection', 'tls'],
};

// ============================================
// ANALYSIS FUNCTIONS
// ============================================

/**
 * Analyze content quality issues
 */
function analyzeContentQuality(question) {
  const issues = [];
  
  // Check for missing/truncated content
  if (!question.question || question.question.length < 10) {
    issues.push({ type: 'missing_question', severity: 'critical', priority: 1 });
  }
  
  if (!question.answer || question.answer.length < 20) {
    issues.push({ type: 'missing_answer', severity: 'critical', priority: 1 });
  }
  
  if (question.answer && question.answer.endsWith('...')) {
    issues.push({ type: 'truncated_answer', severity: 'high', priority: 2 });
  }
  
  if (question.answer && question.answer.length < 100) {
    issues.push({ type: 'short_answer', severity: 'high', priority: 2 });
  }
  
  if (question.explanation && question.explanation.endsWith('...')) {
    issues.push({ type: 'truncated_explanation', severity: 'high', priority: 2 });
  }
  
  if (question.explanation && question.explanation.length < 50) {
    issues.push({ type: 'short_explanation', severity: 'medium', priority: 3 });
  }
  
  // Check for placeholder content
  const placeholders = ['TODO', 'TBD', 'placeholder', 'coming soon', 'to be added'];
  const allText = `${question.question} ${question.answer} ${question.explanation}`.toLowerCase();
  if (placeholders.some(p => allText.includes(p))) {
    issues.push({ type: 'placeholder_content', severity: 'high', priority: 2 });
  }
  
  // Check question formatting
  if (question.question && !question.question.trim().endsWith('?')) {
    issues.push({ type: 'missing_question_mark', severity: 'low', priority: 4 });
  }
  
  return issues;
}

/**
 * Analyze channel mapping using RAG
 */
async function analyzeChannelMapping(question) {
  const issues = [];
  
  try {
    // Import vector DB
    const vectorDB = (await import('../ai/services/vector-db.js')).default;
    await vectorDB.init();
    
    // Build search text
    const searchText = [
      question.question,
      question.answer?.substring(0, 500),
      question.explanation?.substring(0, 300)
    ].filter(Boolean).join(' ');
    
    // Find similar questions
    const similar = await vectorDB.semanticSearch(searchText, {
      limit: 15,
      threshold: 0.6
    });
    
    // Analyze channel distribution
    const channelScores = {};
    similar.forEach(s => {
      if (s.id !== question.id) {
        channelScores[s.channel] = (channelScores[s.channel] || 0) + s.relevance;
      }
    });
    
    // Get top channel
    const topChannel = Object.entries(channelScores)
      .sort((a, b) => b[1] - a[1])[0];
    
    // If top channel is different and has strong signal, flag for remapping
    if (topChannel && topChannel[0] !== question.channel) {
      const confidence = topChannel[1] / similar.length;
      if (confidence > 0.7) {
        issues.push({
          type: 'channel_mismatch',
          severity: 'medium',
          priority: 3,
          metadata: {
            currentChannel: question.channel,
            suggestedChannel: topChannel[0],
            confidence: Math.round(confidence * 100),
            similarCount: similar.filter(s => s.channel === topChannel[0]).length
          }
        });
      }
    }
    
    // Check keyword alignment
    const text = `${question.question} ${question.answer}`.toLowerCase();
    const currentChannelKeywords = CHANNEL_PATTERNS[question.channel] || [];
    const matchCount = currentChannelKeywords.filter(kw => text.includes(kw)).length;
    
    if (matchCount === 0 && currentChannelKeywords.length > 0) {
      issues.push({
        type: 'low_channel_relevance',
        severity: 'medium',
        priority: 3,
        metadata: {
          channel: question.channel,
          keywordMatches: 0
        }
      });
    }
    
  } catch (e) {
    console.log(`   ⚠️  RAG analysis failed: ${e.message}`);
  }
  
  return issues;
}

/**
 * Analyze enrichment opportunities
 */
function analyzeEnrichment(question) {
  const issues = [];
  
  // Check for missing tags
  if (!question.tags || question.tags.length === 0) {
    issues.push({ type: 'missing_tags', severity: 'info', priority: 5 });
  } else if (question.tags.length < 3) {
    issues.push({ type: 'insufficient_tags', severity: 'info', priority: 5 });
  }
  
  // Check for missing companies
  if (!question.companies || question.companies.length === 0) {
    issues.push({ type: 'missing_companies', severity: 'info', priority: 5 });
  }
  
  // Check for missing diagram (for system design, architecture questions)
  const needsDiagram = ['system-design', 'architecture', 'devops', 'kubernetes', 'aws'].includes(question.channel);
  if (needsDiagram && !question.diagram) {
    issues.push({ type: 'missing_diagram', severity: 'medium', priority: 3 });
  }
  
  // Check for missing videos
  if (!question.videos || (!question.videos.shortVideo && !question.videos.longVideo)) {
    issues.push({ type: 'missing_videos', severity: 'info', priority: 5 });
  }
  
  return issues;
}

/**
 * Analyze voice interview readiness
 */
function analyzeVoiceReadiness(question) {
  const issues = [];
  
  // Check answer length for voice (should be concise but complete)
  if (question.answer && question.answer.length > 1000) {
    issues.push({ type: 'verbose_for_voice', severity: 'info', priority: 5 });
  }
  
  // Check for voice keywords in tags
  const voiceKeywords = question.tags?.filter(t => 
    t.includes('voice') || t.includes('interview') || t.includes('explain')
  ) || [];
  
  if (voiceKeywords.length === 0) {
    issues.push({ type: 'missing_voice_keywords', severity: 'medium', priority: 3 });
  }
  
  return issues;
}

/**
 * Detect potential duplicates
 */
async function analyzeDuplicates(question) {
  const issues = [];
  
  try {
    // Import vector DB
    const vectorDB = (await import('../ai/services/vector-db.js')).default;
    await vectorDB.init();
    
    // Search for very similar questions
    const similar = await vectorDB.semanticSearch(question.question, {
      limit: 5,
      threshold: 0.85
    });
    
    // Check for high similarity (excluding self)
    const duplicates = similar.filter(s => s.id !== question.id && s.relevance > 0.9);
    
    if (duplicates.length > 0) {
      issues.push({
        type: 'likely_duplicate',
        severity: 'high',
        priority: 2,
        metadata: {
          duplicateIds: duplicates.map(d => d.id),
          similarities: duplicates.map(d => Math.round(d.relevance * 100))
        }
      });
    } else if (similar.filter(s => s.id !== question.id && s.relevance > 0.8).length > 0) {
      issues.push({
        type: 'potential_duplicate',
        severity: 'medium',
        priority: 3,
        metadata: {
          similarIds: similar.filter(s => s.id !== question.id).map(s => s.id)
        }
      });
    }
    
  } catch (e) {
    console.log(`   ⚠️  Duplicate detection failed: ${e.message}`);
  }
  
  return issues;
}

// ============================================
// MAIN ANALYSIS PIPELINE
// ============================================

async function analyzeQuestion(question) {
  console.log(`\n📊 Analyzing: ${question.id}`);
  console.log(`   Channel: ${question.channel}`);
  
  let allIssues = [];
  
  // Run different analysis based on focus
  if (!focus || focus === 'quality') {
    const qualityIssues = analyzeContentQuality(question);
    allIssues.push(...qualityIssues);
    if (qualityIssues.length > 0) {
      console.log(`   Found ${qualityIssues.length} quality issues`);
    }
  }
  
  if (!focus || focus === 'channels') {
    const channelIssues = await analyzeChannelMapping(question);
    allIssues.push(...channelIssues);
    if (channelIssues.length > 0) {
      console.log(`   Found ${channelIssues.length} channel issues`);
    }
  }
  
  if (!focus || focus === 'enrichment') {
    const enrichmentIssues = analyzeEnrichment(question);
    allIssues.push(...enrichmentIssues);
    if (enrichmentIssues.length > 0) {
      console.log(`   Found ${enrichmentIssues.length} enrichment opportunities`);
    }
  }
  
  if (!focus || focus === 'voice') {
    const voiceIssues = analyzeVoiceReadiness(question);
    allIssues.push(...voiceIssues);
    if (voiceIssues.length > 0) {
      console.log(`   Found ${voiceIssues.length} voice readiness issues`);
    }
  }
  
  if (!focus || focus === 'duplicates') {
    const duplicateIssues = await analyzeDuplicates(question);
    allIssues.push(...duplicateIssues);
    if (duplicateIssues.length > 0) {
      console.log(`   Found ${duplicateIssues.length} duplicate issues`);
    }
  }
  
  return allIssues;
}

/**
 * Create work items for detected issues
 */
async function createWorkItems(question, issues) {
  let created = 0;
  
  for (const issue of issues) {
    try {
      await addWorkItem({
        botName: 'processor',
        action: issue.type,
        itemType: 'question',
        itemId: question.id,
        priority: issue.priority,
        metadata: {
          severity: issue.severity,
          detectedBy: BOT_NAME,
          ...issue.metadata
        }
      });
      created++;
    } catch (e) {
      console.log(`   ⚠️  Failed to create work item: ${e.message}`);
    }
  }
  
  return created;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('=== 🔍 Analysis Bot ===\n');
  console.log(`Focus: ${focus || 'all'}`);
  if (targetChannel) console.log(`Channel: ${targetChannel}`);
  if (limit) console.log(`Limit: ${limit}`);
  
  await initBotTables();
  
  const runId = await startRun(BOT_NAME, {
    targetChannel,
    limit,
    focus
  });
  
  try {
    // Get questions to analyze
    let query = `
      SELECT * FROM questions 
      WHERE status != 'deleted'
    `;
    
    if (targetChannel) {
      query += ` AND channel = ?`;
    }
    
    query += ` ORDER BY lastUpdated DESC`;
    
    if (limit > 0) {
      query += ` LIMIT ${limit}`;
    }
    
    const result = await db.execute({
      sql: query,
      args: targetChannel ? [targetChannel] : []
    });
    
    const questions = result.rows;
    console.log(`\nFound ${questions.length} questions to analyze\n`);
    
    let analyzed = 0;
    let issuesFound = 0;
    let workItemsCreated = 0;
    
    for (const question of questions) {
      try {
        const issues = await analyzeQuestion(question);
        analyzed++;
        
        if (issues.length > 0) {
          issuesFound += issues.length;
          const created = await createWorkItems(question, issues);
          workItemsCreated += created;
          
          console.log(`   ✅ Created ${created} work items`);
          
          // Log analysis
          await logAction(BOT_NAME, question.id, 'analyze', 'completed', {
            issuesFound: issues.length,
            workItemsCreated: created,
            issues: issues.map(i => i.type)
          });
        } else {
          console.log(`   ✓ No issues found`);
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(r => setTimeout(r, 100));
        
      } catch (e) {
        console.log(`   ❌ Analysis failed: ${e.message}`);
        await logAction(BOT_NAME, question.id, 'analyze', 'failed', { error: e.message });
      }
    }
    
    await updateRunStats(runId, {
      questionsAnalyzed: analyzed,
      issuesFound,
      workItemsCreated
    });
    
    await completeRun(runId);
    
    console.log('\n=== Summary ===');
    console.log(`Questions analyzed: ${analyzed}`);
    console.log(`Issues found: ${issuesFound}`);
    console.log(`Work items created: ${workItemsCreated}`);
    console.log(`Average issues per question: ${(issuesFound / analyzed).toFixed(2)}`);
    
  } catch (e) {
    console.error('Fatal error:', e);
    await failRun(runId, e.message);
    process.exit(1);
  }
}

main().catch(console.error);
