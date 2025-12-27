#!/usr/bin/env node
/**
 * Voice Keywords Bot
 * Extracts mandatory keywords from question answers using OpenCode CLI
 * These keywords are used for voice interview evaluation
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { runWithRetries, parseJson } from './utils.js';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5');
const MAX_QUESTIONS = parseInt(process.env.MAX_QUESTIONS || '50');
const CHANNEL_FILTER = process.env.CHANNEL_ID || null;

// Initialize voice_keywords column if not exists
async function initColumn() {
  try {
    await db.execute(`ALTER TABLE questions ADD COLUMN voice_keywords TEXT`);
    console.log('✓ Added voice_keywords column');
  } catch (e) {
    // Column already exists
  }
}

// Get questions without voice keywords
async function getQuestionsWithoutKeywords(limit) {
  let sql = `
    SELECT id, question, answer, channel, difficulty
    FROM questions 
    WHERE voice_keywords IS NULL 
      AND channel IN ('behavioral', 'system-design', 'sre', 'devops')
      AND LENGTH(answer) > 100
  `;
  
  if (CHANNEL_FILTER) {
    sql += ` AND channel = '${CHANNEL_FILTER}'`;
  }
  
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  
  const result = await db.execute({
    sql,
    args: [limit]
  });
  return result.rows;
}

// Build prompt for keyword extraction
function buildPrompt(questions) {
  const questionsJson = questions.map((q, i) => ({
    idx: i,
    question: q.question.substring(0, 300),
    answer: q.answer.substring(0, 1500),
    channel: q.channel
  }));

  return `You are an expert technical interviewer. Extract the MANDATORY keywords that a candidate MUST mention to demonstrate understanding.

For each question, identify 5-10 essential keywords/phrases that are:
1. Technical terms specific to the topic (e.g., "load balancer", "circuit breaker", "kubernetes")
2. Key concepts that show understanding (e.g., "horizontal scaling", "eventual consistency")
3. Important tools/technologies mentioned (e.g., "prometheus", "terraform", "kafka")
4. Critical processes or patterns (e.g., "blue-green deployment", "STAR method")

DO NOT include:
- Generic words like "system", "application", "data"
- Common verbs like "implement", "use", "create"
- Filler words or phrases

Return ONLY a JSON array with this exact structure:
[
  {
    "idx": 0,
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
]

Questions to analyze:
${JSON.stringify(questionsJson, null, 2)}

Return ONLY the JSON array, no explanation.`;
}

// Extract keywords using OpenCode
async function extractKeywords(questions) {
  const prompt = buildPrompt(questions);
  
  console.log(`  🤖 Calling OpenCode for ${questions.length} questions...`);
  const response = await runWithRetries(prompt);
  
  if (!response) {
    console.log('  ⚠️ No response from OpenCode');
    return [];
  }
  
  const parsed = parseJson(response);
  if (!parsed || !Array.isArray(parsed)) {
    console.log('  ⚠️ Invalid JSON response');
    return [];
  }
  
  return parsed;
}

// Save keywords to database
async function saveKeywords(questionId, keywords) {
  await db.execute({
    sql: `UPDATE questions SET voice_keywords = ?, last_updated = ? WHERE id = ?`,
    args: [JSON.stringify(keywords), new Date().toISOString(), questionId]
  });
}

// Main processing loop
async function main() {
  console.log('=== 🎤 Voice Keywords Bot ===\n');
  
  await initColumn();
  
  const questions = await getQuestionsWithoutKeywords(MAX_QUESTIONS);
  console.log(`Found ${questions.length} questions without keywords\n`);
  
  if (questions.length === 0) {
    console.log('✓ All questions have keywords!');
    return;
  }
  
  let processed = 0;
  let failed = 0;
  
  // Process in batches
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}: Processing ${batch.length} questions...`);
    
    const results = await extractKeywords(batch);
    
    for (const result of results) {
      const question = batch[result.idx];
      if (!question) continue;
      
      if (result.keywords && Array.isArray(result.keywords) && result.keywords.length > 0) {
        // Clean and validate keywords
        const cleanKeywords = result.keywords
          .map(k => String(k).toLowerCase().trim())
          .filter(k => k.length > 2 && k.length < 50)
          .slice(0, 10);
        
        if (cleanKeywords.length >= 3) {
          await saveKeywords(question.id, cleanKeywords);
          console.log(`  ✓ ${question.id}: ${cleanKeywords.length} keywords`);
          processed++;
        } else {
          console.log(`  ⚠️ ${question.id}: Too few valid keywords`);
          failed++;
        }
      } else {
        console.log(`  ⚠️ ${question.id}: No keywords extracted`);
        failed++;
      }
    }
    
    // Rate limiting
    if (i + BATCH_SIZE < questions.length) {
      console.log('  ⏳ Waiting 2s before next batch...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`✓ Processed: ${processed}`);
  console.log(`⚠️ Failed: ${failed}`);
}

main().catch(console.error);
