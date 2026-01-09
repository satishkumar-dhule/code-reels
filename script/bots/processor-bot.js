#!/usr/bin/env node
/**
 * Processor Bot - Advanced Content Improvement Engine
 * 
 * Takes intelligent corrective actions based on verifier analysis:
 * - Parses detailed issue reports from verifier
 * - Applies targeted fixes based on issue types
 * - Handles multi-dimensional quality improvements
 * - Enriches content with diagrams, videos, companies
 * - Improves voice interview readiness
 * - Maintains comprehensive audit trail
 * 
 * LangGraph Pipeline:
 * Get Work → Parse Issues → Plan Actions → Execute → Validate → Log → Update
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
// ISSUE TYPE TO ACTION MAPPING
// ============================================

const ISSUE_ACTIONS = {
  // Critical - Delete
  'irrelevant_behavioral': { action: 'delete', priority: 1 },
  'missing_question': { action: 'delete', priority: 1 },
  'missing_answer': { action: 'delete', priority: 1 },
  
  // High - Major Rewrite
  'truncated_answer': { action: 'complete_content', priority: 2 },
  'truncated_explanation': { action: 'complete_content', priority: 2 },
  'short_answer': { action: 'expand_answer', priority: 2 },
  'placeholder_content': { action: 'rewrite', priority: 2 },
  'likely_duplicate': { action: 'deduplicate', priority: 2 },
  'low_technical_accuracy': { action: 'fix_accuracy', priority: 2 },
  
  // Medium - Targeted Improvements
  'short_explanation': { action: 'expand_explanation', priority: 3 },
  'low_completeness': { action: 'add_details', priority: 3 },
  'low_clarity': { action: 'improve_clarity', priority: 3 },
  'answer_mismatch': { action: 'align_answer', priority: 3 },
  'potential_duplicate': { action: 'differentiate', priority: 3 },
  'missing_voice_keywords': { action: 'add_voice_keywords', priority: 3 },
  'low_channel_relevance': { action: 'add_channel_terms', priority: 3 },
  'option_length_bias': { action: 'rebalance_options', priority: 3 },
  
  // Low - Minor Fixes
  'missing_question_mark': { action: 'fix_formatting', priority: 4 },
  'vague_question': { action: 'clarify_question', priority: 4 },
  'difficulty_mismatch': { action: 'adjust_difficulty', priority: 4 },
  'missing_code_example': { action: 'add_code', priority: 4 },
  'insufficient_voice_keywords': { action: 'add_voice_keywords', priority: 4 },
  'weak_voice_keywords': { action: 'improve_voice_keywords', priority: 4 },
  'repetitive_content': { action: 'diversify_content', priority: 4 },
  
  // Info - Enrichment
  'missing_tags': { action: 'add_tags', priority: 5 },
  'insufficient_tags': { action: 'add_tags', priority: 5 },
  'verbose_for_voice': { action: 'condense_answer', priority: 5 }
};

// ============================================
// LANGGRAPH NODE DEFINITIONS
// ============================================

/**
 * Node 1: Get Work Item
 */
async function getWorkNode(state) {
  console.log('\n📥 [Get Work] Fetching next work item...');
  
  const workItem = await getNextWorkItem(BOT_NAME);
  
  if (!workItem) {
    console.log('   No pending work items');
    return { ...state, done: true };
  }
  
  console.log(`   Found: ${workItem.action} ${workItem.itemType} ${workItem.itemId} (priority ${workItem.priority})`);
  
  const item = await fetchItem(workItem.itemType, workItem.itemId);
  
  if (!item) {
    await failWorkItem(workItem.id, 'Item not found');
    return { ...state, workItem: null };
  }
  
  return { ...state, workItem, item };
}

/**
 * Node 2: Parse Issues & Extract Context
 */
async function parseIssuesNode(state) {
  const { workItem, item } = state;
  if (!workItem || !item) return state;
  
  console.log('\n🔍 [Parse] Analyzing work item reason...');
  
  const reason = workItem.reason || '';
  const parsed = {
    issues: [],
    aiFeedback: '',
    improvements: [],
    score: null
  };
  
  // Extract issues (format: "Issues: issue1, issue2, issue3")
  const issuesMatch = reason.match(/Issues:\s*([^|]+)/);
  if (issuesMatch) {
    parsed.issues = issuesMatch[1].split(',').map(i => i.trim()).filter(Boolean);
  }
  
  // Extract AI feedback (format: "AI: feedback text")
  const aiMatch = reason.match(/AI:\s*([^|]+)/);
  if (aiMatch) {
    parsed.aiFeedback = aiMatch[1].trim();
  }
  
  // Extract improvements (format: "Fix: improvement1; improvement2")
  const fixMatch = reason.match(/Fix:\s*([^|]+)/);
  if (fixMatch) {
    parsed.improvements = fixMatch[1].split(';').map(i => i.trim()).filter(Boolean);
  }
  
  // Extract score (format: "Score: 65/100")
  const scoreMatch = reason.match(/Score:\s*(\d+)/);
  if (scoreMatch) {
    parsed.score = parseInt(scoreMatch[1]);
  }
  
  console.log(`   Issues: ${parsed.issues.length > 0 ? parsed.issues.join(', ') : 'none parsed'}`);
  console.log(`   Score: ${parsed.score || 'unknown'}/100`);
  
  return { ...state, parsed };
}

/**
 * Node 3: Plan Actions
 */
async function planActionsNode(state) {
  const { workItem, item, parsed } = state;
  if (!workItem || !item) return state;
  
  console.log('\n📋 [Plan] Determining actions...');
  
  const actions = new Set();
  
  // If delete action, just delete
  if (workItem.action === 'delete') {
    actions.add('delete');
    return { ...state, plannedActions: ['delete'] };
  }
  
  // Map issues to actions
  for (const issue of parsed.issues) {
    const mapping = ISSUE_ACTIONS[issue];
    if (mapping) {
      actions.add(mapping.action);
    }
  }
  
  // If no specific actions mapped, use general improvement based on score
  if (actions.size === 0) {
    if (parsed.score && parsed.score < 50) {
      actions.add('rewrite');
    } else if (parsed.score && parsed.score < 70) {
      actions.add('improve_content');
    } else {
      actions.add('polish');
    }
  }
  
  // Add enrichment if score is decent but could be better
  if (parsed.score && parsed.score >= 60 && parsed.score < 85) {
    if (!item.diagram) actions.add('add_diagram');
    if (!item.voiceKeywords || item.voiceKeywords.length < 5) actions.add('add_voice_keywords');
  }
  
  const plannedActions = Array.from(actions);
  console.log(`   Planned: ${plannedActions.join(', ')}`);
  
  return { ...state, plannedActions };
}

/**
 * Node 4: Execute Actions
 */
async function executeNode(state) {
  const { workItem, item, parsed, plannedActions } = state;
  if (!workItem || !item || !plannedActions) return state;
  
  console.log('\n⚡ [Execute] Processing actions...');
  
  const beforeState = { ...item };
  let updatedItem = { ...item };
  let deleted = false;
  const actionsPerformed = [];
  
  // Build context for AI prompts
  const context = {
    aiFeedback: parsed.aiFeedback,
    improvements: parsed.improvements,
    issues: parsed.issues
  };
  
  for (const action of plannedActions) {
    console.log(`   → ${action}`);
    
    try {
      switch (action) {
        case 'delete':
          await deleteItem(workItem.itemType, workItem.itemId);
          deleted = true;
          actionsPerformed.push('deleted');
          break;
          
        case 'rewrite':
          updatedItem = await rewriteContent(updatedItem, context);
          actionsPerformed.push('rewritten');
          break;
          
        case 'complete_content':
          updatedItem = await completeContent(updatedItem, context);
          actionsPerformed.push('completed');
          break;
          
        case 'expand_answer':
          updatedItem = await expandAnswer(updatedItem, context);
          actionsPerformed.push('answer_expanded');
          break;
          
        case 'expand_explanation':
          updatedItem = await expandExplanation(updatedItem, context);
          actionsPerformed.push('explanation_expanded');
          break;
          
        case 'improve_content':
        case 'add_details':
          updatedItem = await improveContent(updatedItem, context);
          actionsPerformed.push('improved');
          break;
          
        case 'improve_clarity':
          updatedItem = await improveClarity(updatedItem, context);
          actionsPerformed.push('clarity_improved');
          break;
          
        case 'fix_accuracy':
          updatedItem = await fixAccuracy(updatedItem, context);
          actionsPerformed.push('accuracy_fixed');
          break;
          
        case 'align_answer':
          updatedItem = await alignAnswer(updatedItem, context);
          actionsPerformed.push('answer_aligned');
          break;
          
        case 'clarify_question':
          updatedItem = await clarifyQuestion(updatedItem, context);
          actionsPerformed.push('question_clarified');
          break;
          
        case 'fix_formatting':
          updatedItem = fixFormatting(updatedItem);
          actionsPerformed.push('formatted');
          break;
          
        case 'add_code':
          updatedItem = await addCodeExample(updatedItem, context);
          actionsPerformed.push('code_added');
          break;
          
        case 'add_channel_terms':
          updatedItem = await addChannelTerms(updatedItem, context);
          actionsPerformed.push('terms_added');
          break;
          
        case 'add_voice_keywords':
        case 'improve_voice_keywords':
          updatedItem = await addVoiceKeywords(updatedItem, context);
          actionsPerformed.push('voice_keywords_added');
          break;
          
        case 'condense_answer':
          updatedItem = await condenseAnswer(updatedItem, context);
          actionsPerformed.push('answer_condensed');
          break;
          
        case 'add_tags':
          updatedItem = await addTags(updatedItem, context);
          actionsPerformed.push('tags_added');
          break;
          
        case 'add_diagram':
          updatedItem = await addDiagram(updatedItem, context);
          actionsPerformed.push('diagram_added');
          break;
          
        case 'deduplicate':
        case 'differentiate':
          updatedItem = await differentiateContent(updatedItem, context);
          actionsPerformed.push('differentiated');
          break;
          
        case 'diversify_content':
          updatedItem = await diversifyContent(updatedItem, context);
          actionsPerformed.push('diversified');
          break;
          
        case 'polish':
          updatedItem = await polishContent(updatedItem, context);
          actionsPerformed.push('polished');
          break;
          
        case 'rebalance_options':
          updatedItem = await rebalanceOptions(updatedItem, context);
          actionsPerformed.push('options_rebalanced');
          break;
          
        default:
          console.log(`      ⚠️ Unknown action: ${action}`);
      }
    } catch (error) {
      console.error(`      ❌ Action failed: ${error.message}`);
    }
  }
  
  return { ...state, beforeState, updatedItem, deleted, actionsPerformed };
}

/**
 * Node 5: Validate Changes
 */
async function validateNode(state) {
  const { updatedItem, deleted, beforeState } = state;
  if (deleted) return { ...state, validated: true };
  if (!updatedItem) return { ...state, validated: false };
  
  console.log('\n✓ [Validate] Checking changes...');
  
  const issues = [];
  
  // Check required fields
  if (!updatedItem.question || updatedItem.question.length < 20) {
    issues.push('Question too short or missing');
  }
  if (!updatedItem.answer || updatedItem.answer.length < 30) {
    issues.push('Answer too short or missing');
  }
  if (!updatedItem.explanation || updatedItem.explanation.length < 100) {
    issues.push('Explanation too short or missing');
  }
  
  // Check for improvement
  const beforeLength = (beforeState.answer?.length || 0) + (beforeState.explanation?.length || 0);
  const afterLength = (updatedItem.answer?.length || 0) + (updatedItem.explanation?.length || 0);
  
  if (afterLength < beforeLength * 0.8) {
    issues.push('Content significantly shortened');
  }
  
  if (issues.length > 0) {
    console.log(`   ⚠️ Validation issues: ${issues.join(', ')}`);
  } else {
    console.log('   ✅ Changes validated');
  }
  
  return { ...state, validated: issues.length === 0, validationIssues: issues };
}

/**
 * Node 6: Log to Ledger
 */
async function logNode(state) {
  const { workItem, beforeState, updatedItem, deleted, actionsPerformed } = state;
  if (!workItem) return state;
  
  console.log('\n📝 [Log] Recording to ledger...');
  
  await logAction({
    botName: BOT_NAME,
    action: deleted ? 'delete' : 'update',
    itemType: workItem.itemType,
    itemId: workItem.itemId,
    beforeState: {
      questionLength: beforeState.question?.length,
      answerLength: beforeState.answer?.length,
      explanationLength: beforeState.explanation?.length
    },
    afterState: deleted ? null : {
      questionLength: updatedItem.question?.length,
      answerLength: updatedItem.answer?.length,
      explanationLength: updatedItem.explanation?.length,
      actionsPerformed
    },
    reason: `Processed: ${actionsPerformed.join(', ')}`
  });
  
  return state;
}

/**
 * Node 7: Update Status
 */
async function updateStatusNode(state) {
  const { workItem, updatedItem, deleted, validated, actionsPerformed } = state;
  if (!workItem) return state;
  
  console.log('\n💾 [Save] Updating database...');
  
  if (!deleted && updatedItem && validated) {
    await saveItem(workItem.itemType, updatedItem);
    console.log('   ✅ Changes saved');
  } else if (!deleted && !validated) {
    console.log('   ⚠️ Changes not saved due to validation issues');
  }
  
  await completeWorkItem(workItem.id, {
    action: deleted ? 'deleted' : validated ? 'updated' : 'skipped',
    actionsPerformed,
    success: deleted || validated
  });
  
  return { ...state, success: deleted || validated };
}

// ============================================
// ACTION IMPLEMENTATIONS
// ============================================

async function rewriteContent(item, context) {
  const prompt = `Completely rewrite this interview question to be high-quality and interview-ready.

CURRENT CONTENT:
Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 600)}"
Channel: ${item.channel}
Difficulty: ${item.difficulty}

ISSUES TO FIX: ${context.issues.join(', ')}
AI FEEDBACK: ${context.aiFeedback}
IMPROVEMENTS NEEDED: ${context.improvements.join('; ')}

Requirements:
- Question should be clear, specific, and end with ?
- Answer should be 2-3 concise sentences
- Explanation should be 300-500 words with examples
- Match the ${item.difficulty} difficulty level
- Be relevant to ${item.channel} interviews

Return ONLY JSON:
{
  "question": "rewritten question?",
  "answer": "concise 2-3 sentence answer",
  "explanation": "detailed explanation with examples"
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

async function completeContent(item, context) {
  const prompt = `The following content appears truncated. Complete it properly.

Question: "${item.question}"
Current Answer: "${item.answer}"
Current Explanation: "${item.explanation}"
Channel: ${item.channel}

The content seems cut off. Please:
1. Complete the answer if it ends abruptly
2. Complete the explanation with proper conclusion
3. Ensure all concepts are fully explained

Return ONLY JSON:
{
  "answer": "complete answer (keep existing good parts, complete what's missing)",
  "explanation": "complete explanation (keep existing good parts, add missing conclusion/details)"
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

async function expandAnswer(item, context) {
  const prompt = `Expand this interview answer to be more comprehensive.

Question: "${item.question}"
Current Answer: "${item.answer}"
Channel: ${item.channel}

The answer is too brief. Expand it to 2-3 sentences that:
- Directly answer the question
- Include key technical terms
- Are suitable for verbal delivery

Return ONLY JSON:
{
  "answer": "expanded 2-3 sentence answer"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.answer) {
    item.answer = result.answer;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function expandExplanation(item, context) {
  const prompt = `Expand this explanation to be more detailed and educational.

Question: "${item.question}"
Answer: "${item.answer}"
Current Explanation: "${item.explanation}"
Channel: ${item.channel}

Expand to 300-500 words including:
- Detailed technical explanation
- Real-world examples or use cases
- Common pitfalls or best practices
- Code snippet if applicable

Return ONLY JSON:
{
  "explanation": "expanded detailed explanation"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.explanation) {
    item.explanation = result.explanation;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function improveContent(item, context) {
  const prompt = `Improve this interview content based on feedback.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 800)}"
Channel: ${item.channel}

FEEDBACK: ${context.aiFeedback}
IMPROVEMENTS: ${context.improvements.join('; ')}

Enhance the content while keeping the core topic. Focus on:
- Technical accuracy
- Clarity and readability
- Practical relevance

Return ONLY JSON:
{
  "answer": "improved answer",
  "explanation": "improved explanation"
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

async function improveClarity(item, context) {
  const prompt = `Rewrite this content to be clearer and easier to understand.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 600)}"

Issues: The content lacks clarity.

Rewrite to be:
- Simple and direct language
- Well-structured with clear flow
- Easy to understand for the target difficulty level

Return ONLY JSON:
{
  "answer": "clearer answer",
  "explanation": "clearer explanation with better structure"
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

async function fixAccuracy(item, context) {
  const prompt = `Review and fix any technical inaccuracies in this content.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation}"
Channel: ${item.channel}

FEEDBACK: ${context.aiFeedback}

Ensure:
- All technical facts are correct
- Best practices are current
- No outdated information

Return ONLY JSON:
{
  "answer": "technically accurate answer",
  "explanation": "technically accurate explanation"
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

async function alignAnswer(item, context) {
  const prompt = `The answer doesn't directly address the question. Fix this.

Question: "${item.question}"
Current Answer: "${item.answer}"

Rewrite the answer to:
- Directly address what's being asked
- Use terms from the question
- Be concise (2-3 sentences)

Return ONLY JSON:
{
  "answer": "answer that directly addresses the question"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.answer) {
    item.answer = result.answer;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function clarifyQuestion(item, context) {
  const prompt = `Make this interview question more specific and clear.

Current Question: "${item.question}"
Channel: ${item.channel}
Difficulty: ${item.difficulty}

The question is vague. Rewrite to be:
- Specific about what's being asked
- Clear context if needed
- Appropriate for ${item.difficulty} level

Return ONLY JSON:
{
  "question": "clearer, more specific question?"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.question) {
    item.question = result.question;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

function fixFormatting(item) {
  if (item.question && !item.question.trim().endsWith('?')) {
    item.question = item.question.trim() + '?';
  }
  if (item.answer) item.answer = item.answer.trim();
  if (item.explanation) item.explanation = item.explanation.trim();
  item.lastUpdated = new Date().toISOString();
  return item;
}

async function addCodeExample(item, context) {
  const prompt = `Add a relevant code example to this explanation.

Question: "${item.question}"
Current Explanation: "${item.explanation}"
Channel: ${item.channel}

Add a practical code example that illustrates the concept. Use appropriate language for ${item.channel}.

Return ONLY JSON:
{
  "explanation": "explanation with code example added (use markdown code blocks)"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.explanation) {
    item.explanation = result.explanation;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function addChannelTerms(item, context) {
  const prompt = `Enhance this content with more ${item.channel}-specific terminology.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 500)}"
Channel: ${item.channel}

Add relevant technical terms specific to ${item.channel} while keeping content accurate.

Return ONLY JSON:
{
  "answer": "answer with channel-specific terms",
  "explanation": "explanation with channel-specific terms"
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

async function addVoiceKeywords(item, context) {
  const prompt = `Extract voice interview keywords for this question.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 1000)}"
Channel: ${item.channel}

Extract 8-12 critical keywords/phrases that:
- Are at least 2 words each (e.g., "load balancer" not just "load")
- Represent key concepts a good answer must mention
- Include technical terms and their alternatives
- Are suitable for voice matching

Return ONLY JSON:
{
  "suitable": true,
  "keywords": ["two word phrase", "another phrase", "technical term"]
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result) {
    item.voiceSuitable = result.suitable === true;
    if (result.suitable && Array.isArray(result.keywords)) {
      item.voiceKeywords = result.keywords
        .map(k => String(k).toLowerCase().trim())
        .filter(k => k.length > 2)
        .slice(0, 12);
    }
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function condenseAnswer(item, context) {
  const prompt = `Condense this answer for voice interview practice.

Current Answer: "${item.answer}"

Rewrite to be:
- 1-2 sentences maximum
- Contains key technical terms
- Easy to say aloud

Return ONLY JSON:
{
  "answer": "condensed 1-2 sentence answer"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.answer) {
    item.answer = result.answer;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function addTags(item, context) {
  const prompt = `Generate relevant tags for this interview question.

Question: "${item.question}"
Channel: ${item.channel}
Sub-channel: ${item.subChannel}

Generate 5-8 relevant tags for discoverability.

Return ONLY JSON:
{
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.tags && Array.isArray(result.tags)) {
    item.tags = result.tags.map(t => t.toLowerCase().trim()).slice(0, 8);
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function addDiagram(item, context) {
  const prompt = `Create a Mermaid diagram for this concept.

Question: "${item.question}"
Channel: ${item.channel}

Create a simple, clear diagram. Return ONLY the Mermaid code:

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
    
    if (diagram.startsWith('graph') || diagram.startsWith('flowchart') || diagram.startsWith('sequenceDiagram')) {
      item.diagram = diagram;
      item.lastUpdated = new Date().toISOString();
    }
  }
  
  return item;
}

async function differentiateContent(item, context) {
  const prompt = `This question may be similar to others. Make it more unique.

Question: "${item.question}"
Answer: "${item.answer}"
Channel: ${item.channel}

Rewrite to have a unique angle or focus while covering the same topic.

Return ONLY JSON:
{
  "question": "differentiated question?",
  "answer": "unique perspective answer"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result) {
    if (result.question) item.question = result.question;
    if (result.answer) item.answer = result.answer;
    item.lastUpdated = new Date().toISOString();
  }
  
  return item;
}

async function diversifyContent(item, context) {
  const prompt = `The answer and explanation are too similar. Diversify them.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 500)}"

Rewrite so:
- Answer is a concise direct response
- Explanation adds NEW information, examples, and depth

Return ONLY JSON:
{
  "answer": "concise direct answer",
  "explanation": "explanation with additional details not in answer"
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

async function polishContent(item, context) {
  const prompt = `Polish this interview content for final quality.

Question: "${item.question}"
Answer: "${item.answer}"
Explanation: "${item.explanation?.substring(0, 600)}"

Minor improvements:
- Fix any grammar/spelling
- Improve flow and readability
- Ensure professional tone

Return ONLY JSON:
{
  "answer": "polished answer",
  "explanation": "polished explanation"
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

/**
 * Rebalance MCQ options to eliminate "longest answer is correct" bias
 * This is critical for fair test questions - users shouldn't be able to guess
 * the correct answer just by picking the longest/most detailed option.
 */
async function rebalanceOptions(item, context) {
  // This function handles test questions with options
  if (!item.options || !Array.isArray(item.options)) {
    console.log('      ⚠️ No options found for rebalancing');
    return item;
  }
  
  const correctOptions = item.options.filter(o => o.isCorrect);
  const incorrectOptions = item.options.filter(o => !o.isCorrect);
  
  if (correctOptions.length === 0 || incorrectOptions.length === 0) {
    return item;
  }
  
  // Calculate current lengths
  const correctLength = correctOptions.reduce((sum, o) => sum + (o.text?.length || 0), 0) / correctOptions.length;
  const incorrectAvgLength = incorrectOptions.reduce((sum, o) => sum + (o.text?.length || 0), 0) / incorrectOptions.length;
  
  const prompt = `You are fixing a multiple-choice question that has "option length bias" - the correct answer is noticeably longer than incorrect options, making it easy to guess.

QUESTION: "${item.question}"

CURRENT OPTIONS:
${item.options.map(o => `- ${o.id}: "${o.text}" ${o.isCorrect ? '(CORRECT)' : '(incorrect)'} [${o.text?.length || 0} chars]`).join('\n')}

PROBLEM: Correct answer is ${Math.round(correctLength)} chars, incorrect average is ${Math.round(incorrectAvgLength)} chars.

FIX THIS by either:
1. Making incorrect options more detailed/specific (preferred)
2. Making the correct answer more concise
3. Both approaches combined

IMPORTANT RULES:
- All options must remain factually accurate
- Incorrect options should be plausible but clearly wrong
- Options should be similar in length (within 20% of each other)
- Keep the same correct answer(s)
- NEVER use "All of the above", "None of the above", or "Both A and B" style options

Return ONLY JSON:
{
  "options": [
    { "id": "a", "text": "rewritten option text", "isCorrect": false },
    { "id": "b", "text": "rewritten option text", "isCorrect": true },
    { "id": "c", "text": "rewritten option text", "isCorrect": false },
    { "id": "d", "text": "rewritten option text", "isCorrect": false }
  ],
  "explanation": "Brief note on what was changed"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (result?.options && Array.isArray(result.options)) {
    // Validate the result
    const newCorrect = result.options.filter(o => o.isCorrect);
    const originalCorrectIds = correctOptions.map(o => o.id);
    const newCorrectIds = newCorrect.map(o => o.id);
    
    // Ensure correct answers haven't changed
    const sameCorrectAnswers = originalCorrectIds.length === newCorrectIds.length &&
      originalCorrectIds.every(id => newCorrectIds.includes(id));
    
    if (sameCorrectAnswers && result.options.length === item.options.length) {
      item.options = result.options;
      item.lastUpdated = new Date().toISOString();
      console.log(`      ✅ Options rebalanced: ${result.explanation || 'lengths normalized'}`);
    } else {
      console.log('      ⚠️ Rebalancing changed correct answers - skipping');
    }
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
    await db.execute({
      sql: `UPDATE questions SET status = 'deleted', last_updated = ? WHERE id = ?`,
      args: [new Date().toISOString(), id]
    });
    await db.execute({
      sql: 'DELETE FROM channel_mappings WHERE question_id = ?',
      args: [id]
    });
  }
}

// ============================================
// PIPELINE EXECUTOR
// ============================================

async function runPipeline(options = {}) {
  const { maxItems = 50 } = options;
  
  const results = {
    processed: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    failed: 0,
    actionCounts: {}
  };
  
  for (let i = 0; i < maxItems; i++) {
    let state = {};
    
    state = await getWorkNode(state);
    if (state.done) break;
    if (!state.workItem) continue;
    
    try {
      state = await parseIssuesNode(state);
      state = await planActionsNode(state);
      state = await executeNode(state);
      state = await validateNode(state);
      state = await logNode(state);
      state = await updateStatusNode(state);
      
      results.processed++;
      
      if (state.deleted) {
        results.deleted++;
      } else if (state.success) {
        results.updated++;
      } else {
        results.skipped++;
      }
      
      // Track action counts
      for (const action of state.actionsPerformed || []) {
        results.actionCounts[action] = (results.actionCounts[action] || 0) + 1;
      }
      
    } catch (error) {
      console.error(`\n❌ Error processing ${state.workItem?.itemId}:`, error.message);
      if (state.workItem) {
        await failWorkItem(state.workItem.id, error.message);
      }
      results.failed++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 1200));
  }
  
  return results;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== ⚙️ Processor Bot - Content Improvement Engine ===\n');
  
  await initBotTables();
  
  // Show queue stats
  const queueStats = await getQueueStats();
  console.log('📊 Queue Status:');
  console.log(`   Pending: ${queueStats.pending}`);
  console.log(`   Processing: ${queueStats.processing}`);
  console.log(`   Completed: ${queueStats.completed}`);
  console.log(`   Failed: ${queueStats.failed}`);
  
  if (queueStats.pending === 0) {
    console.log('\n✅ No pending work items. Exiting.');
    return;
  }
  
  const run = await startRun(BOT_NAME);
  const stats = { processed: 0, created: 0, updated: 0, deleted: 0 };
  
  try {
    const maxItems = parseInt(process.env.MAX_ITEMS || '50');
    
    console.log(`\n🚀 Processing up to ${maxItems} items...\n`);
    
    const result = await runPipeline({ maxItems });
    
    stats.processed = result.processed;
    stats.updated = result.updated;
    stats.deleted = result.deleted;
    
    await updateRunStats(run.id, stats);
    await completeRun(run.id, stats, {
      message: 'Processor Bot completed',
      ...result
    });
    
    // Summary report
    console.log('\n' + '='.repeat(50));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(50));
    console.log(`   Total Processed: ${result.processed}`);
    console.log(`   ✅ Updated: ${result.updated}`);
    console.log(`   🗑️ Deleted: ${result.deleted}`);
    console.log(`   ⏭️ Skipped: ${result.skipped}`);
    console.log(`   ❌ Failed: ${result.failed}`);
    
    if (Object.keys(result.actionCounts).length > 0) {
      console.log('\n📋 Actions Performed:');
      for (const [action, count] of Object.entries(result.actionCounts)) {
        console.log(`   • ${action}: ${count}`);
      }
    }
    console.log('='.repeat(50));
    
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

export { runPipeline, ISSUE_ACTIONS };
export default { runPipeline, ISSUE_ACTIONS };
