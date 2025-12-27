#!/usr/bin/env node
/**
 * Processor Bot - LangGraph Architecture
 * 
 * Takes corrective actions on flagged content:
 * - Improves flagged content
 * - Deletes low-quality items
 * - Maintains audit ledger
 * - Processes work queue
 * 
 * LangGraph Pipeline:
 * Get Work Item → Decide Action → Execute → Log to Ledger → Update Status
 */

import 'dotenv/config';
import { getDb, initBotTables } from './shared/db.js';
import { logAction } from './shared/ledger.js';
import { getNextWorkItem, completeWorkItem, failWorkItem, getQueueStats } from './shared/queue.js';
import { startRun, completeRun, failRun, updateRunStats } from './shared/runs.js';
import { runWithRetries, parseJson, validateYouTubeVideos, normalizeCompanies } from '../utils.js';

const BOT_NAME = 'processor';
const db = getDb();

// ============================================
// LANGGRAPH NODE DEFINITIONS
// ============================================

/**
 * Node 1: Get Work Item
 * Fetches next item from work queue
 */
async function getWorkNode(state) {
  console.log('\n📥 [Get Work] Fetching next work item...');
  
  const workItem = await getNextWorkItem(BOT_NAME);
  
  if (!workItem) {
    console.log('   No pending work items');
    return { ...state, done: true };
  }
  
  console.log(`   Found: ${workItem.action} ${workItem.itemType} ${workItem.itemId}`);
  console.log(`   Reason: ${workItem.reason}`);
  
  // Fetch the actual item
  const item = await fetchItem(workItem.itemType, workItem.itemId);
  
  if (!item) {
    await failWorkItem(workItem.id, 'Item not found');
    return { ...state, workItem: null };
  }
  
  return { ...state, workItem, item };
}

/**
 * Node 2: Decide Action
 * Determines specific action to take
 */
async function decideNode(state) {
  const { workItem, item } = state;
  if (!workItem || !item) return state;
  
  console.log('\n🤔 [Decide] Determining action...');
  
  const action = workItem.action;
  let subActions = [];
  
  switch (action) {
    case 'delete':
      subActions = ['backup', 'delete', 'log'];
      break;
      
    case 'improve':
      // Analyze what needs improvement
      const issues = workItem.reason?.split(', ') || [];
      
      if (issues.includes('short_answer') || issues.includes('short_explanation')) {
        subActions.push('improve_content');
      }
      if (issues.includes('missing_question_mark')) {
        subActions.push('fix_formatting');
      }
      if (issues.includes('low_quality')) {
        subActions.push('rewrite');
      }
      if (issues.includes('potential_duplicate')) {
        subActions.push('deduplicate');
      }
      
      if (subActions.length === 0) {
        subActions = ['improve_content'];
      }
      break;
      
    case 'enrich':
      subActions = ['add_diagram', 'add_videos', 'add_companies', 'add_voice_keywords'];
      break;
      
    default:
      subActions = ['improve_content'];
  }
  
  console.log(`   Actions: ${subActions.join(', ')}`);
  return { ...state, subActions };
}

/**
 * Node 3: Execute Actions
 * Performs the corrective actions
 */
async function executeNode(state) {
  const { workItem, item, subActions } = state;
  if (!workItem || !item || !subActions) return state;
  
  console.log('\n⚡ [Execute] Processing...');
  
  const beforeState = { ...item };
  let updatedItem = { ...item };
  let deleted = false;
  
  for (const action of subActions) {
    console.log(`   → ${action}`);
    
    switch (action) {
      case 'delete':
        await deleteItem(workItem.itemType, workItem.itemId);
        deleted = true;
        break;
        
      case 'improve_content':
        updatedItem = await improveContent(updatedItem);
        break;
        
      case 'rewrite':
        updatedItem = await rewriteContent(updatedItem);
        break;
        
      case 'fix_formatting':
        updatedItem = fixFormatting(updatedItem);
        break;
        
      case 'deduplicate':
        // Keep the better version, mark for review
        updatedItem.status = 'needs_review';
        break;
        
      case 'add_diagram':
        updatedItem = await addDiagram(updatedItem);
        break;
        
      case 'add_videos':
        updatedItem = await addVideos(updatedItem);
        break;
        
      case 'add_companies':
        updatedItem = await addCompanies(updatedItem);
        break;
        
      case 'add_voice_keywords':
        updatedItem = await addVoiceKeywords(updatedItem);
        break;
    }
  }
  
  return { ...state, beforeState, updatedItem, deleted };
}

/**
 * Node 4: Log to Ledger
 * Records all actions for audit trail
 */
async function logNode(state) {
  const { workItem, beforeState, updatedItem, deleted } = state;
  if (!workItem) return state;
  
  console.log('\n📝 [Log] Recording to ledger...');
  
  await logAction({
    botName: BOT_NAME,
    action: deleted ? 'delete' : 'update',
    itemType: workItem.itemType,
    itemId: workItem.itemId,
    beforeState,
    afterState: deleted ? null : updatedItem,
    reason: `Processed: ${workItem.reason}`
  });
  
  return state;
}

/**
 * Node 5: Update Status
 * Saves changes and completes work item
 */
async function updateStatusNode(state) {
  const { workItem, updatedItem, deleted } = state;
  if (!workItem) return state;
  
  console.log('\n✅ [Update] Saving changes...');
  
  if (!deleted && updatedItem) {
    await saveItem(workItem.itemType, updatedItem);
  }
  
  await completeWorkItem(workItem.id, {
    action: deleted ? 'deleted' : 'updated',
    success: true
  });
  
  console.log('   Work item completed');
  return { ...state, success: true };
}

// ============================================
// ACTION IMPLEMENTATIONS
// ============================================

async function improveContent(item) {
  const prompt = `Improve this interview question content. Keep the same topic but enhance quality.

Current Question: "${item.question}"
Current Answer: "${item.answer}"
Current Explanation: "${item.explanation?.substring(0, 500)}"
Channel: ${item.channel}

Return ONLY JSON:
{
  "answer": "improved concise answer (1-2 sentences)",
  "explanation": "improved detailed explanation (200-400 words) with examples"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result) {
    if (result.answer) item.answer = result.answer;
    if (result.explanation) item.explanation = result.explanation;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function rewriteContent(item) {
  const prompt = `Completely rewrite this interview question to be clearer and more relevant.

Original Question: "${item.question}"
Channel: ${item.channel}

Return ONLY JSON:
{
  "question": "rewritten clear question ending with ?",
  "answer": "concise answer (1-2 sentences)",
  "explanation": "detailed explanation (200-400 words)"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result) {
    if (result.question) item.question = result.question;
    if (result.answer) item.answer = result.answer;
    if (result.explanation) item.explanation = result.explanation;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

function fixFormatting(item) {
  // Ensure question ends with ?
  if (item.question && !item.question.trim().endsWith('?')) {
    item.question = item.question.trim() + '?';
  }
  
  // Clean up whitespace
  if (item.answer) item.answer = item.answer.trim();
  if (item.explanation) item.explanation = item.explanation.trim();
  
  item.lastUpdated = new Date().toISOString();
  return item;
}

async function addDiagram(item) {
  const prompt = `Create a simple Mermaid diagram for this concept.

Question: "${item.question}"
Topic: ${item.channel}

Return ONLY the Mermaid code (no markdown):
graph TD
    A[Start] --> B[Process]
    B --> C[End]`;

  const response = await runWithRetries(prompt);
  
  if (response) {
    let diagram = response.trim();
    if (diagram.includes('```')) {
      const match = diagram.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/);
      if (match) diagram = match[1].trim();
    }
    
    if (diagram.startsWith('graph') || diagram.startsWith('flowchart')) {
      item.diagram = diagram;
      item.lastUpdated = new Date().toISOString();
    }
  }
  
  return item;
}

async function addVideos(item) {
  const prompt = `Find relevant YouTube educational videos for this topic.

Question: "${item.question}"
Channel: ${item.channel}

Return ONLY JSON:
{
  "shortVideo": "YouTube URL for a short (<10 min) explanation or null",
  "longVideo": "YouTube URL for a detailed (>10 min) tutorial or null"
}

Only include real, educational YouTube URLs. Return null if unsure.`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result) {
    const validated = await validateYouTubeVideos(result);
    if (validated.shortVideo || validated.longVideo) {
      item.videos = validated;
      item.lastUpdated = new Date().toISOString();
    }
  }
  
  return item;
}

async function addCompanies(item) {
  const prompt = `List tech companies that commonly ask about this topic in interviews.

Question: "${item.question}"
Channel: ${item.channel}

Return ONLY JSON:
{
  "companies": ["Company1", "Company2", "Company3"]
}

Only include well-known tech companies. Max 5 companies.`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.companies) {
    item.companies = normalizeCompanies(result.companies);
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function addVoiceKeywords(item) {
  const prompt = `Analyze this interview question for voice interview suitability.

Question: "${item.question}"
Answer: "${item.explanation?.substring(0, 500) || item.answer}"

Return ONLY JSON:
{
  "suitable": true/false,
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

suitable = true if question can be answered verbally (not code-based)
keywords = 5-8 mandatory terms a candidate must mention`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result) {
    item.voiceSuitable = result.suitable === true;
    if (result.suitable && Array.isArray(result.keywords)) {
      item.voiceKeywords = result.keywords
        .map(k => String(k).toLowerCase().trim())
        .filter(k => k.length > 2);
    }
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function fetchItem(type, id) {
  if (type === 'question') {
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
      diagram: row.diagram,
      channel: row.channel,
      subChannel: row.sub_channel,
      difficulty: row.difficulty,
      tags: row.tags ? JSON.parse(row.tags) : [],
      videos: row.videos ? JSON.parse(row.videos) : null,
      companies: row.companies ? JSON.parse(row.companies) : null,
      voiceKeywords: row.voice_keywords ? JSON.parse(row.voice_keywords) : null,
      voiceSuitable: row.voice_suitable === 1,
      status: row.status,
      lastUpdated: row.last_updated
    };
  }
  
  return null;
}

async function saveItem(type, item) {
  if (type === 'question') {
    await db.execute({
      sql: `UPDATE questions SET 
            question = ?, answer = ?, explanation = ?, diagram = ?,
            tags = ?, videos = ?, companies = ?,
            voice_keywords = ?, voice_suitable = ?,
            status = ?, last_updated = ?
            WHERE id = ?`,
      args: [
        item.question,
        item.answer,
        item.explanation,
        item.diagram || null,
        item.tags ? JSON.stringify(item.tags) : null,
        item.videos ? JSON.stringify(item.videos) : null,
        item.companies ? JSON.stringify(item.companies) : null,
        item.voiceKeywords ? JSON.stringify(item.voiceKeywords) : null,
        item.voiceSuitable ? 1 : 0,
        item.status || 'active',
        item.lastUpdated || new Date().toISOString(),
        item.id
      ]
    });
  }
}

async function deleteItem(type, id) {
  if (type === 'question') {
    // Soft delete - mark as deleted
    await db.execute({
      sql: `UPDATE questions SET status = 'deleted', last_updated = ? WHERE id = ?`,
      args: [new Date().toISOString(), id]
    });
    
    // Also remove from channel mappings
    await db.execute({
      sql: 'DELETE FROM channel_mappings WHERE question_id = ?',
      args: [id]
    });
  }
}

// ============================================
// LANGGRAPH EXECUTOR
// ============================================

async function runPipeline(options = {}) {
  const { maxItems = 10 } = options;
  
  const results = {
    processed: 0,
    updated: 0,
    deleted: 0,
    failed: 0
  };
  
  for (let i = 0; i < maxItems; i++) {
    let state = {};
    
    // Execute pipeline nodes
    state = await getWorkNode(state);
    if (state.done) break;
    if (!state.workItem) continue;
    
    try {
      state = await decideNode(state);
      state = await executeNode(state);
      state = await logNode(state);
      state = await updateStatusNode(state);
      
      results.processed++;
      if (state.deleted) {
        results.deleted++;
      } else {
        results.updated++;
      }
    } catch (error) {
      console.error(`Error processing ${state.workItem?.itemId}:`, error.message);
      await failWorkItem(state.workItem.id, error.message);
      results.failed++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }
  
  return results;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== ⚙️ Processor Bot (LangGraph) ===\n');
  
  await initBotTables();
  
  // Show queue stats
  const queueStats = await getQueueStats();
  console.log('Queue Status:');
  console.log(`  Pending: ${queueStats.pending}`);
  console.log(`  Processing: ${queueStats.processing}`);
  console.log(`  Completed: ${queueStats.completed}`);
  console.log(`  Failed: ${queueStats.failed}`);
  
  if (queueStats.pending === 0) {
    console.log('\nNo pending work items. Exiting.');
    return;
  }
  
  const run = await startRun(BOT_NAME);
  const stats = { processed: 0, created: 0, updated: 0, deleted: 0 };
  
  try {
    const maxItems = parseInt(process.env.MAX_ITEMS || '10');
    
    console.log(`\nProcessing up to ${maxItems} items...\n`);
    
    const result = await runPipeline({ maxItems });
    
    stats.processed = result.processed;
    stats.updated = result.updated;
    stats.deleted = result.deleted;
    
    await updateRunStats(run.id, stats);
    await completeRun(run.id, stats, {
      message: 'Processor Bot completed',
      ...result
    });
    
    console.log('\n=== Summary ===');
    console.log(`Processed: ${result.processed}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Deleted: ${result.deleted}`);
    console.log(`Failed: ${result.failed}`);
    
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
