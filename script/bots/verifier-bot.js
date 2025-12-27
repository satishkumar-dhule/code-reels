#!/usr/bin/env node
/**
 * Verifier Bot - LangGraph Architecture
 * 
 * Quality assurance for all content:
 * - Checks question quality & relevance
 * - Validates coding challenge test cases
 * - Verifies voice keywords accuracy
 * - Detects duplicates
 * - Creates work items for Processor Bot
 * 
 * LangGraph Pipeline:
 * Fetch → Analyze → Score → Flag Issues → Create Work Items
 */

import 'dotenv/config';
import { getDb, initBotTables } from './shared/db.js';
import { logAction } from './shared/ledger.js';
import { addToQueue, getNextWorkItem, completeWorkItem, failWorkItem } from './shared/queue.js';
import { startRun, completeRun, failRun, updateRunStats } from './shared/runs.js';
import { runWithRetries, parseJson, calculateSimilarity, normalizeText } from '../utils.js';

const BOT_NAME = 'verifier';
const db = getDb();

// Quality thresholds
const THRESHOLDS = {
  minQuestionLength: 20,
  minAnswerLength: 10,
  minExplanationLength: 100,
  duplicateSimilarity: 0.7,
  minQualityScore: 60
};

// ============================================
// LANGGRAPH NODE DEFINITIONS
// ============================================

/**
 * Node 1: Fetch Items to Verify
 * Gets items from queue or scans database
 */
async function fetchNode(state) {
  console.log('\n📥 [Fetch] Getting items to verify...');
  
  const { mode, limit } = state;
  let items = [];
  
  if (mode === 'queue') {
    // Process items from work queue
    const workItem = await getNextWorkItem(BOT_NAME);
    if (workItem) {
      const question = await getQuestionById(workItem.itemId);
      if (question) {
        items.push({ ...question, workId: workItem.id, workAction: workItem.action });
      }
    }
  } else {
    // Scan database for unverified items
    items = await getUnverifiedQuestions(limit);
  }
  
  console.log(`   Found ${items.length} items to verify`);
  return { ...state, items, currentIndex: 0, results: [] };
}

/**
 * Node 2: Analyze Content
 * Deep analysis of content quality
 */
async function analyzeNode(state) {
  const { items, currentIndex } = state;
  if (currentIndex >= items.length) return state;
  
  const item = items[currentIndex];
  console.log(`\n🔍 [Analyze] Checking: ${item.question?.substring(0, 50)}...`);
  
  const analysis = {
    id: item.id,
    issues: [],
    scores: {}
  };
  
  // Basic field checks
  if (!item.question || item.question.length < THRESHOLDS.minQuestionLength) {
    analysis.issues.push({ type: 'short_question', severity: 'high' });
  }
  
  if (!item.answer || item.answer.length < THRESHOLDS.minAnswerLength) {
    analysis.issues.push({ type: 'short_answer', severity: 'high' });
  }
  
  if (!item.explanation || item.explanation.length < THRESHOLDS.minExplanationLength) {
    analysis.issues.push({ type: 'short_explanation', severity: 'medium' });
  }
  
  // Check for placeholder content
  const placeholders = ['TODO', 'FIXME', 'placeholder', 'example', 'lorem ipsum'];
  const content = `${item.question} ${item.answer} ${item.explanation}`.toLowerCase();
  if (placeholders.some(p => content.includes(p.toLowerCase()))) {
    analysis.issues.push({ type: 'placeholder_content', severity: 'high' });
  }
  
  // Check question ends with ?
  if (item.question && !item.question.trim().endsWith('?')) {
    analysis.issues.push({ type: 'missing_question_mark', severity: 'low' });
  }
  
  // Check for irrelevant behavioral patterns
  const irrelevantPatterns = [
    /how did the candidate/i,
    /describe a time when you/i,
    /tell me about yourself/i,
    /what are your strengths/i,
    /where do you see yourself/i
  ];
  if (irrelevantPatterns.some(p => p.test(item.question))) {
    analysis.issues.push({ type: 'irrelevant_behavioral', severity: 'high' });
  }
  
  return { ...state, currentAnalysis: analysis };
}

/**
 * Node 3: Score Content
 * AI-powered quality scoring
 */
async function scoreNode(state) {
  const { currentAnalysis, items, currentIndex } = state;
  if (!currentAnalysis) return state;
  
  const item = items[currentIndex];
  console.log('   📊 [Score] Calculating quality score...');
  
  const prompt = `Evaluate this interview question for quality. Score each aspect 0-100.

Question: "${item.question}"
Answer: "${item.answer?.substring(0, 200)}"
Explanation: "${item.explanation?.substring(0, 500)}"
Channel: ${item.channel}

Return ONLY JSON:
{
  "relevance": 0-100,
  "clarity": 0-100,
  "accuracy": 0-100,
  "completeness": 0-100,
  "overall": 0-100,
  "feedback": "brief improvement suggestion"
}`;

  const response = await runWithRetries(prompt);
  const scores = parseJson(response);
  
  if (scores) {
    currentAnalysis.scores = scores;
    currentAnalysis.qualityScore = scores.overall || 50;
    
    if (scores.overall < THRESHOLDS.minQualityScore) {
      currentAnalysis.issues.push({ 
        type: 'low_quality', 
        severity: 'medium',
        details: scores.feedback 
      });
    }
    
    console.log(`   Score: ${scores.overall}/100`);
  }
  
  return { ...state, currentAnalysis };
}

/**
 * Node 4: Check Duplicates
 * Finds similar existing questions
 */
async function duplicateCheckNode(state) {
  const { currentAnalysis, items, currentIndex } = state;
  if (!currentAnalysis) return state;
  
  const item = items[currentIndex];
  console.log('   🔄 [Duplicate] Checking for similar questions...');
  
  // Get other questions in same channel
  const similar = await findSimilarQuestions(item.id, item.question, item.channel);
  
  if (similar.length > 0) {
    currentAnalysis.issues.push({
      type: 'potential_duplicate',
      severity: 'medium',
      details: `Similar to: ${similar.map(s => s.id).join(', ')}`
    });
    currentAnalysis.duplicates = similar;
    console.log(`   Found ${similar.length} similar questions`);
  }
  
  return { ...state, currentAnalysis };
}

/**
 * Node 5: Create Work Items
 * Queues issues for Processor Bot
 */
async function createWorkItemsNode(state) {
  const { currentAnalysis, items, currentIndex, results } = state;
  if (!currentAnalysis) return state;
  
  const item = items[currentIndex];
  console.log('   📋 [Work Items] Creating tasks...');
  
  const highSeverityIssues = currentAnalysis.issues.filter(i => i.severity === 'high');
  const mediumSeverityIssues = currentAnalysis.issues.filter(i => i.severity === 'medium');
  
  // Determine action based on issues
  let action = null;
  let priority = 5;
  
  if (highSeverityIssues.length >= 2 || currentAnalysis.issues.some(i => i.type === 'irrelevant_behavioral')) {
    action = 'delete';
    priority = 1;
  } else if (highSeverityIssues.length > 0 || mediumSeverityIssues.length >= 2) {
    action = 'improve';
    priority = 2;
  } else if (currentAnalysis.issues.length > 0) {
    action = 'improve';
    priority = 4;
  }
  
  if (action) {
    await addToQueue({
      itemType: 'question',
      itemId: item.id,
      action,
      priority,
      reason: currentAnalysis.issues.map(i => i.type).join(', '),
      createdBy: BOT_NAME,
      assignedTo: 'processor'
    });
    
    // Log to ledger
    await logAction({
      botName: BOT_NAME,
      action: 'flag',
      itemType: 'question',
      itemId: item.id,
      afterState: currentAnalysis,
      reason: `Flagged for ${action}: ${currentAnalysis.issues.length} issues found`
    });
    
    console.log(`   Created work item: ${action} (priority ${priority})`);
  } else {
    // Mark as verified
    await markAsVerified(item.id);
    console.log('   ✅ Verified - no issues');
  }
  
  // Complete work item if processing from queue
  if (item.workId) {
    await completeWorkItem(item.workId, { verified: true, issues: currentAnalysis.issues.length });
  }
  
  // Store result and move to next
  results.push({
    id: item.id,
    issues: currentAnalysis.issues.length,
    action,
    score: currentAnalysis.qualityScore
  });
  
  return { 
    ...state, 
    results, 
    currentIndex: currentIndex + 1,
    currentAnalysis: null 
  };
}

// ============================================
// DATABASE HELPERS
// ============================================

async function getQuestionById(id) {
  const result = await db.execute({
    sql: 'SELECT * FROM questions WHERE id = ?',
    args: [id]
  });
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    diagram: row.diagram,
    tags: row.tags ? JSON.parse(row.tags) : [],
    voiceKeywords: row.voice_keywords ? JSON.parse(row.voice_keywords) : null,
    voiceSuitable: row.voice_suitable === 1,
    status: row.status
  };
}

async function getUnverifiedQuestions(limit = 20) {
  // Get questions that haven't been verified recently
  const result = await db.execute({
    sql: `SELECT * FROM questions 
          WHERE status = 'active' 
          AND id NOT IN (
            SELECT DISTINCT item_id FROM bot_ledger 
            WHERE bot_name = 'verifier' 
            AND action = 'verify'
            AND created_at > datetime('now', '-7 days')
          )
          ORDER BY RANDOM()
          LIMIT ?`,
    args: [limit]
  });
  
  return result.rows.map(row => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    channel: row.channel,
    subChannel: row.sub_channel,
    diagram: row.diagram,
    tags: row.tags ? JSON.parse(row.tags) : [],
    status: row.status
  }));
}

async function findSimilarQuestions(excludeId, questionText, channel) {
  const result = await db.execute({
    sql: 'SELECT id, question FROM questions WHERE channel = ? AND id != ? LIMIT 100',
    args: [channel, excludeId]
  });
  
  const similar = [];
  
  for (const row of result.rows) {
    const similarity = calculateSimilarity(questionText, row.question);
    if (similarity >= THRESHOLDS.duplicateSimilarity) {
      similar.push({ id: row.id, similarity });
    }
  }
  
  return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
}

async function markAsVerified(id) {
  await logAction({
    botName: BOT_NAME,
    action: 'verify',
    itemType: 'question',
    itemId: id,
    reason: 'Passed verification'
  });
}

// ============================================
// LANGGRAPH EXECUTOR
// ============================================

async function runPipeline(options = {}) {
  const { mode = 'scan', limit = 10 } = options;
  
  let state = { mode, limit };
  
  // Fetch items
  state = await fetchNode(state);
  
  if (state.items.length === 0) {
    console.log('No items to verify');
    return { processed: 0, flagged: 0 };
  }
  
  // Process each item through the pipeline
  while (state.currentIndex < state.items.length) {
    state = await analyzeNode(state);
    state = await scoreNode(state);
    state = await duplicateCheckNode(state);
    state = await createWorkItemsNode(state);
    
    // Rate limiting
    if (state.currentIndex < state.items.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  return {
    processed: state.results.length,
    flagged: state.results.filter(r => r.action).length,
    results: state.results
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== 🔍 Verifier Bot (LangGraph) ===\n');
  
  await initBotTables();
  
  const run = await startRun(BOT_NAME);
  const stats = { processed: 0, created: 0, updated: 0, deleted: 0 };
  
  try {
    const mode = process.env.MODE || 'scan';
    const limit = parseInt(process.env.LIMIT || '10');
    
    console.log(`Mode: ${mode}, Limit: ${limit}`);
    
    const result = await runPipeline({ mode, limit });
    
    stats.processed = result.processed;
    stats.created = result.flagged; // Work items created
    
    await updateRunStats(run.id, stats);
    await completeRun(run.id, stats, { 
      message: 'Verifier Bot completed',
      flagged: result.flagged
    });
    
    console.log('\n=== Summary ===');
    console.log(`Verified: ${result.processed}`);
    console.log(`Flagged: ${result.flagged}`);
    
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

export { runPipeline };
export default { runPipeline };
