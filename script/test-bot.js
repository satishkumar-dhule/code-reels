#!/usr/bin/env node
/**
 * Test Bot - Generates and expands quiz tests for each channel
 * 
 * Features:
 * - Creates new tests for channels without tests
 * - Adds new MCQs to existing tests from new questions
 * - Tracks which questions have been converted to avoid duplicates
 * - Supports large question pools (50+ questions per test)
 * - Random 15-20 questions selected per session in UI
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { runWithRetries, parseJson } from './utils.js';
import testTemplate from './ai/prompts/templates/test.js';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const CHANNEL_ID = process.env.CHANNEL_ID || null;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10');
const MIN_QUESTIONS_FOR_TEST = 10;
const MAX_NEW_MCQS_PER_RUN = parseInt(process.env.MAX_NEW_MCQS || '25');

const CHANNEL_NAMES = {
  'system-design': 'System Design',
  'algorithms': 'Algorithms',
  'frontend': 'Frontend',
  'backend': 'Backend',
  'database': 'Database',
  'devops': 'DevOps',
  'sre': 'SRE',
  'security': 'Security',
  'mobile': 'Mobile',
  'ai-ml': 'AI/ML',
  'cloud': 'Cloud',
  'networking': 'Networking',
  'behavioral': 'Behavioral',
  'aws': 'AWS',
  'kubernetes': 'Kubernetes',
  'terraform': 'Terraform',
  'testing': 'Testing',
  'machine-learning': 'Machine Learning',
  'generative-ai': 'Generative AI',
};

// Initialize tests table with question tracking
async function initTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      questions TEXT NOT NULL,
      passing_score INTEGER DEFAULT 70,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_updated TEXT,
      version INTEGER DEFAULT 1
    )
  `);
  
  // Add last_updated column if it doesn't exist (migration)
  try {
    await db.execute(`ALTER TABLE tests ADD COLUMN last_updated TEXT`);
    console.log('✓ Added last_updated column');
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Track which questions have been converted to MCQs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS test_question_map (
      question_id TEXT PRIMARY KEY,
      test_id TEXT NOT NULL,
      mcq_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('✓ Tables ready');
}

// Get existing test for channel
async function getExistingTest(channelId) {
  const result = await db.execute({
    sql: 'SELECT * FROM tests WHERE channel_id = ?',
    args: [channelId]
  });
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    channelId: row.channel_id,
    channelName: row.channel_name,
    title: row.title,
    description: row.description,
    questions: JSON.parse(row.questions),
    passingScore: row.passing_score,
    createdAt: row.created_at,
    lastUpdated: row.last_updated,
    version: row.version
  };
}

// Get questions that haven't been converted to MCQs yet
async function getUnconvertedQuestions(channelId, limit = 25) {
  const result = await db.execute({
    sql: `SELECT q.id, q.question, q.answer, q.difficulty 
          FROM questions q
          LEFT JOIN test_question_map m ON q.id = m.question_id
          WHERE q.channel = ? AND m.question_id IS NULL
          ORDER BY RANDOM()
          LIMIT ?`,
    args: [channelId, limit]
  });
  return result.rows;
}

// Get total question count for channel
async function getChannelQuestionCount(channelId) {
  const result = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM questions WHERE channel = ?',
    args: [channelId]
  });
  return result.rows[0]?.count || 0;
}

// Generate MCQs using centralized template
async function generateBatchMCQs(questions) {
  const prompt = testTemplate.build({ questions });

  const response = await runWithRetries(prompt);
  if (!response) {
    console.log('    ⚠️ No response from OpenCode');
    return [];
  }

  const parsed = parseJson(response);
  if (!parsed || !Array.isArray(parsed)) {
    console.log('    ⚠️ Invalid JSON response');
    return [];
  }

  return parsed.map((item, i) => {
    const q = questions[i];
    if (!q || !item.q || !item.o || item.o.length < 4) return null;

    const correctIndices = Array.isArray(item.c) ? item.c : [0];
    const options = item.o.slice(0, 4).map((text, idx) => ({
      id: `opt-${idx}`,
      text: String(text),
      isCorrect: correctIndices.includes(idx)
    }));

    // Ensure at least one correct answer
    if (!options.some(o => o.isCorrect)) options[0].isCorrect = true;

    return {
      id: `tq-${q.id}`,
      questionId: q.id,
      question: item.q,
      type: correctIndices.length > 1 ? 'multiple' : 'single',
      options,
      explanation: item.e || '',
      difficulty: q.difficulty || 'intermediate'
    };
  }).filter(Boolean);
}

// Save question mapping to track converted questions
async function saveQuestionMapping(testId, mcqs) {
  for (const mcq of mcqs) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO test_question_map (question_id, test_id, mcq_id, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [mcq.questionId, testId, mcq.id, new Date().toISOString()]
    });
  }
}

// Save test to database
async function saveTestToDb(test) {
  await db.execute({
    sql: `INSERT OR REPLACE INTO tests 
          (id, channel_id, channel_name, title, description, questions, passing_score, created_at, last_updated, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      test.id,
      test.channelId,
      test.channelName,
      test.title,
      test.description,
      JSON.stringify(test.questions),
      test.passingScore,
      test.createdAt,
      test.lastUpdated || new Date().toISOString(),
      test.version
    ]
  });
}

// Process channel - create new test or expand existing
async function processChannel(channelId) {
  console.log(`\n📝 ${channelId}`);
  
  const totalQuestions = await getChannelQuestionCount(channelId);
  const unconverted = await getUnconvertedQuestions(channelId, MAX_NEW_MCQS_PER_RUN);
  const existingTest = await getExistingTest(channelId);
  
  console.log(`   Total: ${totalQuestions} | Unconverted: ${unconverted.length} | Has test: ${!!existingTest}`);
  
  // Skip if no unconverted questions
  if (unconverted.length === 0) {
    console.log(`   ⏭️ No new questions to convert`);
    return { action: 'skip', reason: 'no-new-questions' };
  }
  
  // Skip if not enough questions for new test
  if (!existingTest && totalQuestions < MIN_QUESTIONS_FOR_TEST) {
    console.log(`   ⚠️ Not enough questions (need ${MIN_QUESTIONS_FOR_TEST})`);
    return { action: 'skip', reason: 'not-enough-questions' };
  }

  // Generate MCQs in batches
  const newMCQs = [];
  for (let i = 0; i < unconverted.length; i += BATCH_SIZE) {
    const batch = unconverted.slice(i, i + BATCH_SIZE);
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(unconverted.length / BATCH_SIZE)}...`);
    
    const mcqs = await generateBatchMCQs(batch);
    newMCQs.push(...mcqs);
    console.log(`   ✓ Generated ${mcqs.length} MCQs`);
    
    // Rate limiting between batches
    if (i + BATCH_SIZE < unconverted.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (newMCQs.length === 0) {
    console.log(`   ⚠️ Failed to generate MCQs`);
    return { action: 'failed', reason: 'generation-failed' };
  }

  const testId = `test-${channelId}`;
  const channelName = CHANNEL_NAMES[channelId] || channelId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (existingTest) {
    // Expand existing test
    const updatedQuestions = [...existingTest.questions, ...newMCQs];
    const updatedTest = {
      ...existingTest,
      questions: updatedQuestions,
      lastUpdated: new Date().toISOString(),
      version: existingTest.version + 1
    };
    
    await saveTestToDb(updatedTest);
    await saveQuestionMapping(testId, newMCQs);
    
    console.log(`   ✅ Expanded: ${existingTest.questions.length} → ${updatedQuestions.length} MCQs (v${updatedTest.version})`);
    return { action: 'expanded', added: newMCQs.length, total: updatedQuestions.length };
  } else {
    // Create new test
    const test = {
      id: testId,
      channelId,
      channelName,
      title: `${channelName} Knowledge Test`,
      description: `Test your ${channelName} knowledge with randomly selected questions.`,
      questions: newMCQs,
      passingScore: 70,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 1
    };

    await saveTestToDb(test);
    await saveQuestionMapping(testId, newMCQs);
    
    console.log(`   ✅ Created new test with ${newMCQs.length} MCQs`);
    return { action: 'created', total: newMCQs.length };
  }
}

async function main() {
  console.log('🧪 Test Bot - Generate & Expand Tests\n');

  await initTable();

  // Get channels to process
  let channelIds;
  if (CHANNEL_ID) {
    channelIds = [CHANNEL_ID];
  } else {
    const result = await db.execute('SELECT DISTINCT channel FROM questions ORDER BY channel');
    channelIds = result.rows.map(r => r.channel);
  }

  console.log(`📊 ${channelIds.length} channels to check\n`);

  const stats = { created: 0, expanded: 0, skipped: 0, failed: 0 };
  let processed = 0;
  const maxPerRun = CHANNEL_ID ? 1 : 3; // Process up to 3 channels per run (unless specific channel)

  for (const channelId of channelIds) {
    const result = await processChannel(channelId);
    
    if (result.action === 'created') {
      stats.created++;
      processed++;
    } else if (result.action === 'expanded') {
      stats.expanded++;
      processed++;
    } else if (result.action === 'failed') {
      stats.failed++;
    } else {
      stats.skipped++;
    }

    // Limit channels per run to avoid timeout
    if (!CHANNEL_ID && processed >= maxPerRun) {
      console.log(`\n⏸️ Processed ${processed} channels this run`);
      break;
    }
  }

  // Show summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  const allTests = await db.execute('SELECT channel_name, questions, version FROM tests ORDER BY channel_name');
  console.log(`\n✅ ${allTests.rows.length} tests in database:\n`);
  
  let totalMCQs = 0;
  for (const t of allTests.rows) {
    const qs = JSON.parse(t.questions);
    totalMCQs += qs.length;
    console.log(`   ${t.channel_name.padEnd(20)} ${String(qs.length).padStart(3)} MCQs (v${t.version})`);
  }
  
  console.log(`\n   ${'TOTAL'.padEnd(20)} ${String(totalMCQs).padStart(3)} MCQs`);
  console.log(`\nThis run: ${stats.created} created, ${stats.expanded} expanded, ${stats.skipped} skipped, ${stats.failed} failed`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
