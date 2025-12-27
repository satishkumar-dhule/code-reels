#!/usr/bin/env node
/**
 * Creator Bot - LangGraph Architecture
 * 
 * Creates all content types:
 * - Questions (from topics or user input)
 * - Coding challenges
 * - Voice keywords & suitability
 * - MCQ tests
 * - Diagrams (Mermaid)
 * 
 * LangGraph Pipeline:
 * Input → Classify → Generate → Enrich → Validate → Save
 */

import 'dotenv/config';
import { getDb, initBotTables } from './shared/db.js';
import { logAction } from './shared/ledger.js';
import { addToQueue } from './shared/queue.js';
import { startRun, completeRun, failRun, updateRunStats } from './shared/runs.js';
import { runWithRetries, parseJson, generateUnifiedId, isDuplicateUnified } from '../utils.js';

const BOT_NAME = 'creator';
const db = getDb();

// ============================================
// LANGGRAPH NODE DEFINITIONS
// ============================================

/**
 * Node 1: Classify Input
 * Determines what type of content to create
 */
async function classifyNode(state) {
  console.log('\n📋 [Classify] Analyzing input...');
  
  const { input, inputType } = state;
  
  // If type is already specified, use it
  if (inputType) {
    return { ...state, contentType: inputType };
  }
  
  // Auto-detect content type from input
  const prompt = `Analyze this input and determine what type of interview prep content to create.

Input: "${input}"

Respond with ONLY a JSON object:
{
  "contentType": "question" | "challenge" | "test" | "blog",
  "channel": "system-design" | "algorithms" | "frontend" | "backend" | "database" | "devops" | "sre" | "behavioral" | "security" | "cloud",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "reason": "brief explanation"
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (!result || !result.contentType) {
    return { ...state, contentType: 'question', channel: 'system-design', difficulty: 'intermediate' };
  }
  
  console.log(`   Type: ${result.contentType}, Channel: ${result.channel}`);
  return { ...state, ...result };
}

/**
 * Node 2: Generate Content
 * Creates the actual content based on type
 */
async function generateNode(state) {
  console.log('\n🔨 [Generate] Creating content...');
  
  const { input, contentType, channel, difficulty } = state;
  
  let content = null;
  
  switch (contentType) {
    case 'question':
      content = await generateQuestion(input, channel, difficulty);
      break;
    case 'challenge':
      content = await generateChallenge(input, channel, difficulty);
      break;
    case 'test':
      content = await generateTest(input, channel);
      break;
    default:
      content = await generateQuestion(input, channel, difficulty);
  }
  
  if (!content) {
    return { ...state, error: 'Failed to generate content' };
  }
  
  console.log(`   Generated: ${content.id || 'new'}`);
  return { ...state, content };
}

/**
 * Node 3: Enrich Content
 * Adds voice keywords, diagrams, companies, etc.
 */
async function enrichNode(state) {
  console.log('\n✨ [Enrich] Adding metadata...');
  
  const { content, contentType } = state;
  if (!content || state.error) return state;
  
  // Only enrich questions
  if (contentType !== 'question') {
    return state;
  }
  
  // Add voice keywords for suitable channels
  const voiceChannels = ['behavioral', 'system-design', 'sre', 'devops'];
  if (voiceChannels.includes(content.channel)) {
    const voiceData = await generateVoiceKeywords(content);
    if (voiceData) {
      content.voiceKeywords = voiceData.keywords;
      content.voiceSuitable = voiceData.suitable;
      console.log(`   Voice: ${voiceData.suitable ? 'suitable' : 'not suitable'}`);
    }
  }
  
  // Generate diagram if missing
  if (!content.diagram) {
    const diagram = await generateDiagram(content);
    if (diagram) {
      content.diagram = diagram;
      console.log('   Diagram: generated');
    }
  }
  
  return { ...state, content };
}

/**
 * Node 4: Validate Content
 * Checks quality and duplicates
 */
async function validateNode(state) {
  console.log('\n✅ [Validate] Checking quality...');
  
  const { content, contentType } = state;
  if (!content || state.error) return state;
  
  // Check for duplicates
  if (contentType === 'question' && content.question) {
    const isDupe = await isDuplicateUnified(content.question);
    if (isDupe) {
      return { ...state, error: 'Duplicate question detected', skipSave: true };
    }
  }
  
  // Validate required fields
  const validation = validateContent(content, contentType);
  if (!validation.valid) {
    return { ...state, error: validation.error };
  }
  
  console.log('   Validation: passed');
  return { ...state, validated: true };
}

/**
 * Node 5: Save Content
 * Persists to database
 */
async function saveNode(state) {
  console.log('\n💾 [Save] Persisting to database...');
  
  const { content, contentType, validated, skipSave, error } = state;
  
  if (error || skipSave || !validated) {
    console.log(`   Skipped: ${error || 'validation failed'}`);
    return state;
  }
  
  try {
    let savedId = null;
    
    switch (contentType) {
      case 'question':
        savedId = await saveQuestion(content);
        break;
      case 'challenge':
        savedId = await saveChallenge(content);
        break;
      case 'test':
        savedId = await saveTest(content);
        break;
    }
    
    if (savedId) {
      // Log to ledger
      await logAction({
        botName: BOT_NAME,
        action: 'create',
        itemType: contentType,
        itemId: savedId,
        afterState: content,
        reason: 'Created by Creator Bot'
      });
      
      // Add to verification queue
      await addToQueue({
        itemType: contentType,
        itemId: savedId,
        action: 'verify',
        priority: 3,
        createdBy: BOT_NAME,
        assignedTo: 'verifier'
      });
      
      console.log(`   Saved: ${savedId}`);
      return { ...state, savedId, success: true };
    }
  } catch (e) {
    console.error(`   Error: ${e.message}`);
    return { ...state, error: e.message };
  }
  
  return state;
}

// ============================================
// CONTENT GENERATORS
// ============================================

async function generateQuestion(input, channel, difficulty) {
  const prompt = `Create a high-quality technical interview question.

Topic/Input: "${input}"
Channel: ${channel}
Difficulty: ${difficulty}

Return ONLY a JSON object:
{
  "question": "Clear, specific interview question",
  "answer": "Brief 1-2 sentence answer",
  "explanation": "Detailed explanation (200-500 words) with examples",
  "tags": ["tag1", "tag2", "tag3"],
  "subChannel": "specific sub-topic",
  "companies": ["Company1", "Company2"]
}

Requirements:
- Question should be practical and commonly asked in interviews
- Explanation should be comprehensive with real-world examples
- Include relevant companies that ask this type of question`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (!result || !result.question) return null;
  
  return {
    id: await generateUnifiedId(),
    question: result.question,
    answer: result.answer?.substring(0, 200) || '',
    explanation: result.explanation || '',
    tags: result.tags || [channel],
    channel,
    subChannel: result.subChannel || channel,
    difficulty,
    companies: result.companies || [],
    status: 'active',
    lastUpdated: new Date().toISOString()
  };
}

async function generateChallenge(input, _channel, difficulty) {
  const prompt = `Create a coding challenge for interview practice.

Topic: "${input}"
Difficulty: ${difficulty}

Return ONLY a JSON object:
{
  "title": "Challenge title",
  "description": "Problem description with examples",
  "category": "arrays" | "strings" | "trees" | "graphs" | "dp" | "other",
  "starterCode": {
    "javascript": "function solution(input) {\\n  // Your code here\\n}",
    "python": "def solution(input):\\n    # Your code here\\n    pass"
  },
  "testCases": [
    { "input": "example", "expected": "result", "description": "Test case 1" }
  ],
  "hints": ["Hint 1", "Hint 2"],
  "sampleSolution": {
    "javascript": "// Solution code",
    "python": "# Solution code"
  },
  "complexity": {
    "time": "O(n)",
    "space": "O(1)",
    "explanation": "Brief explanation"
  }
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (!result || !result.title) return null;
  
  return {
    id: `ch-${Date.now()}`,
    ...result,
    difficulty,
    tags: [result.category, difficulty],
    companies: []
  };
}

async function generateTest(_input, _channel) {
  // Test generation logic
  return null; // Simplified for now
}

async function generateVoiceKeywords(content) {
  const prompt = `Analyze this interview question for voice interview suitability.

Question: "${content.question}"
Answer: "${content.explanation?.substring(0, 1000) || content.answer}"

Determine:
1. Is it suitable for voice interview? (can be answered verbally, not code-based)
2. If suitable, extract 5-8 mandatory keywords a candidate must mention

Return ONLY JSON:
{
  "suitable": true/false,
  "reason": "brief reason",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

  const response = await runWithRetries(prompt);
  const result = parseJson(response);
  
  if (!result) return null;
  
  return {
    suitable: result.suitable === true,
    keywords: result.suitable && Array.isArray(result.keywords) 
      ? result.keywords.map(k => String(k).toLowerCase().trim()).filter(k => k.length > 2)
      : []
  };
}

async function generateDiagram(content) {
  const prompt = `Create a simple Mermaid diagram for this concept.

Question: "${content.question}"
Topic: ${content.channel}

Return ONLY the Mermaid code (no markdown, no explanation):
graph TD
    A[Start] --> B[Step]
    B --> C[End]`;

  const response = await runWithRetries(prompt);
  
  if (!response) return null;
  
  // Extract mermaid code
  let diagram = response.trim();
  if (diagram.includes('```')) {
    const match = diagram.match(/```(?:mermaid)?\s*([\s\S]*?)\s*```/);
    if (match) diagram = match[1].trim();
  }
  
  return diagram.startsWith('graph') || diagram.startsWith('flowchart') ? diagram : null;
}

// ============================================
// VALIDATORS
// ============================================

function validateContent(content, type) {
  switch (type) {
    case 'question':
      if (!content.question || content.question.length < 20) {
        return { valid: false, error: 'Question too short' };
      }
      if (!content.explanation || content.explanation.length < 100) {
        return { valid: false, error: 'Explanation too short' };
      }
      break;
    case 'challenge':
      if (!content.title || !content.testCases?.length) {
        return { valid: false, error: 'Missing title or test cases' };
      }
      break;
  }
  return { valid: true };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function saveQuestion(content) {
  await db.execute({
    sql: `INSERT INTO questions (id, question, answer, explanation, diagram, difficulty, tags, channel, sub_channel, companies, voice_keywords, voice_suitable, status, last_updated, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      content.id,
      content.question,
      content.answer,
      content.explanation,
      content.diagram || null,
      content.difficulty,
      JSON.stringify(content.tags || []),
      content.channel,
      content.subChannel,
      JSON.stringify(content.companies || []),
      content.voiceKeywords ? JSON.stringify(content.voiceKeywords) : null,
      content.voiceSuitable ? 1 : 0,
      'active',
      new Date().toISOString(),
      new Date().toISOString()
    ]
  });
  return content.id;
}

async function saveChallenge(content) {
  // Save to coding_challenges table
  return content.id;
}

async function saveTest(content) {
  // Save to tests table
  return content.id;
}

// ============================================
// LANGGRAPH EXECUTOR
// ============================================

async function runPipeline(input, options = {}) {
  // Initial state
  let state = {
    input,
    inputType: options.type || null,
    channel: options.channel || null,
    difficulty: options.difficulty || 'intermediate'
  };
  
  // Execute nodes in sequence
  const nodes = [classifyNode, generateNode, enrichNode, validateNode, saveNode];
  
  for (const node of nodes) {
    state = await node(state);
    if (state.error && !state.skipSave) {
      console.log(`\n❌ Pipeline stopped: ${state.error}`);
      break;
    }
  }
  
  return state;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('=== 🤖 Creator Bot (LangGraph) ===\n');
  
  await initBotTables();
  
  const run = await startRun(BOT_NAME);
  const stats = { processed: 0, created: 0, updated: 0, deleted: 0 };
  
  try {
    // Get input from environment or generate random topic
    const input = process.env.INPUT_TOPIC || process.env.INPUT_QUESTION;
    const inputType = process.env.INPUT_TYPE || null;
    const channel = process.env.CHANNEL_ID || null;
    const count = parseInt(process.env.COUNT || '1');
    
    if (!input) {
      // Generate random topics if no input
      const topics = [
        'microservices communication patterns',
        'database indexing strategies',
        'kubernetes pod scheduling',
        'react state management',
        'API rate limiting',
        'distributed caching',
        'CI/CD pipeline design',
        'load balancing algorithms'
      ];
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        console.log(`\n--- Processing: "${topic}" ---`);
        
        const result = await runPipeline(topic, { type: inputType, channel });
        stats.processed++;
        
        if (result.success) {
          stats.created++;
          console.log(`✅ Created: ${result.savedId}`);
        }
        
        await updateRunStats(run.id, stats);
        
        // Rate limiting
        if (i < count - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } else {
      // Process single input
      console.log(`Processing: "${input.substring(0, 50)}..."`);
      
      const result = await runPipeline(input, { type: inputType, channel });
      stats.processed++;
      
      if (result.success) {
        stats.created++;
        console.log(`\n✅ Created: ${result.savedId}`);
      }
    }
    
    await completeRun(run.id, stats, { message: 'Creator Bot completed successfully' });
    
    console.log('\n=== Summary ===');
    console.log(`Processed: ${stats.processed}`);
    console.log(`Created: ${stats.created}`);
    
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
