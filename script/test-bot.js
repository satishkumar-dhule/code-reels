#!/usr/bin/env node
/**
 * Test Bot - Generates quiz tests for each channel
 * Saves tests to Turso database (not local files)
 * Tests are fetched during build by fetch-questions-for-build.js
 */

import 'dotenv/config';
import { createClient } from '@libsql/client';
import { execSync } from 'child_process';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const CHANNEL_ID = process.env.CHANNEL_ID || null;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');

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
};

// Initialize tests table
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
      version INTEGER DEFAULT 1
    )
  `);
  console.log('✓ Tests table ready');
}

async function getChannelQuestions(channelId, limit = 25) {
  const result = await db.execute({
    sql: `SELECT id, question, answer, difficulty 
          FROM questions 
          WHERE channel = ? 
          ORDER BY RANDOM()
          LIMIT ?`,
    args: [channelId, limit]
  });
  return result.rows;
}

async function testExists(channelId) {
  const result = await db.execute({
    sql: 'SELECT id FROM tests WHERE channel_id = ?',
    args: [channelId]
  });
  return result.rows.length > 0;
}

// Generate MCQs using opencode run
function generateBatchMCQs(questions) {
  const summaries = questions.map((q, i) => 
    `${i + 1}. Q: ${q.question.substring(0, 100)} A: ${q.answer.substring(0, 150)}`
  ).join('\n');

  const prompt = `Create ${questions.length} MCQs from these Q&As:\n${summaries}\n\nReturn JSON array: [{"q":"question","o":["a","b","c","d"],"c":[0]}] where c=correct indices. ONLY JSON.`;
  
  const base64Prompt = Buffer.from(prompt).toString('base64');
  
  try {
    const result = execSync(
      `echo "${base64Prompt}" | base64 -d | opencode run`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );

    // Extract JSON array - handle markdown code blocks
    let jsonStr = result;
    const codeBlockMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log('    ⚠️ No JSON found');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return parsed.map((item, i) => {
      const q = questions[i];
      if (!q || !item.q || !item.o || item.o.length < 4) return null;

      const correctIndices = Array.isArray(item.c) ? item.c : [0];
      const options = item.o.slice(0, 4).map((text, idx) => ({
        id: `opt-${idx}`,
        text: String(text),
        isCorrect: correctIndices.includes(idx)
      }));

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

  } catch (error) {
    console.log(`    ⚠️ Error: ${error.message.substring(0, 60)}`);
    return [];
  }
}

async function saveTestToDb(test) {
  await db.execute({
    sql: `INSERT OR REPLACE INTO tests (id, channel_id, channel_name, title, description, questions, passing_score, created_at, version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      test.id,
      test.channelId,
      test.channelName,
      test.title,
      test.description,
      JSON.stringify(test.questions),
      test.passingScore,
      test.createdAt,
      test.version
    ]
  });
}

async function generateTestForChannel(channelId) {
  console.log(`\n📝 ${channelId}`);
  
  const questions = await getChannelQuestions(channelId, 25);
  console.log(`   ${questions.length} questions`);
  
  if (questions.length < 10) {
    console.log(`   ⚠️ Not enough`);
    return null;
  }

  const testQuestions = [];
  
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    const batch = questions.slice(i, i + BATCH_SIZE);
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
    
    const mcqs = generateBatchMCQs(batch);
    testQuestions.push(...mcqs);
    console.log(`   ✓ ${mcqs.length} MCQs`);
    
    if (i + BATCH_SIZE < questions.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (testQuestions.length < 10) {
    console.log(`   ⚠️ Only ${testQuestions.length}`);
    return null;
  }

  const test = {
    id: `test-${channelId}`,
    channelId,
    channelName: CHANNEL_NAMES[channelId] || channelId,
    title: `${CHANNEL_NAMES[channelId] || channelId} Knowledge Test`,
    description: `Test your ${CHANNEL_NAMES[channelId] || channelId} knowledge.`,
    questions: testQuestions,
    passingScore: 70,
    createdAt: new Date().toISOString(),
    version: 1
  };

  // Save to database
  await saveTestToDb(test);
  console.log(`   ✓ Saved to DB`);
  
  return test;
}

async function main() {
  console.log('🧪 Test Bot\n');

  await initTable();

  let channelIds = CHANNEL_ID ? [CHANNEL_ID] : 
    (await db.execute('SELECT DISTINCT channel FROM questions ORDER BY channel')).rows.map(r => r.channel);

  console.log(`${channelIds.length} channels`);

  let generated = 0;
  
  for (const channelId of channelIds) {
    // Skip if test exists (unless specific channel requested)
    if (!CHANNEL_ID && await testExists(channelId)) {
      console.log(`⏭️ ${channelId} exists`);
      continue;
    }

    const test = await generateTestForChannel(channelId);
    if (test) generated++;

    // Limit per run (unless specific channel)
    if (!CHANNEL_ID && generated >= 1) {
      console.log(`\n⏸️ Done ${generated}`);
      break;
    }
  }

  // Show summary
  const allTests = await db.execute('SELECT channel_name, questions FROM tests');
  console.log(`\n✅ ${allTests.rows.length} tests in DB`);
  allTests.rows.forEach(t => {
    const qs = JSON.parse(t.questions);
    console.log(`   - ${t.channel_name}: ${qs.length} MCQs`);
  });
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
